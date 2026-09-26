// Tests for scripts/rules.mjs (pure functions). Neutral invented names only.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  testDice, applyDiceShift, skillGradeBonus, calcDefense, nexSteps,
  peLimitPerTurn, maxPV, maxPE, maxSan, multiplyDiceFormula, isCritical,
} from '../scripts/rules.mjs';

describe('testDice', () => {
  it('attribute 0 rolls 2d20 keep lowest', () => assert.equal(testDice(0), '2d20kl1'));
  it('attribute 1 rolls 1d20 keep highest', () => assert.equal(testDice(1), '1d20kh1'));
  it('attribute 3 rolls 3d20 keep highest', () => assert.equal(testDice(3), '3d20kh1'));
  it('attribute above 5 follows the same rule', () => assert.equal(testDice(6), '6d20kh1'));
  it('negative clamps to the 0-attribute case', () => assert.equal(testDice(-2), '2d20kl1'));
});

describe('applyDiceShift', () => {
  it('advantage adds one die', () => assert.equal(applyDiceShift(2, 1), 3));
  it('disadvantage removes one die', () => assert.equal(applyDiceShift(2, -1), 1));
  it('never drops below 0 dice attribute', () => assert.equal(applyDiceShift(0, -1), 0));
});

describe('skillGradeBonus', () => {
  it('untrained 0', () => assert.equal(skillGradeBonus('untrained'), 0));
  it('trained +5', () => assert.equal(skillGradeBonus('trained'), 5));
  it('veteran +10', () => assert.equal(skillGradeBonus('veteran'), 10));
  it('expert +15', () => assert.equal(skillGradeBonus('expert'), 15));
  it('unknown grade 0', () => assert.equal(skillGradeBonus('master'), 0));
});

describe('calcDefense', () => {
  it('10 + agility + protection + bonus', () => {
    assert.equal(calcDefense({ agi: 2, protection: 3, bonus: 1 }), 16);
  });
  it('defaults to 10', () => assert.equal(calcDefense(), 10));
});

describe('nexSteps', () => {
  it('NEX 5 -> 0 steps', () => assert.equal(nexSteps(5), 0));
  it('NEX 10 -> 1 step', () => assert.equal(nexSteps(10), 1));
  it('NEX 99 -> 18 steps', () => assert.equal(nexSteps(99), 18));
  it('clamps at 0', () => assert.equal(nexSteps(0), 0));
});

describe('peLimitPerTurn', () => {
  it('NEX 5 -> 1', () => assert.equal(peLimitPerTurn(5), 1));
  it('NEX 20 -> 4', () => assert.equal(peLimitPerTurn(20), 4));
  it('never below 1', () => assert.equal(peLimitPerTurn(0), 1));
});

describe('resource maxima', () => {
  it('PV = base + vig + steps * (perNex + vig) + bonus', () => {
    assert.equal(maxPV({ pvBase: 8, vig: 2, steps: 1, pvPerNex: 4, bonus: 0 }), 16);
  });
  it('PE = base + pre + steps * (perNex + pre) + bonus', () => {
    assert.equal(maxPE({ peBase: 6, pre: 3, steps: 2, pePerNex: 3, bonus: 1 }), 22);
  });
  it('Sanity = base + steps * perNex + bonus', () => {
    assert.equal(maxSan({ sanBase: 10, steps: 2, sanPerNex: 4, bonus: 0 }), 18);
  });
  it('defaults to 0', () => {
    assert.equal(maxPV(), 0);
    assert.equal(maxPE(), 0);
    assert.equal(maxSan(), 0);
  });
});

describe('multiplyDiceFormula', () => {
  it('1d8+2 x3 -> 3d8+2 (flat untouched)', () => {
    assert.equal(multiplyDiceFormula('1d8+2', 3), '3d8+2');
  });
  it('multiplies every dice term', () => {
    assert.equal(multiplyDiceFormula('2d6+1d4+3', 2), '4d6+2d4+3');
  });
  it('mult <= 1 returns the formula unchanged', () => {
    assert.equal(multiplyDiceFormula('1d8+2', 1), '1d8+2');
  });
  it('formula without dice returns unchanged', () => {
    assert.equal(multiplyDiceFormula('+5', 3), '+5');
  });
});

describe('isCritical', () => {
  it('natural 20 crits on threshold 20', () => assert.equal(isCritical(20, 20), true));
  it('natural 19 does not crit on threshold 20', () => assert.equal(isCritical(19, 20), false));
  it('custom threshold applies', () => assert.equal(isCritical(18, 18), true));
});
