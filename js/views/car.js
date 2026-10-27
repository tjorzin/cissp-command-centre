// Car mode: spoken tracks through the browser's Speech Synthesis API. Each line is
// spoken, then a real pause (thinking time stays the same at any speed). The position
// is saved after every line so a trip can resume where the last one stopped.
import { h, toast } from '../ui.js';
import { RATES, trackSeconds, minutes, resumeAt, scriptsText, sortVoices, pauseOf } from '../engine/car.js';
import { download } from './more.js';

// One player at a time across renders: leaving the screen stops speech.
let player = null;
function stopPlayer() {
  if (!player) return;
  clearTimeout(player.timer);
  player.playing = false;
  player = null;
  try { speechSynthesis.cancel(); } catch { /* not supported */ }
}
addEventListener('hashchange', () => { if (!location.hash.startsWith('#/car')) stopPlayer(); });

export function renderCar(ctx) {
  const { store, data } = ctx;
  stopPlayer();
  if (!data.tracks) {
    return h('section', {}, h('h2', {}, 'Car mode'), h('div', { class: 'card' }, 'The car-mode scripts could not be loaded. Connect once to download them.'));
  }
  const { tracks, defaultPause } = data.tracks;
  const supported = typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
  const saved = store.get().car;
  let { index, line } = resumeAt(tracks, saved);

  const save = (patch) => store.update((st) => { st.car = { ...st.car, ...patch }; });

  // Controls
  const trackSel = h('select', { id: 'car-track', 'aria-label': 'Track' },
    ...tracks.map((t, i) => h('option', { value: i }, `${t.title} (${minutes(trackSeconds(t, defaultPause))})`)));
  trackSel.value = String(index);
  const rateSel = h('select', { id: 'car-rate', 'aria-label': 'Speed' },
    ...RATES.map((r) => h('option', { value: r }, `${r}× speed`)));
  rateSel.value = String(RATES.includes(saved.rate) ? saved.rate : 1);
  const voiceSel = h('select', { id: 'car-voice', 'aria-label': 'Voice' }, h('option', { value: '' }, 'Device default voice'));
  const autoNext = h('input', { type: 'checkbox', id: 'car-autonext', checked: saved.autoNext !== false });

  const fillVoices = () => {
    if (!supported) return;
    const voices = sortVoices(speechSynthesis.getVoices());
    voiceSel.replaceChildren(h('option', { value: '' }, 'Device default voice'),
      ...voices.map((v) => h('option', { value: v.name }, `${v.name} (${v.lang})`)));
    voiceSel.value = voices.some((v) => v.name === saved.voice) ? saved.voice : '';
  };
  if (supported) {
    fillVoices();
    speechSynthesis.addEventListener?.('voiceschanged', fillVoices);
  }

  // Display
  const title = h('h3', { id: 'car-title' });
  const progress = h('p', { class: 'small muted', id: 'car-progress' });
  const now = h('p', { class: 'car-line', id: 'car-line', 'aria-live': 'polite' });
  const playBtn = h('button', { class: 'btn primary car-btn', type: 'button', id: 'car-play' }, 'Play');

  const paint = () => {
    const t = tracks[index];
    title.textContent = t.title;
    progress.textContent = `Line ${line + 1} of ${t.lines.length}`;
    now.textContent = t.lines[line].t;
    playBtn.textContent = player?.playing ? 'Pause' : (line > 0 ? 'Resume' : 'Play');
    trackSel.value = String(index);
  };

  const speakLine = () => {
    const p = player;
    if (!p?.playing) return;
    const t = tracks[index];
    const l = t.lines[line];
    paint();
    const u = new SpeechSynthesisUtterance(l.t);
    u.lang = 'en-GB';
    u.rate = Number(rateSel.value);
    const voice = speechSynthesis.getVoices().find((v) => v.name === voiceSel.value);
    if (voice) { u.voice = voice; u.lang = voice.lang; }
    u.onend = () => {
      if (player !== p || !p.playing) return;
      p.timer = setTimeout(() => {
        if (player !== p || !p.playing) return;
        if (line + 1 < t.lines.length) line += 1;
        else if (autoNext.checked && index + 1 < tracks.length) { index += 1; line = 0; }
        else { line = 0; save({ track: t.id, line: 0 }); stopPlayer(); paint(); toast('Track finished.'); return; }
        save({ track: tracks[index].id, line });
        speakLine();
      }, pauseOf(l, defaultPause));
    };
    u.onerror = (e) => {
      if (player !== p || e.error === 'interrupted' || e.error === 'canceled') return;
      stopPlayer(); paint(); toast(`Speech stopped: ${e.error || 'unknown error'}.`);
    };
    speechSynthesis.speak(u);
  };

  const play = () => {
    stopPlayer();
    player = { playing: true, timer: null };
    save({ track: tracks[index].id, line });
    speakLine();
  };
  const pause = () => { stopPlayer(); paint(); };
  const jump = (delta) => {
    const playing = !!player?.playing;
    stopPlayer();
    line = Math.max(0, Math.min(tracks[index].lines.length - 1, line + delta));
    save({ track: tracks[index].id, line });
    if (playing) play(); else paint();
  };

  playBtn.addEventListener('click', () => (player?.playing ? pause() : play()));
  trackSel.addEventListener('change', () => {
    stopPlayer();
    index = Number(trackSel.value); line = 0;
    save({ track: tracks[index].id, line });
    paint();
  });
  rateSel.addEventListener('change', () => save({ rate: Number(rateSel.value) }));
  voiceSel.addEventListener('change', () => save({ voice: voiceSel.value }));
  autoNext.addEventListener('change', () => save({ autoNext: autoNext.checked }));

  paint();
  const total = tracks.reduce((s, t) => s + trackSeconds(t, defaultPause), 0);

  return h('section', { class: 'car' },
    h('a', { href: '#/study', class: 'back small' }, '‹ Study'),
    h('h2', {}, 'Car mode'),
    h('p', { class: 'small muted' }, `${tracks.length} audio tracks, about ${minutes(total)} in all: one per domain and a mixed recap. Questions leave a pause for you to answer out loud.`),
    h('div', { class: 'banner info', role: 'note' }, h('strong', {}, 'Set it up before you drive'),
      'Choose the track, voice and speed while parked. The screen is not needed once it plays.'),
    supported ? null : h('div', { class: 'banner warn', role: 'alert' }, h('strong', {}, 'Speech is not available in this browser'),
      'Download the scripts below and play them with a reader such as Edge Read Aloud.'),
    h('div', { class: 'card car-player' },
      title, progress, now,
      h('div', { class: 'btn-row car-controls' },
        h('button', { class: 'btn car-btn', type: 'button', id: 'car-prev', 'aria-label': 'Previous line', onclick: () => jump(-1) }, '‹ Back'),
        playBtn,
        h('button', { class: 'btn car-btn', type: 'button', id: 'car-next', 'aria-label': 'Next line', onclick: () => jump(1) }, 'Skip ›'))),
    h('div', { class: 'card filters' },
      trackSel, voiceSel, rateSel,
      h('label', { class: 'small check' }, autoNext, ' Continue to the next track')),
    h('div', { class: 'btn-row' },
      h('button', {
        class: 'btn', type: 'button', id: 'car-download',
        onclick: () => download('cissp-car-scripts.txt', scriptsText(data.tracks), 'text/plain')
      }, 'Download all scripts (.txt)')),
    h('p', { class: 'small muted' }, 'Voices come from your device, so they differ between phones. Durations assume 150 words a minute at 1× speed.'));
}
