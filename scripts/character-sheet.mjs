// SDR_OCULT — scripts/character-sheet.mjs
// Agent dossier sheet (character). Lifecycle/save/drop mirror the engine's
// reference sheet; layout is the handoff's own "dossiê de campo" concept.

import { LoomHandlebarsMixin, LoomActorSheet } from '/_loom/sdk/index.js';
import { ATTRIBUTE_KEYS, SKILL_KEYS, SKILL_GRADES, ELEMENT_LABELS, SKILL_ATTRIBUTE } from './config.mjs';
import { skillGradeBonus, testDice } from './rules.mjs';
import { isDeterminationOn } from './settings.mjs';
import {
  rollAttribute, rollSkill, rollInitiative, rollAttack, rollDamage, rollRitualDamage,
} from './roll-engine.mjs';
import {
  getSheetLang, pct, attachSheetSaver, attachSheetListeners, dropItemOnSheet,
  openEmbeddedItem, deleteEmbeddedItem, createEmbeddedItem, applyResourceDelta,
  preparedClone, itemsArray, embeddedByType, firstEmbedded,
} from './sheet-common.mjs';
import { SdrOcultItemSheet } from './item-sheet.mjs';

const num = (v) => Number(v) || 0;
const fmtBonus = (v) => (v >= 0 ? `+${v}` : `${v}`);

export class SdrOcultCharacterSheet extends LoomHandlebarsMixin(LoomActorSheet) {
  static DEFAULT_OPTIONS = { position: { width: 960, height: 860 } };

  _activeTab = 'overview';

  constructor(props) {
    super({
      ...props,
      id: props.id || `actor-sheet-${props.actorId}`,
      documentId: props.actorId,
      title: (props.title && props.title !== 'undefined') ? props.title : 'SDR OCULT',
      showFooter: false,
      resizable: true,
      allowOverflow: true,
      classes: ['sdr-ocult-sheet', 'sdr-ocult-character-sheet', 'ocult-ui'],
    });
    attachSheetSaver(this);
  }

  static PARTS = { main: { template: '/marketplace/rulesets/sdr-ocult/templates/character-sheet.hbs' } };

  get title() {
    const n = this.document?.name;
    return (n && n !== 'undefined') ? n : 'SDR OCULT';
  }

  get documentName() { return 'actor'; }
  get apiRoute() { return '/actors'; }
  get dataKey() { return 'systemData'; }

  async mount() {
    await super.mount();
    this._applyActiveTab();
    attachSheetListeners(this, (e) => dropItemOnSheet(this, e));
  }

  _postRender() {
    if (typeof super._postRender === 'function') super._postRender();
    this._applyActiveTab();
    attachSheetListeners(this, (e) => dropItemOnSheet(this, e));
  }

