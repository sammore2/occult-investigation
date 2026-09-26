// SDR_OCULT — scripts/npc-sheet.mjs
// Single-column NPC dossier in the character sheet's "dossiê de campo"
// visual language (.oc-file/.oc-card/.oc-attrs/.oc-meter/.oc-skill/
// .oc-weapon/.oc-legal under .ocult-ui). Same lifecycle/save/drop shape
// as the character sheet; single column forced by CSS (.oc-npc).

import { LoomHandlebarsMixin, LoomActorSheet } from '/_loom/sdk/index.js';
import { ATTRIBUTE_KEYS, SKILL_GRADES, SKILL_ATTRIBUTE } from './config.mjs';
import { skillGradeBonus, testDice } from './rules.mjs';
import { isDeterminationOn } from './settings.mjs';
import {
  rollAttribute, rollSkill, rollAttack, rollDamage,
} from './roll-engine.mjs';
import {
  getSheetLang, pct, attachSheetSaver, attachSheetListeners, dropItemOnSheet,
  openEmbeddedItem, deleteEmbeddedItem, createEmbeddedItem, applyResourceDelta,
  preparedClone, itemsArray, embeddedByType,
} from './sheet-common.mjs';
import { SdrOcultItemSheet } from './item-sheet.mjs';

const num = (v) => Number(v) || 0;
const fmtBonus = (v) => (v >= 0 ? `+${v}` : `${v}`);

export class SdrOcultNpcSheet extends LoomHandlebarsMixin(LoomActorSheet) {
  static DEFAULT_OPTIONS = { position: { width: 620, height: 800 } };

  constructor(props) {
    super({
      ...props,
      id: props.id || `actor-sheet-${props.actorId}`,
      documentId: props.actorId,
      title: (props.title && props.title !== 'undefined') ? props.title : 'SDR OCULT',
      showFooter: false,
      resizable: true,
      allowOverflow: true,
      classes: ['sdr-ocult-sheet', 'sdr-ocult-npc-sheet', 'ocult-ui'],
    });
    attachSheetSaver(this);
  }

  static PARTS = { main: { template: '/marketplace/rulesets/sdr-ocult/templates/npc-sheet.hbs' } };

  get title() {
    const n = this.document?.name;
    return (n && n !== 'undefined') ? n : 'SDR OCULT';
  }

  get documentName() { return 'actor'; }
  get apiRoute() { return '/actors'; }
  get dataKey() { return 'systemData'; }

  async mount() {
    await super.mount();
    attachSheetListeners(this, (e) => dropItemOnSheet(this, e));
  }

  _postRender() {
    if (typeof super._postRender === 'function') super._postRender();
    attachSheetListeners(this, (e) => dropItemOnSheet(this, e));
  }

  async _prepareContext() {
    const context = await super._prepareContext();
    const L = await getSheetLang();
    const T = L.sheet || {};
    const row = await preparedClone(this);
    const sd = row?.systemData || {};
    const items = itemsArray(row?.items);

    const str = (obj, key, fb) => obj?.[key] ?? fb ?? key;
    const skillName = (k) => str(L.skills, k, k);

    const attributes = ATTRIBUTE_KEYS.map((k) => ({
      key: k,
      abbr: k.toUpperCase(),
      label: str(L.attributes, k, k),
      value: num(sd.attributes?.[k]?.value),
    }));

    // Trained-only skills, same row as the character sheet: name + dice pool + total.
    const skills = Object.keys(sd.skills || {})
      .filter((k) => (sd.skills[k]?.grade || 'untrained') !== 'untrained')
      .map((k) => {
        const e = sd.skills[k] || {};
        const grade = e.grade || 'trained';
        const flat = skillGradeBonus(grade) + num(e.bonus);
        const attrKey = e.attribute || SKILL_ATTRIBUTE[k];
        const dice = testDice(num(sd.attributes?.[attrKey]?.value))
          .replace('d20kh1', 'd20').replace('2d20kl1', '2d20↓');
        const gradeIdx = SKILL_GRADES.indexOf(grade);
        return {
          key: k,
          label: skillName(k),
          grade: str(L.grades, grade, grade),
          gradeRank: gradeIdx < 0 ? 0 : gradeIdx,
          dice,
          total: fmtBonus(flat),
        };
      })
      .sort((a, b) => b.gradeRank - a.gradeRank || a.label.localeCompare(b.label));

    const weapons = embeddedByType(items, 'weapon').map((w) => {
      const d = w.systemData || w.system || w.data || {};
      const hasDamage = !!((d.damage || '').trim());
      return {
        id: w.id, name: w.name,
        skill: d.skill === 'pontaria' ? 'pontaria' : 'luta',
        skillLabel: skillName(d.skill === 'pontaria' ? 'pontaria' : 'luta'),
        crit: `${num(d.critThreshold) || 20}/x${num(d.critMultiplier) || 2}`,
        hasDamage,
      };
    });

    const res = (k) => {
      const r = sd.resources?.[k] || {};
      return { value: num(r.value), max: num(r.max), pct: pct(r.value, r.max) };
    };
    const determination = isDeterminationOn();

    return {
      ...context,
      L, T,
      name: (row?.name && row.name !== 'undefined') ? row.name : '',
      nex: num(sd.nex?.value),
      nexPct: Math.max(0, Math.min(100, Math.round((num(sd.nex?.value) / 99) * 100))),
      avatarUrl: this.document?.avatarUrl || this.document?.img || '',
      attributes,
      pv: res('pv'), pe: res('pe'), san: res('san'),
      useDetermination: determination,
      det: { value: num(sd.determination?.value), max: num(sd.determination?.max), pct: pct(sd.determination?.value, sd.determination?.max) },
      defense: { value: num(sd.defense?.value), protection: num(sd.defense?.protection), bonus: num(sd.defense?.bonus) },
      peLimit: { value: num(sd.peLimit?.value), override: num(sd.peLimit?.override) },
      skills,
      weapons,
      notes: sd.notes || '',
      legalNotice: L.legal?.communityNotice || '',
    };
  }

  onAction(action, id, target) {
    if (action === 'roll-attribute') {
      if (target?.dataset?.key) void rollAttribute(this.document, target.dataset.key);
      return;
    }
    if (action === 'roll-skill') {
      if (target?.dataset?.key) void rollSkill(this.document, target.dataset.key);
      return;
    }
    if (action === 'roll-attack') {
      const item = itemsArray(this.document?.items).find((i) => i.id === id);
      if (item) void rollAttack(this.document, item);
      return;
    }
    if (action === 'roll-damage' || action === 'roll-crit') {
      const item = itemsArray(this.document?.items).find((i) => i.id === id);
      if (item) void rollDamage(this.document, item, { critical: action === 'roll-crit' });
      return;
    }
    if (action === 'res-delta') {
      const delta = Number(target?.dataset?.delta) || 0;
      const res = target?.dataset?.res;
      if (res && delta) void applyResourceDelta(this, res, delta);
      return;
    }
    if (action === 'open-item') {
      void openEmbeddedItem(this, id, SdrOcultItemSheet);
      return;
    }
    if (action === 'delete-item') {
      void deleteEmbeddedItem(this, id);
      return;
    }
    if (action === 'create-item') {
      const type = target?.dataset?.itemType || target?.closest?.('[data-item-type]')?.dataset?.itemType;
      if (type) void createEmbeddedItem(this, type);
      return;
    }
    if (typeof super.onAction === 'function') super.onAction(action, id, target);
  }
}
