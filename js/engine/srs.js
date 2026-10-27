// Spaced repetition: a Leitner scheduler over two kinds of item,
//   card:<id>          a flashcard
//   topic:<objective>  an outline objective, reviewed by answering a question on it.
// Outcomes: right (box + 1), guess (box + 0.5: half credit), wrong (back to box 0).
// Interval comes from the whole box number. Two guesses equal one confident right answer.
// Dates are Harare calendar days (yyyy-mm-dd), so a review never shifts at midnight UTC.
import { addDays } from '../outline.js';

export const INTERVALS = [1, 1, 3, 7, 14, 30, 60]; // days, indexed by box
export const MAX_BOX = INTERVALS.length - 1;
export const NEW_PER_DAY = 10;
export const EXAM_BUFFER_DAYS = 2;

export const cardKey = (id) => `card:${id}`;
export const topicKey = (objective) => `topic:${objective}`;

export function outcomeOf(correct, confidence) {
  if (!correct) return 'wrong';
  return confidence === 'guess' ? 'guess' : 'right';
}

export function schedule(item, outcome, today, examDate = null) {
  const prev = item || { box: 0, reviews: 0, lapses: 0 };
  let box = prev.box;
  if (outcome === 'wrong') box = 0;
  else box = Math.min(MAX_BOX, box + (outcome === 'guess' ? 0.5 : 1));
  let due = addDays(today, INTERVALS[Math.floor(box)]);
  // Keep every item coming back at least once before the exam.
  if (examDate) {
    const lastChance = addDays(examDate, -EXAM_BUFFER_DAYS);
    if (lastChance > today && due > lastChance) due = lastChance;
  }
  return { box, due, last: today, reviews: prev.reviews + 1, lapses: prev.lapses + (outcome === 'wrong' ? 1 : 0) };
}

export function dayCounter(state, today) {
  return state.srsDay?.date === today ? state.srsDay : { date: today, reviews: 0, newCards: 0 };
}

// counts: whether this review uses up the daily cap (deliberate reviews do; ordinary
// practice answers still reschedule the topic but never block you from practising).
export function review(state, key, outcome, today, { counts = true, isNew = false } = {}) {
  state.srs[key] = schedule(state.srs[key], outcome, today, state.settings.targetDate);
  if (counts) {
    const c = dayCounter(state, today);
    state.srsDay = { ...c, reviews: c.reviews + 1, newCards: c.newCards + (isNew ? 1 : 0) };
  }
  return state.srs[key];
}

export function dueKeys(srs, today, prefix = '') {
  return Object.entries(srs)
    .filter(([k, v]) => k.startsWith(prefix) && v.due <= today)
    .sort((a, b) => a[1].due.localeCompare(b[1].due) || a[1].box - b[1].box || a[0].localeCompare(b[0]))
    .map(([k]) => k);
}

// Objectives you have answered questions on in the last week: their cards count as "newly covered".
export function recentObjectives(answers, today, days = 7) {
  const from = addDays(today, -days);
  return new Set(answers.filter((a) => a.at.slice(0, 10) >= from).map((a) => a.objective));
}

export function unseenCards(state, cards, today) {
  const recent = recentObjectives(state.answers, today);
  return cards
    .filter((c) => !state.srs[cardKey(c.id)])
    .sort((a, b) => Number(recent.has(b.objective)) - Number(recent.has(a.objective)) || a.id.localeCompare(b.id));
}

// Today's review queue: due items oldest first, then a few new cards, all within the daily cap.
export function todayQueue(state, cards, today) {
  const cap = state.settings.dailyReviewCap;
  const c = dayCounter(state, today);
  let room = Math.max(0, cap - c.reviews);
  const cardIds = new Set(cards.map((x) => x.id));
  const due = dueKeys(state.srs, today).filter((k) => !k.startsWith('card:') || cardIds.has(k.slice(5)));
  const items = due.slice(0, room);
  room -= items.length;
  const newRoom = Math.max(0, Math.min(room, NEW_PER_DAY - c.newCards));
  const fresh = unseenCards(state, cards, today).slice(0, newRoom).map((x) => cardKey(x.id));
  return {
    cards: [...items.filter((k) => k.startsWith('card:')), ...fresh].map((k) => k.slice(5)),
    newCards: fresh.map((k) => k.slice(5)),
    topics: items.filter((k) => k.startsWith('topic:')).map((k) => k.slice(6)),
    dueTotal: due.length,
    held: Math.max(0, due.length - items.length),
    done: c.reviews,
    cap
  };
}

export const dueTodayCount = (q) => q.cards.length + q.topics.length;
