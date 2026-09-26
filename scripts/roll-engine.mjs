// SDR_OCULT — scripts/roll-engine.mjs
// Rolls go through window.Loom.dispatchRoll (fire-and-forget): the formula
// plus everything presentation needs travels in `meta`. Same dialog-first
// shape as the reference sdr5eRoll.
// The copied roll dialog offers advantage buttons; this system has no such
// control, so the choice shifts the dice count by +1/-1 die
// (testDice(attribute +/- 1), clamped at 0).

import { SKILL_ATTRIBUTE } from './config.mjs';
import { testDice, skillGradeBonus, applyDiceShift, multiplyDiceFormula } from './rules.mjs';

const SYSTEM = 'sdr-ocult';
const num = (v) => Number(v) || 0;

function actorAttr(actor, key) {
  return num(actor?.systemData?.attributes?.[key]?.value);
}

function skillEntry(actor, key) {
  return actor?.systemData?.skills?.[key] || {};
}

function skillAttribute(actor, key) {
  const e = skillEntry(actor, key);
  return e.attribute || SKILL_ATTRIBUTE[key];
}

async function askDialog(title, parts) {
  const { showRollDialog } = await import('./roll-dialog.mjs');
  return showRollDialog({ title, parts });
}

function dispatch({ actor, formula, mode, meta }) {
  window.Loom.dispatchRoll({ formula, actorId: actor?.id, mode, meta });
}

/** Generic attribute test: Nd20 keep-highest (+ flat bonus), DC optional. */
export async function rollTest(actor, { label, attribute, bonus = 0, dc = null } = {}) {
  const attrVal = typeof attribute === 'number' ? attribute : actorAttr(actor, attribute);
  const base = num(bonus);
  const parts = base !== 0 ? [{ label: 'Bonus', value: base }] : [];
  const choice = await askDialog(label || 'Teste', parts);
  if (!choice) return null;
  const dice = testDice(applyDiceShift(attrVal, choice.advantage));
  const totalBonus = base + num(choice.situational);
  const formula = totalBonus !== 0 ? `${dice} + ${totalBonus}` : dice;
  const meta = { label, system: SYSTEM, rollType: 'test', attribute, bonus: totalBonus };
  if (dc !== null && dc !== undefined) meta.dc = dc;
  if (choice.situational) meta.situational = choice.situational;
  dispatch({ actor, formula, mode: choice.rollMode || 'public', meta });
  return true;
}

/** Skill test: dice from the skill's attribute, flat part from grade + free bonus. */
export async function rollSkill(actor, key) {
  const entry = skillEntry(actor, key);
  const attrKey = skillAttribute(actor, key);
  const flat = skillGradeBonus(entry.grade) + num(entry.bonus);
  const parts = flat !== 0 ? [{ label: 'Bonus', value: flat }] : [];
  const choice = await askDialog(key, parts);
  if (!choice) return null;
  const dice = testDice(applyDiceShift(actorAttr(actor, attrKey), choice.advantage));
  const totalBonus = flat + num(choice.situational);
  const formula = totalBonus !== 0 ? `${dice} + ${totalBonus}` : dice;
  const meta = {
    label: key, system: SYSTEM, rollType: 'skill', skill: key,
    attribute: attrKey, grade: entry.grade || 'untrained', bonus: totalBonus,
  };
  if (choice.situational) meta.situational = choice.situational;
  dispatch({ actor, formula, mode: choice.rollMode || 'public', meta });
  return true;
}

/** Raw attribute test, no grade involved. */
export async function rollAttribute(actor, key) {
  return rollTest(actor, { label: key, attribute: key, bonus: 0 });
}

/** Initiative is the iniciativa skill. */
export async function rollInitiative(actor) {
  const ok = await rollSkill(actor, 'iniciativa');
  return ok;
}

/** Attack: skill test with the weapon's skill; crit range travels in meta. */
export async function rollAttack(actor, item) {
  const w = item?.systemData || {};
  const skillKey = w.skill === 'pontaria' ? 'pontaria' : 'luta';
  const entry = skillEntry(actor, skillKey);
  const attrKey = skillAttribute(actor, skillKey);
  const flat = skillGradeBonus(entry.grade) + num(entry.bonus);
  const parts = flat !== 0 ? [{ label: 'Bonus', value: flat }] : [];
  const choice = await askDialog(item?.name || skillKey, parts);
  if (!choice) return null;
  const dice = testDice(applyDiceShift(actorAttr(actor, attrKey), choice.advantage));
  const totalBonus = flat + num(choice.situational);
  const formula = totalBonus !== 0 ? `${dice} + ${totalBonus}` : dice;
  const meta = {
    label: item?.name || skillKey, system: SYSTEM, rollType: 'attack',
    skill: skillKey, attribute: attrKey, bonus: totalBonus,
    critThreshold: num(w.critThreshold) || 20,
    critMultiplier: num(w.critMultiplier) || 2,
    itemId: item?.id,
  };
  if (choice.situational) meta.situational = choice.situational;
  dispatch({ actor, formula, mode: choice.rollMode || 'public', meta });
  return true;
}

/** Weapon damage; critical multiplies only the dice (see multiplyDiceFormula). */
export async function rollDamage(actor, item, { critical = false } = {}) {
  const w = item?.systemData || {};
  const base = (w.damage || '').trim();
  if (!base) return null;
  const formula = critical
    ? multiplyDiceFormula(base, num(w.critMultiplier) || 2)
    : base;
  dispatch({
    actor,
    formula,
    mode: 'public',
    meta: {
      label: item?.name || '', system: SYSTEM, rollType: 'damage',
      critical, itemId: item?.id,
    },
  });
  return true;
}

/** Ritual damage uses the ritual's own damage formula, no crit rule here. */
export async function rollRitualDamage(actor, item) {
  const base = ((item?.systemData?.damage) || '').trim();
  if (!base) return null;
  dispatch({
    actor,
    formula: base,
    mode: 'public',
    meta: { label: item?.name || '', system: SYSTEM, rollType: 'ritualDamage', itemId: item?.id },
  });
  return true;
}
