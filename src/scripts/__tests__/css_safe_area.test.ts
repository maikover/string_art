/**
 * CSS regression test: the landing footer must reserve space for the
 * Android gesture bar / iOS home indicator via env(safe-area-inset-bottom).
 *
 * Without it, on a phone with the navigation bar showing (e.g. 3-button
 * nav, or gestures with a visible handle), the bottom row of footer buttons
 * and the copyright text are covered by the OS chrome. This is the
 * same class of bug as the top_bar safe-area-top issue (now fixed).
 *
 * The test reads the CSS source as a string and asserts that the
 * `#landing_footer` rule block includes `env(safe-area-inset-bottom)`.
 * It's a regression guard, not a behavior test — it won't catch every
 * regression (e.g. the value being in the wrong place), but it WILL
 * fail loudly if someone removes the inset entirely.
 */
import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';

const cssPath = join(__dirname, '..', '..', 'styles', 'main.css');
const css = readFileSync(cssPath, 'utf8');

function extractRuleBlock(selector: string): string | null {
  // Find `#landing_footer {` and match braces to the end of the block.
  // Allows for nested @media rules (we don't try to be smart about those
  // — we just want to know if the inset var is referenced somewhere under
  // the selector or in a media query that targets it).
  const startMatch = new RegExp(`(^|\\n)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{`).exec(css);
  if (!startMatch) return null;

  const startIdx = startMatch.index + startMatch[0].length;
  let depth = 1;
  let i = startIdx;
  while (i < css.length && depth > 0) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') depth--;
    i++;
  }
  return css.slice(startIdx, i - 1);
}

describe('CSS safe-area insets for OS chrome', () => {
  test('#landing_footer references env(safe-area-inset-bottom)', () => {
    const block = extractRuleBlock('#landing_footer');
    expect(block).not.toBeNull();
    expect(block).toMatch(/env\(safe-area-inset-bottom/);
  });

  test('#top_bar references env(safe-area-inset-top)', () => {
    // The complementary top inset — the previous fix.
    const block = extractRuleBlock('#top_bar');
    expect(block).not.toBeNull();
    expect(block).toMatch(/env\(safe-area-inset-top/);
  });

  test('#main_header (mobile media query) references env(safe-area-inset-top)', () => {
    // In the desktop default the header has no inset; mobile media query adds it.
    expect(css).toMatch(/#main_header[\s\S]*?env\(safe-area-inset-top/);
  });
});
