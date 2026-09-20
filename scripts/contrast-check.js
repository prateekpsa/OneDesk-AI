/* eslint-disable no-console */
/**
 * Verifies every text/background token pair in the OneDesk console against
 * WCAG 2.1 AA, reading the real values out of _tokens.scss so the check can
 * never drift from the tokens.
 *
 *   node scripts/contrast-check.js
 *
 * Exits non-zero on a failure, so it can go straight into CI or a pre-commit
 * hook. Add a pair here whenever you put text on a new background.
 */
const fs = require('fs');
const path = require('path');

const TOKENS_PATH = path.join(
  __dirname,
  '..',
  'src',
  'webparts',
  'onedeskConsole',
  'styles',
  '_tokens.scss'
);

function readTokens() {
  const source = fs.readFileSync(TOKENS_PATH, 'utf8');
  const tokens = {};
  const pattern = /(--odc-[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g;
  let match = pattern.exec(source);
  while (match) {
    tokens[match[1]] = match[2];
    match = pattern.exec(source);
  }
  return tokens;
}

function channel(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

// [what it is, text token, background token, minimum]
// 4.5 is AA for body text; 3.0 is AA for >=24px text and for non-text
// indicators such as the focus ring.
const PAIRS = [
  ['body text on a card', '--odc-text', '--odc-surface', 4.5],
  ['body text on the canvas', '--odc-text', '--odc-canvas', 4.5],
  ['supporting copy on a card', '--odc-text-secondary', '--odc-surface', 4.5],
  ['supporting copy on the canvas', '--odc-text-secondary', '--odc-canvas', 4.5],
  ['hints on a card', '--odc-text-muted', '--odc-surface', 4.5],
  ['hints on the canvas', '--odc-text-muted', '--odc-canvas', 4.5],
  ['hints on a sunken block', '--odc-text-muted', '--odc-surface-sunken', 4.5],
  ['hints in a table footer', '--odc-text-muted', '--odc-surface-footer', 4.5],
  ['column labels on a table head', '--odc-text-caps', '--odc-surface-subtle', 4.5],
  ['column labels on a card', '--odc-text-caps', '--odc-surface', 4.5],
  ['field labels on a card', '--odc-text-label', '--odc-surface', 4.5],
  ['field labels on an empty panel', '--odc-text-label', '--odc-surface-empty', 4.5],
  ['button text on the action fill', '--odc-text-on-fill', '--odc-action', 4.5],
  ['button text on action hover', '--odc-text-on-fill', '--odc-action-hover', 4.5],
  ['links on a card', '--odc-action', '--odc-surface', 4.5],
  ['active nav text on its tint', '--odc-action-text', '--odc-action-tint', 4.5],
  ['avatar initials on the strong tint', '--odc-action-text', '--odc-action-tint-strong', 4.5],
  ['breach text on its tint', '--odc-danger-text', '--odc-danger-bg', 4.5],
  ['breach text on a card', '--odc-danger-text', '--odc-surface', 4.5],
  ['danger banner copy', '--odc-danger-ink', '--odc-danger-bg', 4.5],
  ['warning text on its tint', '--odc-warn-text', '--odc-warn-bg', 4.5],
  ['warning banner copy', '--odc-warn-strong', '--odc-warn-bg', 4.5],
  ['success text on its tint', '--odc-success-text', '--odc-success-bg', 4.5],
  ['confirmation text on the success fill', '--odc-text-on-fill', '--odc-success-text', 4.5],
  ['info text on its tint', '--odc-info-text', '--odc-info-bg', 4.5],
  ['neutral pill text', '--odc-neutral-text', '--odc-neutral-bg', 4.5],
  ['closed pill text', '--odc-muted-text', '--odc-muted-bg', 4.5],
  ['focus ring against a card', '--odc-focus', '--odc-surface', 3.0],
  ['focus ring against the canvas', '--odc-focus', '--odc-canvas', 3.0]
];

const tokens = readTokens();
const failures = [];

PAIRS.forEach(([label, fgToken, bgToken, minimum]) => {
  const fg = tokens[fgToken];
  const bg = tokens[bgToken];
  if (!fg || !bg) {
    failures.push(`${label}: missing token ${!fg ? fgToken : bgToken}`);
    console.log(`MISSING       ${label}`);
    return;
  }
  const value = ratio(fg, bg);
  const ok = value >= minimum;
  if (!ok) {
    failures.push(
      `${label}: ${value.toFixed(2)}:1 (needs ${minimum}:1) — ${fg} on ${bg}`
    );
  }
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${value.toFixed(2).padStart(5)}:1  (min ${minimum})  ${label}`
  );
});

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} contrast failure(s):`);
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exit(1);
}
console.log(`All ${PAIRS.length} token pairs meet WCAG 2.1 AA.`);
