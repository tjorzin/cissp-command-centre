// Outline selection by target date, plus the warnings shown when a date change
// would move the sitting onto a different outline. Dates are ISO yyyy-mm-dd strings
// compared as calendar days, so time zones never shift a boundary.

const DAY = 86400000;
export const WARN_WINDOW_DAYS = 28;

const toDays = (iso) => Math.round(Date.parse(`${iso}T00:00:00Z`) / DAY);

export function todayIn(timeZone = 'Africa/Harare', now = new Date()) {
  // en-CA formats as yyyy-mm-dd.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function daysBetween(fromIso, toIso) {
  return toDays(toIso) - toDays(fromIso);
}

export function outlineFor(dateIso, outlines) {
  const d = toDays(dateIso);
  return outlines.find((o) => d >= toDays(o.effectiveFrom) && (o.effectiveTo === null || d <= toDays(o.effectiveTo))) || null;
}

/**
 * Returns notices about the target date in relation to outline changes:
 *  - 'switched': the target falls under a newer outline than the default (2024) one.
 *  - 'near':     the target is within WARN_WINDOW_DAYS before an outline change, so a short move crosses it.
 */
export function outlineNotices(targetIso, outlines, defaultId = '2024') {
  const notices = [];
  const current = outlineFor(targetIso, outlines);
  if (current && current.id !== defaultId) {
    notices.push({
      kind: 'switched',
      outlineId: current.id,
      title: `Your target date falls under the ${current.id} outline`,
      body: `From ${formatDate(current.effectiveFrom)} ISC2 tests against a new outline with different domain weights. ` +
        `Study plans and mock exams will use the ${current.id} weights.`
    });
  }
  const next = outlines.find((o) => toDays(o.effectiveFrom) > toDays(targetIso));
  if (next) {
    const gap = daysBetween(targetIso, next.effectiveFrom);
    if (gap <= WARN_WINDOW_DAYS) {
      notices.push({
        kind: 'near',
        outlineId: next.id,
        title: `${gap} day${gap === 1 ? '' : 's'} before the outline changes`,
        body: `If the exam moves to ${formatDate(next.effectiveFrom)} or later, it follows the ${next.id} outline. ` +
          `Book a date on or before ${formatDate(addDays(next.effectiveFrom, -1))} to keep the current syllabus.`
      });
    }
  }
  return notices;
}

export function addDays(iso, n) {
  return new Date((toDays(iso) + n) * DAY).toISOString().slice(0, 10);
}

export function formatDate(iso) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${iso}T00:00:00Z`));
}
