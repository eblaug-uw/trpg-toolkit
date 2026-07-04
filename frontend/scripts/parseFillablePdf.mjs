import { PDFDocument } from 'pdf-lib';
import fs from 'node:fs/promises';
import path from 'node:path';
import { TEXT_FIELD_MAP, IGNORED_FIELDS } from './pdfFieldMap.js';

// ── CLI ──────────────────────────────────────────────────
const args = process.argv.slice(2);
const pdfPath = args[0];
const outDir = args.includes('--out')
  ? args[args.indexOf('--out') + 1]
  : path.join(path.dirname(pdfPath), 'output');

if (!pdfPath) {
  console.error('Usage: parseFillablePdf.mjs <path/to/sheet.pdf> [--out <dir>]');
  process.exit(1);
}

// ── Coercion ─────────────────────────────────────────────
const toInt = (v) => {
  if (v == null || v === '') return null;
  const n = parseInt(String(v).replace(/[^\d-]/g, ''), 10);
  return Number.isNaN(n) ? null : n;
};
const toStr = (v) => (v == null ? null : String(v).trim() || null);
const toBool = (v) => {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return ['true','yes','y','1','x','checked'].includes(s) || s.length > 0;
};

const INT_COLUMNS = new Set([
  'character.experience_points','character.proficiency_bonus',
  'character.armor_class','character.initiative',
  'character.hit_points_max','character.hit_points','character.temp_hp',
  'character.hit_dice','character.hit_dice_current',
  'abilities.strength','abilities.dexterity','abilities.constitution',
  'abilities.intelligence','abilities.wisdom','abilities.charisma',
  'speed.walk','appearance.age',
  'currency.cp','currency.sp','currency.ep','currency.gp','currency.pp',
  'spell_slots.level_1_total','spell_slots.level_2_total','spell_slots.level_3_total',
  'spell_slots.level_4_total','spell_slots.level_5_total','spell_slots.level_6_total',
  'spell_slots.level_7_total','spell_slots.level_8_total','spell_slots.level_9_total',
  'spell_slots.level_1','spell_slots.level_2','spell_slots.level_3',
  'spell_slots.level_4','spell_slots.level_5','spell_slots.level_6',
  'spell_slots.level_7','spell_slots.level_8','spell_slots.level_9',
  'attacks[0].attack_bonus','attacks[1].attack_bonus','attacks[2].attack_bonus',
]);
const BOOL_COLUMNS = new Set(['character.inspiration']);

// ── Read fields ──────────────────────────────────────────
const bytes = await fs.readFile(pdfPath);
const doc = await PDFDocument.load(bytes);
const form = doc.getForm();
const fields = form.getFields();

const raw = {};
for (const f of fields) {
  const name = f.getName();
  if (IGNORED_FIELDS.includes(name)) continue;
  const type = f.constructor.name;
  let value = null;
  try {
    if (type === 'PDFTextField')      value = f.getText() ?? null;
    else if (type === 'PDFCheckBox')  value = f.isChecked();
    else if (type === 'PDFDropdown')  value = f.getSelected();
    else if (type === 'PDFRadioGroup') value = f.getSelected();
  } catch { value = null; }
  raw[name] = value;
}

// ── Build normalized object ──────────────────────────────
const character = {
  character: {}, abilities: {}, skills: {}, speed: {},
  currency: {}, spell_slots: {}, personality: {}, appearance: {},
  actions: [], attacks: [], inventory: [], spells: [], features_traits: [],
};

function assign(target, path, value) {
  const parts = path.split('.');
  let cur = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const seg = parts[i];
    const m = seg.match(/^(\w+)\[(\d+)\]$/);
    if (m) {
      const [, key, idx] = m;
      cur[key] = cur[key] || [];
      cur[key][+idx] = cur[key][+idx] || {};
      cur = cur[key][+idx];
    } else {
      cur[seg] = cur[seg] || {};
      cur = cur[seg];
    }
  }
  cur[parts[parts.length - 1]] = value;
}

for (const [pdfField, dottedPath] of Object.entries(TEXT_FIELD_MAP)) {
  if (!(pdfField in raw)) continue;
  let value = raw[pdfField];
  if (INT_COLUMNS.has(dottedPath))       value = toInt(value);
  else if (BOOL_COLUMNS.has(dottedPath)) value = toBool(value);
  else                                    value = toStr(value);
  assign(character, dottedPath, value);
}

// ClassLevel split: "Fighter 3" → class=["Fighter"], level=3
const clRaw = character.character.class_level_raw;
if (clRaw) {
  const m = clRaw.match(/^(.+?)\s+(\d+)\s*$/);
  if (m) {
    character.character.class = [m[1].trim()];
    character.character.level = parseInt(m[2], 10);
  } else {
    character.character.class = [clRaw];
    character.character.level = null;
  }
  delete character.character.class_level_raw;
}

// Drop empty attack rows
character.attacks = character.attacks.filter(
  (a) => a && (a.name || a.attack_bonus != null || a.damage)
);

// Spells: group by level using SlotsTotal markers in document order
const fieldOrder = fields.map((f) => f.getName());
const spellFields = fieldOrder.filter((n) => /^Spells \d+$/.test(n));
const slotMarkers = fieldOrder.filter((n) => /^SlotsTotal \d+$/.test(n));

// 0 markers before this field = cantrip (level 0); N markers before = level N
const spellLevelByField = {};
let markerIdx = 0;
for (const name of fieldOrder) {
  if (slotMarkers[markerIdx] === name) markerIdx++;
  if (/^Spells \d+$/.test(name)) spellLevelByField[name] = markerIdx;
}

for (const fname of spellFields) {
  const value = toStr(raw[fname]);
  if (!value) continue;
  character.spells.push({
    name: value,
    level: spellLevelByField[fname] ?? 0,
    prepared: null,   // depends on checkbox mapping decision
    school: null,
    notes: null,
  });
}

// Tidy: drop 1:1 sub-objects that are entirely null
for (const key of ['speed','currency','spell_slots','personality','appearance','abilities','skills']) {
  const obj = character[key];
  if (obj && Object.values(obj).every((v) => v == null)) delete character[key];
}

// ── Write outputs ────────────────────────────────────────
await fs.mkdir(outDir, { recursive: true });
const stem = path.basename(pdfPath, path.extname(pdfPath));
const rawOut  = path.join(outDir, `${stem}.raw.json`);
const normOut = path.join(outDir, `${stem}.normalized.json`);
await fs.writeFile(rawOut,  JSON.stringify(raw,       null, 2));
await fs.writeFile(normOut, JSON.stringify(character, null, 2));
console.log(`Raw fields written:        ${rawOut}  (${Object.keys(raw).length} fields)`);
console.log(`Normalized character JSON: ${normOut}`);