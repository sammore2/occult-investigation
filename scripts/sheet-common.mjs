// SDR_OCULT — scripts/sheet-common.mjs
// Shared helpers for the three handoff-03 sheets (character, npc, item).
// Shape mirrors the engine reference sheet: debounced save of `sd:` fields,
// delegated data-action routing (done by the Loom base class), item drop,
// and focus-preserving reload (anti-blur rule from 03-COMUM).

import { setPathValue } from './utils.mjs';
import { getDefaultData } from './schema.mjs';

const LANG_BASE = '/marketplace/rulesets/sdr-ocult/lang';
const langCache = {};

function detectLocale() {
  try {
    const l = window.Loom?.language || window.Loom?.settings?.get('core', 'language');
    if (typeof l === 'string' && l.toLowerCase().startsWith('pt')) return 'pt-BR';
  } catch { /* fall through */ }
  try {
    if (typeof navigator?.language === 'string' && navigator.language.toLowerCase().startsWith('pt')) return 'pt-BR';
  } catch { /* fall through */ }
  return 'en';
}

/** Sheet strings from the ruleset lang files (pt-BR default). Cached per locale. */
export async function getSheetLang() {
  const locale = detectLocale();
  if (langCache[locale]) return langCache[locale];
  try {
    const res = await fetch(`${LANG_BASE}/${locale}.json`);
    if (res.ok) {
      const json = await res.json();
      langCache[locale] = json;
      return json;
    }
  } catch { /* fall through to fallback */ }
  if (langCache['pt-BR']) return langCache['pt-BR'];
  try {
    const res = await fetch(`${LANG_BASE}/pt-BR.json`);
    if (res.ok) {
      langCache['pt-BR'] = await res.json();
      return langCache['pt-BR'];
    }
  } catch { /* no lang available; template guards with {{#if}} */ }
  return {};
}

export function pct(value, max) {
  const v = Number(value) || 0;
  const m = Number(max) || 0;
  if (m <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((v / m) * 100)));
}

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

/** Wire the debounced `sd:` saver onto a sheet (300 ms + pending map, like the reference). */
export function attachSheetSaver(sheet) {
  sheet._pendingFields = new Map();
  sheet._formSaveTimer = null;

  sheet._onChangeForm = function (event) {
    const target = event?.target;
    if (!target || !target.name) return;
    if (target.name !== 'name' && !target.name.startsWith('sd:')) return;
    const value = target.type === 'checkbox' ? target.checked
      : target.type === 'number' ? Number(target.value)
      : target.value;
    sheet._pendingFields.set(target.name, value);
    clearTimeout(sheet._formSaveTimer);
    sheet._formSaveTimer = setTimeout(() => void sheet._flushPendingFields(), 300);
  };

  sheet._flushPendingFields = async function () {
    if (!sheet.document || sheet._pendingFields.size === 0) return;
    const pending = sheet._pendingFields;
    sheet._pendingFields = new Map();
    const sd = sheet.document.systemData || {};
    let name;
    for (const [key, value] of pending) {
      if (key === 'name') { name = value; continue; }
      const path = key.slice(3);
      const current = getPath(sd, path);
      // Array-shaped fields (origin.trainedSkills, trail.nexUnlocks) render
      // as comma-separated text; parse them back so the save round-trips.
      const parsed = Array.isArray(current) && typeof value === 'string'
        ? value.split(',').map((s) => s.trim()).filter(Boolean)
        : value;
      setPathValue(sd, path, parsed);
    }
    const submitData = { systemData: sd };
    if (name !== undefined) submitData.name = name;
    const { api } = await import('/_loom/sdk/index.js');
    await api.put(`${sheet.apiRoute}/${sheet.document.id}`, submitData);
    await reloadKeepFocus(sheet);
  };
}

/** Re-render preserving the focused field (name) with the cursor at the end. */
export async function reloadKeepFocus(sheet) {
  const active = document.activeElement;
  const name = active?.getAttribute?.('name') || null;
  if (typeof sheet._reloadDocument === 'function') await sheet._reloadDocument();
  else if (typeof sheet.render === 'function') await sheet.render(true);
  if (!name || !sheet.element) return;
  try {
    const el = sheet.element.querySelector(`[name="${name.replace(/"/g, '\\"')}"]`);
    if (!el) return;
    el.focus();
    if (typeof el.setSelectionRange === 'function' && typeof el.value === 'string') {
      el.setSelectionRange(el.value.length, el.value.length);
    }
  } catch { /* focus restore is best-effort */ }
}

