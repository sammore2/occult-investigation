// SDR_OCULT — scripts/config.mjs
// Shared constants: attribute keys, skill table, grades, elements,
// conditions, item-type maps. Pure data, no imports.

export const SYSTEM_ID = 'sdr-ocult';

export const ATTRIBUTE_KEYS = ['agi', 'for', 'int', 'pre', 'vig'];

export const ATTRIBUTE_LABELS = {
  agi: 'Agilidade', for: 'Força', int: 'Intelecto', pre: 'Presença', vig: 'Vigor',
};

// Default attribute per skill; each actor can override it per skill.
export const SKILL_ATTRIBUTE = {
  acrobacia: 'agi', adestramento: 'pre', artes: 'pre', atletismo: 'for',
  atualidades: 'int', ciencias: 'int', crime: 'agi', diplomacia: 'pre',
  enganacao: 'pre', fortitude: 'vig', furtividade: 'agi', iniciativa: 'agi',
  intimidacao: 'pre', intuicao: 'pre', investigacao: 'int', luta: 'for',
  medicina: 'int', ocultismo: 'int', percepcao: 'pre', pilotagem: 'agi',
  pontaria: 'agi', profissao: 'int', reflexos: 'agi', religiao: 'pre',
  sobrevivencia: 'int', tatica: 'int', tecnologia: 'int', vontade: 'pre',
};

export const SKILL_KEYS = Object.keys(SKILL_ATTRIBUTE);

export const SKILL_GRADES = ['untrained', 'trained', 'veteran', 'expert'];

export const SKILL_GRADE_BONUS = { untrained: 0, trained: 5, veteran: 10, expert: 15 };

export const ELEMENTS = ['sangue', 'morte', 'conhecimento', 'energia', 'medo'];

export const ELEMENT_LABELS = {
  sangue: 'Sangue', morte: 'Morte', conhecimento: 'Conhecimento',
  energia: 'Energia', medo: 'Medo',
};

// Identifier + label only, no rule text. Same object shape as the reference
// CONDITIONS list ({ id, label }) plus a generic marker icon and color.
export const CONDITIONS = [
  { id: 'abalado', label: 'Abalado', icon: 'fa-solid fa-heart-crack', color: 0x8e44ad },
  { id: 'agarrado', label: 'Agarrado', icon: 'fa-solid fa-hand', color: 0x795548 },
  { id: 'apavorado', label: 'Apavorado', icon: 'fa-solid fa-ghost', color: 0x9b59b6 },
  { id: 'atordoado', label: 'Atordoado', icon: 'fa-solid fa-star', color: 0xffc107 },
  { id: 'caido', label: 'Caído', icon: 'fa-solid fa-person-falling', color: 0x607d8b },
  { id: 'cego', label: 'Cego', icon: 'fa-solid fa-eye-slash', color: 0x424242 },
  { id: 'confuso', label: 'Confuso', icon: 'fa-solid fa-shuffle', color: 0x00bcd4 },
  { id: 'debilitado', label: 'Debilitado', icon: 'fa-solid fa-arrow-trend-down', color: 0x78909c },
  { id: 'desprevenido', label: 'Desprevenido', icon: 'fa-solid fa-triangle-exclamation', color: 0xff9800 },
  { id: 'enjoado', label: 'Enjoado', icon: 'fa-solid fa-face-dizzy', color: 0x8bc34a },
  { id: 'enlouquecendo', label: 'Enlouquecendo', icon: 'fa-solid fa-brain', color: 0xe91e63 },
  { id: 'enredado', label: 'Enredado', icon: 'fa-solid fa-network-wired', color: 0x4caf50 },
  { id: 'exausto', label: 'Exausto', icon: 'fa-solid fa-battery-empty', color: 0x616161 },
  { id: 'fatigado', label: 'Fatigado', icon: 'fa-solid fa-battery-quarter', color: 0x9e9e9e },
  { id: 'fraco', label: 'Fraco', icon: 'fa-solid fa-minus', color: 0xbdbdbd },
  { id: 'imovel', label: 'Imóvel', icon: 'fa-solid fa-ban', color: 0xf44336 },
  { id: 'inconsciente', label: 'Inconsciente', icon: 'fa-solid fa-moon', color: 0x1a1614 },
  { id: 'lento', label: 'Lento', icon: 'fa-solid fa-turtle', color: 0x689f38 },
  { id: 'morrendo', label: 'Morrendo', icon: 'fa-solid fa-heart-pulse', color: 0xd32f2f },
  { id: 'ofuscado', label: 'Ofuscado', icon: 'fa-solid fa-sun', color: 0xffeb3b },
  { id: 'paralisado', label: 'Paralisado', icon: 'fa-solid fa-pause', color: 0x3f51b5 },
  { id: 'pasmo', label: 'Pasmo', icon: 'fa-solid fa-face-surprise', color: 0x03a9f4 },
  { id: 'sangrando', label: 'Sangrando', icon: 'fa-solid fa-droplet', color: 0xc62828 },
  { id: 'surdo', label: 'Surdo', icon: 'fa-solid fa-ear-deaf', color: 0x8a8a8a },
  { id: 'surpreendido', label: 'Surpreendido', icon: 'fa-solid fa-bolt', color: 0xffc107 },
  { id: 'vulneravel', label: 'Vulnerável', icon: 'fa-solid fa-crosshairs', color: 0xff5722 },
];

export const ITEM_TYPE_ICON = {
  origin: '🌱', class: '📜', trail: '🛤️', power: '⚡',
  ritual: '🕯️', weapon: '🗡️', protection: '🛡️', gear: '🎒',
};

export const ITEM_TYPE_LABEL = {
  origin: 'Origins', class: 'Classes', trail: 'Trails', power: 'Powers',
  ritual: 'Rituals', weapon: 'Weapons', protection: 'Protection', gear: 'Gear',
};

export const ITEM_TYPE_SINGULAR = {
  origin: 'Origin', class: 'Class', trail: 'Trail', power: 'Power',
  ritual: 'Ritual', weapon: 'Weapon', protection: 'Protection', gear: 'Gear',
};

export const ACTOR_TYPE_LABEL = { character: 'Character', npc: 'NPC' };
