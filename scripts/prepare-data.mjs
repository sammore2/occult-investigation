// SDR_OCULT — scripts/prepare-data.mjs
// Derived-data pass: merge defaults, then compute defense, NEX steps,
// per-turn PE limit and resource maxima via rules.mjs. Same two-export
// shape as the reference (prepareActorRow + fetchPreparedActor).

import { mergeDefaults } from './utils.mjs';
import { getDefaultData } from './schema.mjs';
import { calcDefense, nexSteps, peLimitPerTurn, maxPV, maxPE, maxSan } from './rules.mjs';

const num = (v) => Number(v) || 0;

function clampResource(res, max) {
  res.max = max;
  res.value = Math.min(Math.max(num(res.value), 0), Math.max(max, 0));
  return res;
}

export function prepareActorRow(row) {
  const sd = row?.systemData;
  if (!sd) return row;
  mergeDefaults(sd, getDefaultData(row.type));
  if (row.type !== 'character' && row.type !== 'npc') return row;

  const agi = num(sd.attributes?.agi?.value);
  const vig = num(sd.attributes?.vig?.value);
  const pre = num(sd.attributes?.pre?.value);
  const nex = num(sd.nex?.value);

  // Defense is always recomputed.
  sd.defense.value = calcDefense({
    agi,
    protection: num(sd.defense?.protection),
    bonus: num(sd.defense?.bonus),
  });

  const steps = nexSteps(nex);
  sd.nexSteps = steps;

  // Per-turn PE limit: manual override wins when > 0, else derived.
  const override = num(sd.peLimit?.override);
  sd.peLimit.value = override > 0 ? override : peLimitPerTurn(nex);

  // Class numbers come from the first embedded class item (filled by the GM).
  // Without one, saved maxima stay as-is (editable directly).
  const items = Array.isArray(row.items) ? row.items : [];
  const cls = items.find((i) => i?.type === 'class')?.systemData || null;
  if (cls) {
    sd.resources.pv = clampResource(sd.resources.pv, maxPV({
      pvBase: num(cls.pvBase), vig, steps,
      pvPerNex: num(cls.pvPerNex), bonus: num(sd.resources.pv?.bonus),
    }));
    sd.resources.pe = clampResource(sd.resources.pe, maxPE({
      peBase: num(cls.peBase), pre, steps,
      pePerNex: num(cls.pePerNex), bonus: num(sd.resources.pe?.bonus),
    }));
    sd.resources.san = clampResource(sd.resources.san, maxSan({
      sanBase: num(cls.sanBase), steps,
      sanPerNex: num(cls.sanPerNex), bonus: num(sd.resources.san?.bonus),
    }));
  } else {
    for (const k of ['pv', 'pe', 'san']) {
      const res = sd.resources[k];
      res.value = Math.min(Math.max(num(res.value), 0), Math.max(num(res.max), 0));
    }
  }

  return row;
}

// Fetches an actor WITH its embedded items (the API only includes them with
// ?populate=true) and runs the derived-data pass on a clone.
export async function fetchPreparedActor(id) {
  const { api } = await import('/_loom/sdk/index.js');
  const raw = await api.get(`/actors/${id}?populate=true`);
  if (!raw) return null;
  const row = JSON.parse(JSON.stringify(raw));
  row.items = raw.items || [];
  return prepareActorRow(row);
}
