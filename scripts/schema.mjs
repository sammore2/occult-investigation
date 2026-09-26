// SDR_OCULT — scripts/schema.mjs
// getDefaultData per type. Numbers the handoff does not give stay 0/empty
// (editable) instead of invented. Same switch shape as the reference.

import { ATTRIBUTE_KEYS, SKILL_KEYS } from './config.mjs';

function defaultAttributes() {
  const out = {};
  for (const k of ATTRIBUTE_KEYS) out[k] = { value: 1 };
  return out;
}

function defaultSkills() {
  const out = {};
  for (const k of SKILL_KEYS) out[k] = { grade: 'untrained', attribute: '', bonus: 0 };
  return out;
}

function defaultActor() {
  return {
    attributes: defaultAttributes(),
    skills: defaultSkills(),
    nex: { value: 5 },
    defense: { protection: 0, bonus: 0, value: 10 },
    peLimit: { override: 0, value: 1 },
    resources: {
      pv: { value: 0, max: 0, bonus: 0 },
      pe: { value: 0, max: 0, bonus: 0 },
      san: { value: 0, max: 0, bonus: 0 },
    },
    determination: { value: 0, max: 0 },
    notes: '',
  };
}

function withDescription(fields) {
  return { description: '', ...fields };
}

export function getDefaultData(type) {
  switch (type) {
    case 'character':
    case 'npc':
      return defaultActor();
    case 'origin':
      return withDescription({ trainedSkills: [], power: '' });
    case 'class':
      return withDescription({
        pvBase: 0, pvPerNex: 0, peBase: 0, pePerNex: 0,
        sanBase: 0, sanPerNex: 0, trainedSkillsCount: 0,
      });
    case 'trail':
      return withDescription({ class: '', nexUnlocks: [] });
    case 'power':
      return withDescription({ requirement: '', element: '', cost: 0 });
    case 'ritual':
      return withDescription({
        element: '', circle: 1, execution: '', range: '', target: '',
        duration: '', resistance: '', cost: 0, damage: '',
      });
    case 'weapon':
      return withDescription({
        damage: '', damageType: '', critThreshold: 20, critMultiplier: 2,
        skill: 'luta', range: '', category: '',
      });
    case 'protection':
      return withDescription({ defenseBonus: 0, category: '' });
    case 'gear':
      return withDescription({ category: '', quantity: 1, space: 0 });
    default:
      return {};
  }
}