  _applyActiveTab() {
    const root = this.element;
    if (!root) return;
    const tab = this._activeTab || 'overview';
    root.querySelectorAll('.sdr-ocult-tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    root.querySelectorAll('[data-tab-content]').forEach((panel) => {
      panel.style.display = panel.dataset.tabContent === tab ? '' : 'none';
    });
  }

  async _prepareContext() {
    const context = await super._prepareContext();
    const L = await getSheetLang();
    const T = L.sheet || {};
    const row = await preparedClone(this);
    const sd = row?.systemData || {};
    const items = itemsArray(row?.items);
    const determination = isDeterminationOn();

    const str = (obj, key, fb) => obj?.[key] ?? fb ?? key;
    const attrName = (k) => str(L.attributes, k, k);
    const skillName = (k) => str(L.skills, k, k);
    const gradeName = (g) => str(L.grades, g, g);

    const attributes = ATTRIBUTE_KEYS.map((k) => ({
      key: k,
      abbr: k.toUpperCase(),
      label: attrName(k),
      value: num(sd.attributes?.[k]?.value),
    }));

    const attrOptionsFor = (current) => ATTRIBUTE_KEYS.map((k) => ({
      value: k, label: k.toUpperCase(), selected: current === k,
    }));

    const skills = SKILL_KEYS.map((k) => {
      const e = sd.skills?.[k] || {};
      const grade = e.grade || 'untrained';
      const flat = skillGradeBonus(grade) + num(e.bonus);
      return {
        key: k,
        label: skillName(k),
        grade,
        attr: e.attribute || '',
        attrAbbr: (e.attribute || '').toUpperCase(),
        total: fmtBonus(flat),
        // Dice pool shown next to the flat bonus: attribute value = number of d20s.
        dice: (() => {
          const key = e.attribute || SKILL_ATTRIBUTE[k];
          const d = testDice(num(sd.attributes?.[key]?.value));
          return d.replace('d20kh1', 'd20').replace('2d20kl1', '2d20↓');
        })(),
        trained: grade !== 'untrained',
        gradeOptions: SKILL_GRADES.map((g) => ({
          value: g, label: gradeName(g), selected: grade === g,
        })),
        attrOptions: [{ value: '', label: '—', selected: !e.attribute }, ...attrOptionsFor(e.attribute)],
      };
    });

    const res = (k) => {
      const r = sd.resources?.[k] || {};
      return { value: num(r.value), max: num(r.max), pct: pct(r.value, r.max) };
    };

    const origin = firstEmbedded(items, 'origin');
    const cls = firstEmbedded(items, 'class');
    const trail = firstEmbedded(items, 'trail');
    const slot = (it) => it ? { id: it.id, name: it.name } : { id: null, name: '—' };

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

    const protections = embeddedByType(items, 'protection').map((p) => {
      const d = p.systemData || p.system || p.data || {};
      return { id: p.id, name: p.name, bonus: fmtBonus(num(d.defenseBonus)) };
    });

    const ritualsByCircle = [1, 2, 3, 4].map((c) => ({
      circle: c,
      items: embeddedByType(items, 'ritual')
        .filter((r) => num((r.systemData || r.system || r.data || {}).circle) === c)
        .map((r) => {
          const d = r.systemData || r.system || r.data || {};
          return {
            id: r.id, name: r.name,
            element: ELEMENT_LABELS[d.element] || d.element || '—',
            cost: num(d.cost),
            hasDamage: !!((d.damage || '').trim()),
          };
        }),
    })).filter((g) => g.items.length > 0);

    const powers = embeddedByType(items, 'power').map((p) => {
      const d = p.systemData || p.system || p.data || {};
      return { id: p.id, name: p.name, cost: num(d.cost), requirement: d.requirement || '' };
    });

    const gearCats = [];
    for (const g of embeddedByType(items, 'gear')) {
      const d = g.systemData || g.system || g.data || {};
      const cat = d.category || (T.inventory?.uncategorized || '—');
      let bucket = gearCats.find((b) => b.category === cat);
      if (!bucket) { bucket = { category: cat, items: [] }; gearCats.push(bucket); }
      bucket.items.push({ id: g.id, name: g.name, quantity: num(d.quantity) || 1 });
    }

    const tabs = ['overview', 'combat', 'rituals', 'powers', 'inventory', 'notes'].map((id) => ({
      id, label: T.tabs?.[id] || id, active: (this._activeTab || 'overview') === id,
    }));

    return {
      ...context,
      L, T,
      name: (row?.name && row.name !== 'undefined') ? row.name : '',
      nex: num(sd.nex?.value),
      nexPct: Math.max(0, Math.min(100, Math.round((num(sd.nex?.value) / 99) * 100))),
      avatarUrl: this.document?.avatarUrl || '',
      attributes,
      pv: res('pv'), pe: res('pe'), san: res('san'),
      useDetermination: determination,
      det: { value: num(sd.determination?.value), max: num(sd.determination?.max), pct: pct(sd.determination?.value, sd.determination?.max) },
      defense: { value: num(sd.defense?.value), protection: num(sd.defense?.protection), bonus: num(sd.defense?.bonus) },
      peLimit: { value: num(sd.peLimit?.value), override: num(sd.peLimit?.override) },
      origin: slot(origin), class: slot(cls), trail: slot(trail),
      skills, tabs, weapons, protections, ritualsByCircle, powers, gearCats,
      notes: sd.notes || '',
      legalNotice: L.legal?.communityNotice || '',
    };
  }

  onAction(action, id, target) {
    if (action === 'tab') {
      const tab = target?.dataset?.tab;
      if (!tab) return;
      this._activeTab = tab;
      this._applyActiveTab();
      return;
    }
    if (action === 'roll-attribute') {
      if (target?.dataset?.key) void rollAttribute(this.document, target.dataset.key);
      return;
    }
    if (action === 'roll-skill') {
      if (target?.dataset?.key) void rollSkill(this.document, target.dataset.key);
      return;
    }
    if (action === 'roll-initiative') {
      void rollInitiative(this.document);
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
    if (action === 'roll-ritual-damage') {
      const item = itemsArray(this.document?.items).find((i) => i.id === id);
      if (item) void rollRitualDamage(this.document, item);
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
