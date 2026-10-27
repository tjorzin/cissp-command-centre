import { expect } from '@playwright/test';

// No content may extend past the screen. Two traps make the obvious checks blind:
// - body has overflow-x: hidden, which clips (and hides) overflowing content;
// - in mobile emulation the layout viewport widens to fit oversized content, so
//   window.innerWidth grows with the problem.
// So compare every element's right edge with the emulated screen width, skipping content
// inside blocks that scroll on purpose (code.cmd).
export async function noOverflow(page) {
  const screenWidth = page.viewportSize().width;
  const offenders = await page.evaluate((vw) => {
    const scrollsOnPurpose = (el) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX;
        if (ox === 'auto' || ox === 'scroll') return true;
      }
      return false;
    };
    return [...document.querySelectorAll('body *')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.right > vw + 1 && !scrollsOnPurpose(el);
      })
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}.${[...el.classList].join('.')} right=${Math.round(el.getBoundingClientRect().right)}`);
  }, screenWidth);
  expect(offenders, 'elements wider than the viewport').toEqual([]);
}
