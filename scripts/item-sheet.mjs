// SDR_OCULT — scripts/item-sheet.mjs
// Single item sheet for all eight item types, in the character sheet's
// "dossiê de campo" visual language (.oc-file/.oc-card/.oc-tag under
// .ocult-ui). Same save shape as the actor sheets; type-specific fields
// render in two columns under a tag row (element / circle / cost for
// rituals and powers). Details/Description tabs mirror the character tabs.

import { LoomHandlebarsMixin, LoomItemSheet } from '/_loom/sdk/index.js';
import { ELEMENTS, ITEM_TYPE_ICON } from './config.mjs';
import {
  getSheetLang, attachSheetSaver, attachSheetListeners, reloadKeepFocus,
} from './sheet-common.mjs';

const num = (v) => Number(v) || 0;

function joinCsv(v) {
  return Array.isArray(v) ? v.join(', ') : (v ?? '');
}

export class SdrOcultItemSheet extends LoomHandlebarsMixin(LoomItemSheet) {
  static DEFAULT_OPTIONS = { position: { width: 460, height: 560 } };

  _activeTab = 'details';

  constructor(props) {
    super({
      ...props,
      id: props.id || `item-sheet-${props.itemId}`,
      documentId: props.itemId,
      title: (props.title && props.title !== 'undefined') ? props.title : 'SDR OCULT',
      showFooter: false,
      resizable: true,
      classes: ['sdr-ocult-sheet', 'sdr-ocult-item-sheet', 'ocult-ui'],
    });
    attachSheetSaver(this);
  }

  get dataKey() { return 'data'; }
  get documentName() { return 'item'; }
  get apiRoute() { return '/items'; }

  static PARTS = { main: { template: '/marketplace/rulesets/sdr-ocult/templates/item-sheet.hbs' } };

  async mount() {
    await super.mount();
    this._applyActiveTab();
    attachSheetListeners(this, (e) => e.preventDefault());
  }

  _postRender() {
    if (typeof super._postRender === 'function') super._postRender();
    this._applyActiveTab();
    attachSheetListeners(this, (e) => e.preventDefault());
  }

  _applyActiveTab() {
    const root = this.element;
    if (!root) return;
    const tab = this._activeTab || 'details';
    root.querySelectorAll('.sdr-ocult-tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    root.querySelectorAll('[data-tab-content]').forEach((panel) => {
      panel.style.display = panel.dataset.tabContent === tab ? '' : 'none';
    });
  }

  onAction(action, id, target) {
    if (action === 'tab') {
      const tab = target?.dataset?.tab;
      if (!tab) return;
      this._activeTab = tab;
      this._applyActiveTab();
      return;
    }
    if (action === 'pick-icon') {
      void this._pickIcon();
      return;
    }
    if (typeof super.onAction === 'function') super.onAction(action, id, target);
  }

  async _pickIcon() {
    if (!this.document) return;
    try {
      const FilePicker = window.Loom?.applications?.apps?.FilePicker?.implementation;
      if (!FilePicker) return;
      const path = await new FilePicker({ type: 'image', current: this.document.imgUrl || '' }).browse();
      if (!path) return;
      const { api } = await import('/_loom/sdk/index.js');
      await api.put(`${this.apiRoute}/${this.document.id}`, { imgUrl: path });
      await reloadKeepFocus(this);
    } catch { /* picker is best-effort */ }
  }

  async _prepareContext() {
    const context = await super._prepareContext();
    const L = await getSheetLang();
    const T = L.sheet || {};
    const type = this.document?.type || 'gear';
    const d = this.document?.data || {};
    const str = (obj, key, fb) => obj?.[key] ?? fb ?? key;

    const isRitual = type === 'ritual';
    const isPower = type === 'power';
    const tags = [];
    if (isRitual || isPower) {
      if (d.element) tags.push(str(L.elements, d.element, d.element));
      if (isRitual) tags.push(`${T.circle || 'Circle'} ${num(d.circle) || 1}`);
      if (num(d.cost)) tags.push(`${T.cost || 'Cost'} ${num(d.cost)}`);
    }

    const elementOptions = ELEMENTS.map((e) => ({
      value: e, label: str(L.elements, e, e), selected: d.element === e,
    }));
    const circleOptions = [1, 2, 3, 4].map((c) => ({
      value: c, label: `${c}`, selected: num(d.circle) === c,
    }));
    const skillOptions = ['luta', 'pontaria'].map((s) => ({
      value: s, label: str(L.skills, s, s), selected: d.skill === s,
    }));

    return {
      ...context,
      L, T,
      name: (this.document?.name && this.document.name !== 'undefined') ? this.document.name : '',
      typeLabel: str(L.itemTypes, type, type),
      imgUrl: this.document?.imgUrl || this.document?.img || '',
      icon: ITEM_TYPE_ICON[type] || '📦',
      tabs: ['details', 'description'].map((tid) => ({
        id: tid,
        label: tid === 'details' ? (T.details || tid) : (T.description || tid),
        active: (this._activeTab || 'details') === tid,
      })),
      tags,
      isOrigin: type === 'origin',
      isClass: type === 'class',
      isTrail: type === 'trail',
      isPower,
      isRitual,
      isWeapon: type === 'weapon',
      isProtection: type === 'protection',
      isGear: type === 'gear',
      // origin
      trainedSkills: joinCsv(d.trainedSkills),
      originPower: d.power || '',
      // class
      pvBase: num(d.pvBase), pvPerNex: num(d.pvPerNex),
      peBase: num(d.peBase), pePerNex: num(d.pePerNex),
      sanBase: num(d.sanBase), sanPerNex: num(d.sanPerNex),
      trainedSkillsCount: num(d.trainedSkillsCount),
      // trail
      trailClass: d.class || '',
      nexUnlocks: joinCsv(d.nexUnlocks),
      // power + ritual
      requirement: d.requirement || '',
      elementOptions, circleOptions,
      cost: num(d.cost),
      execution: d.execution || '', range: d.range || '', target: d.target || '',
      duration: d.duration || '', resistance: d.resistance || '',
      damage: d.damage || '',
      // weapon
      damageType: d.damageType || '',
      critThreshold: num(d.critThreshold) || 20,
      critMultiplier: num(d.critMultiplier) || 2,
      skillOptions,
      weaponRange: d.range || '', category: d.category || '',
      // protection
      defenseBonus: num(d.defenseBonus),
      // gear
      quantity: num(d.quantity) || 1, space: num(d.space),
      description: d.description || '',
      legalNotice: L.legal?.communityNotice || '',
    };
  }
}