/** Attach change-save + compendium/sidebar drop once (guarded, like the reference). */
export function attachSheetListeners(sheet, onDrop) {
  if (!sheet.element || sheet._ocultListeners) return;
  sheet._ocultListeners = true;
  sheet.element.addEventListener('change', (e) => {
    if (typeof sheet._onChangeForm === 'function') sheet._onChangeForm(e);
  });
  sheet.element.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  });
  sheet.element.addEventListener('drop', (e) => void onDrop(e));
}

/** Drop payload reader (same contract as the reference npc sheet). */
export function readDropData(event) {
  try {
    const raw = event.dataTransfer?.getData('application/json') || event.dataTransfer?.getData('text/plain');
    if (raw) return JSON.parse(raw);
  } catch { /* not a Loom payload */ }
  return null;
}

/** Generic embedded-item drop: clones the source item onto this actor. */
export async function dropItemOnSheet(sheet, event) {
  event.preventDefault();
  if (!sheet.document) return;
  const data = readDropData(event);
  if (!data) return;
  const itemId = data.id || data.itemId;
  if (!itemId && !data.data) return;
  try {
    const { api } = await import('/_loom/sdk/index.js');
    let source = data.data;
    if (!source && itemId) source = await api.get(`/items/${itemId}`);
    if (!source) return;
    const itemType = source.type || 'gear';
    await api.post('/items', {
      worldId: window.Loom?.world?.id || sheet.document.worldId,
      name: source.name,
      type: itemType,
      imgUrl: source.imgUrl || source.img || '',
      data: source.system || source.data || getDefaultData(itemType),
      actorId: sheet.document.id,
    });
    await reloadKeepFocus(sheet);
  } catch (err) {
    console.error('[sdr-ocult] drop failed:', err);
  }
}

export async function openEmbeddedItem(sheet, itemId, ItemSheetClass) {
  if (!itemId || !ItemSheetClass) return;
  const { windowManager } = await import('/_loom/sdk/index.js');
  windowManager.open(`item-sheet-${itemId}`, ItemSheetClass, { itemId });
}

export async function deleteEmbeddedItem(sheet, itemId) {
  if (!itemId) return;
  const { api } = await import('/_loom/sdk/index.js');
  await api.delete(`/items/${itemId}`);
  await reloadKeepFocus(sheet);
}

export async function createEmbeddedItem(sheet, type) {
  if (!sheet.document || !type) return;
  const { api } = await import('/_loom/sdk/index.js');
  await api.post('/items', {
    worldId: window.Loom?.world?.id || sheet.document.worldId,
    name: type,
    type,
    data: getDefaultData(type),
    actorId: sheet.document.id,
  });
  await reloadKeepFocus(sheet);
}

/** Stepper for PV/PE/SAN/Determination, clamped to [0, max]. */
export async function applyResourceDelta(sheet, key, delta) {
  if (!sheet.document || !key || !delta) return;
  const { api } = await import('/_loom/sdk/index.js');
  const sd = sheet.document.systemData || {};
  const det = key === 'determination';
  const res = det ? sd.determination : sd.resources?.[key];
  if (!res) return;
  const max = Math.max(Number(res.max) || 0, 0);
  res.value = Math.min(Math.max((Number(res.value) || 0) + delta, 0), max);
  await api.put(`${sheet.apiRoute}/${sheet.document.id}`, { systemData: sd });
  await reloadKeepFocus(sheet);
}

// The engine exposes actor.items as a collection-like object, not an array.
export function itemsArray(items) {
  if (Array.isArray(items)) return items;
  if (Array.isArray(items?.contents)) return items.contents;
  return [];
}

/** Deep clone of the actor document with the derived-data pass applied. */
export async function preparedClone(sheet) {
  const { prepareActorRow } = await import('./prepare-data.mjs');
  const row = JSON.parse(JSON.stringify({
    ...sheet.document,
    items: itemsArray(sheet.document?.items),
  }));
  return prepareActorRow(row);
}

export function embeddedByType(items, type) {
  return itemsArray(items).filter((i) => i?.type === type);
}

export function firstEmbedded(items, type) {
  return embeddedByType(items, type)[0] || null;
}
