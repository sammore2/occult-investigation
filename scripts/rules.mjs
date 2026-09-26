// SDR_OCULT — scripts/rules.mjs
// Pure rule functions: no `/_loom/...` imports, so this file runs in Node
// tests as well as in the client. Presentation of rolled totals happens in
// chat (dispatchRoll is fire-and-forget); evaluation helpers that need the
// total (isCritical) live here so the sheet can reuse them once the engine
// exposes a post-roll hook.

/** Dice for a test with the given attribute value (0-5, higher with temp bonus). */
export function testDice(attribute) {
  const a = Math.trunc(Number(attribute) || 0);
  if (a <= 0) return '2d20kl1';
  return `${a}d20kh1`;
}

/** Shifts the attribute used for dice count (dialog advantage => +1 die). Never below 0. */
export function applyDiceShift(attribute, shift) {
  const a = Math.trunc(Number(attribute) || 0);
  const s = Math.trunc(Number(shift) || 0);
  return Math.max(0, a + s);
}

/** Fixed bonus per training grade. Unknown grades give 0 (field stays editable). */
export function skillGradeBonus(grade) {
  switch (grade) {
    case 'trained': return 5;
    case 'veteran': return 10;
    case 'expert': return 15;
    default: return 0;
  }
}

/** Defense = 10 + agility + protection bonus + free bonus. */
export function calcDefense({ agi = 0, protection = 0, bonus = 0 } = {}) {
  return 10 + (Number(agi) || 0) + (Number(protection) || 0) + (Number(bonus) || 0);
}

/** NEX steps: 5% -> 0, 10% -> 1, 99% -> 18. Clamped at 0, no invented values below range. */
export function nexSteps(nex) {
  const n = Number(nex) || 0;
  return Math.max(0, Math.floor(n / 5) - 1);
}

/** PE limit per turn: max(1, floor(nex / 5)). */
export function peLimitPerTurn(nex) {
  const n = Number(nex) || 0;
  return Math.max(1, Math.floor(n / 5));
}

/** PV max from the class item numbers (filled by the GM) plus a free bonus. */
export function maxPV({ pvBase = 0, vig = 0, steps = 0, pvPerNex = 0, bonus = 0 } = {}) {
  return (Number(pvBase) || 0) + (Number(vig) || 0)
    + (Number(steps) || 0) * ((Number(pvPerNex) || 0) + (Number(vig) || 0))
    + (Number(bonus) || 0);
}

/** PE max from the class item numbers plus a free bonus. */
export function maxPE({ peBase = 0, pre = 0, steps = 0, pePerNex = 0, bonus = 0 } = {}) {
  return (Number(peBase) || 0) + (Number(pre) || 0)
    + (Number(steps) || 0) * ((Number(pePerNex) || 0) + (Number(pre) || 0))
    + (Number(bonus) || 0);
}

/** Sanity max from the class item numbers plus a free bonus. */
export function maxSan({ sanBase = 0, steps = 0, sanPerNex = 0, bonus = 0 } = {}) {
  return (Number(sanBase) || 0) + (Number(steps) || 0) * (Number(sanPerNex) || 0)
    + (Number(bonus) || 0);
}

/**
 * Multiplies ONLY the dice of a damage formula by mult (critical hits):
 * `1d8+2` x3 -> `3d8+2`. Flat modifiers are untouched. Formulas without dice
 * or mult <= 1 come back unchanged.
 */
export function multiplyDiceFormula(formula, mult) {
  const m = Math.trunc(Number(mult) || 0);
  if (typeof formula !== 'string' || !formula.trim() || m <= 1) return formula;
  return formula.replace(/(\d+)\s*d\s*(\d+)/gi, (_, n, x) => `${Number(n) * m}d${x}`);
}

/** Natural roll reaches the critical threshold (default 20 on a d20). */
export function isCritical(natural, threshold = 20) {
  const n = Number(natural) || 0;
  const t = Number(threshold) || 20;
  return n >= t;
}
