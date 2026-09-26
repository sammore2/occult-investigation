// SDR_OCULT — scripts/api.mjs
// Public surface bound as window.SDR_OCULT by the entry point; the handoff-03
// sheet calls these roll helpers.

import * as rules from './rules.mjs';
import {
  rollTest, rollSkill, rollAttribute, rollInitiative,
  rollAttack, rollDamage, rollRitualDamage,
} from './roll-engine.mjs';

export const SdrOcultApi = {
  rules,
  rollTest,
  rollSkill,
  rollAttribute,
  rollInitiative,
  rollAttack,
  rollDamage,
  rollRitualDamage,
};
