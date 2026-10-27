// Reminders at the three block times (Africa/Harare).
// - While the app is open: a notification at each block time (if permitted), and an in-app
//   "due now" banner whenever a block's time has passed and it is not done.
// - A static web app cannot wake itself when closed, so for reliable alarms the app offers a
//   calendar file with the three daily reminders, which the phone's calendar then rings.
import { addDays } from './outline.js';
import { dueTodayCount, todayQueue } from './engine/srs.js';

export function nowHHMM(timeZone, now = new Date()) {
  return new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
}

export function notificationState() {
  if (!('Notification' in globalThis)) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

export async function enableNotifications() {
  if (notificationState() === 'unsupported') return 'unsupported';
  try { return await Notification.requestPermission(); } catch { return notificationState(); }
}

export function reminderText(plan, block, state, cards) {
  const due = dueTodayCount(todayQueue(state, cards, plan.today));
  const first = block.tasks.find((t) => !t.done);
  return {
    title: `${block.label} block: about ${block.minutes} min`,
    body: `${first ? first.title : 'Open the app to start'}. ${due} review${due === 1 ? '' : 's'} due today.`
  };
}

async function show({ title, body }) {
  if (notificationState() !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg?.showNotification) await reg.showNotification(title, { body, tag: 'cissp-block', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' });
    else new Notification(title, { body, icon: 'icons/icon-192.png' });
    return true;
  } catch {
    return false;
  }
}

// Milliseconds from now until hh:mm today in the given zone; null if that time has passed.
export function msUntil(hhmm, timeZone, now = new Date()) {
  const [h1, m1] = nowHHMM(timeZone, now).split(':').map(Number);
  const [h2, m2] = hhmm.split(':').map(Number);
  const ms = ((h2 * 60 + m2) - (h1 * 60 + m1)) * 60000 - now.getSeconds() * 1000 - now.getMilliseconds();
  return ms > 0 ? ms : null;
}

let timers = [];

// Sets a timer for each block time still to come today. getContext() returns fresh
// { plan, state, cards } at the moment the reminder fires; onFire refreshes the banner.
export function scheduleReminders(getContext, onFire) {
  timers.forEach(clearTimeout);
  timers = [];
  const ctx = getContext();
  if (!ctx) return;
  const tz = ctx.state.settings.timeZone;
  for (const block of ctx.plan.blocks) {
    const ms = msUntil(block.time, tz);
    if (ms == null) continue;
    timers.push(setTimeout(async () => {
      const fresh = getContext();
      const b = fresh?.plan.blocks.find((x) => x.id === block.id);
      if (b && !b.done) await show(reminderText(fresh.plan, b, fresh.state, fresh.cards));
      onFire();
    }, ms));
  }
}

// iCalendar file with the three daily reminders up to the exam date.
export function reminderCalendar(settings, today, uidHost = 'cissp-command-centre') {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const day = today.replace(/-/g, '');
  const until = addDays(settings.targetDate, -1).replace(/-/g, '');
  const names = ['Morning', 'Afternoon', 'Evening'];
  const events = settings.reminders.map((t, i) => [
    'BEGIN:VEVENT',
    `UID:${names[i].toLowerCase()}-${day}@${uidHost}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=Africa/Harare:${day}T${t.replace(':', '')}00`,
    'DURATION:PT30M',
    `RRULE:FREQ=DAILY;UNTIL=${until}T235959Z`,
    `SUMMARY:CISSP ${names[i].toLowerCase()} block`,
    'DESCRIPTION:Open CISSP Command Centre: the Today screen says what to do.',
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:CISSP study block', 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT'
  ].join('\r\n'));
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CISSP Command Centre//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VTIMEZONE', 'TZID:Africa/Harare',
    'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0200', 'TZNAME:CAT', 'END:STANDARD',
    'END:VTIMEZONE',
    ...events,
    'END:VCALENDAR', ''
  ].join('\r\n');
}
