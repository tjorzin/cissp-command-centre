// Car mode: pure helpers for the spoken tracks. Timing is an estimate at a steady
// speaking rate; real speech speed depends on the voice the device provides.

export const WPM = 150;
export const RATES = [0.8, 0.9, 1, 1.1, 1.25, 1.5];

export const words = (text) => text.trim().split(/\s+/).filter(Boolean).length;

export const pauseOf = (line, defaultPause) => line.p ?? defaultPause;

// Seconds for a track at rate 1: speech at WPM plus every pause.
export function trackSeconds(track, defaultPause, wpm = WPM) {
  return track.lines.reduce((s, l) => s + (words(l.t) / wpm) * 60 + pauseOf(l, defaultPause) / 1000, 0);
}

export const minutes = (sec) => `${Math.round(sec / 60)} min`;

// A valid resume position: unknown tracks and out-of-range lines fall back to the start.
export function resumeAt(tracks, pos) {
  const i = tracks.findIndex((t) => t.id === pos?.track);
  if (i < 0) return { index: 0, line: 0 };
  const line = Number.isInteger(pos.line) && pos.line >= 0 && pos.line < tracks[i].lines.length ? pos.line : 0;
  return { index: i, line };
}

// Plain text of every script, for a reader such as Edge Read Aloud. A blank line stands
// for each pause, and longer pauses (questions) are marked so the listener can stop.
export function scriptsText(data) {
  const out = ['CISSP Command Centre: car-mode scripts', 'Original study material. Not ISC2 content.', ''];
  for (const t of data.tracks) {
    out.push('='.repeat(60), `${t.title} (about ${minutes(trackSeconds(t, data.defaultPause))})`, '='.repeat(60), '');
    for (const l of t.lines) {
      out.push(l.t);
      if (pauseOf(l, data.defaultPause) >= 3000) out.push('[Pause and answer]');
      out.push('');
    }
  }
  return out.join('\r\n');
}

// Prefer British English voices, then any English, then the rest; keep the device's names.
export function sortVoices(voices) {
  const rank = (v) => (/^en[-_]GB/i.test(v.lang) ? 0 : /^en/i.test(v.lang) ? 1 : 2);
  return [...voices].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}
