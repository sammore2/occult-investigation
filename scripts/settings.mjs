// SDR_OCULT — scripts/settings.mjs
// Optional rules. Same register/get shape as the reference settings module.

export const SDR_OCULT_SETTINGS = [
  {
    key: 'useDetermination',
    name: 'Usar Determinação',
    hint: 'Quando ligada, o ator usa Determinação no lugar de PE e Sanidade. O máximo da Determinação é editável (sem fórmula).',
    scope: 'world',
    type: Boolean,
    default: false,
  },
];

export function registerSettings() {
  if (!window.Loom?.settings?.register) return;
  for (const s of SDR_OCULT_SETTINGS) {
    try {
      window.Loom.settings.register('sdr-ocult', s.key, {
        name: s.name,
        hint: s.hint,
        scope: s.scope,
        config: true,
        type: s.type,
        default: s.default,
        choices: s.choices,
      });
    } catch {
      // Already registered via manifest or a previous call
    }
  }
}

export function getSetting(key, fallback = undefined) {
  try {
    const val = window.Loom?.settings?.get('sdr-ocult', key);
    return val !== undefined ? val : fallback;
  } catch {
    return fallback;
  }
}

/** Sheet helper: true when the table plays with Determination instead of PE/Sanity. */
export function isDeterminationOn() {
  return getSetting('useDetermination', false) === true;
}
