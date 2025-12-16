// Attorney Commission Calculator Server (Azure AI Foundry)
// Serves a single-page UI and exposes two AI-backed calculation endpoints.

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs/promises');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

const DATA_DIR = path.join(__dirname, 'data');
const RULES_PATH = path.join(DATA_DIR, 'rules.txt');

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readRulesText() {
  try {
    return await fs.readFile(RULES_PATH, 'utf8');
  } catch {
    return '';
  }
}

async function writeRulesText(rulesText) {
  await ensureDataDir();
  await fs.writeFile(RULES_PATH, String(rulesText || ''), 'utf8');
}

function normalizeName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function mustBeFiniteNumber(n, fieldName) {
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    const err = new Error(`${fieldName} must be a finite number`);
    err.statusCode = 400;
    throw err;
  }
}

function extractJsonObject(text) {
  const s = String(text || '');
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) {
    const err = new Error('Model response did not contain JSON');
    err.statusCode = 502;
    throw err;
  }
  const jsonText = s.slice(first, last + 1);
  try {
    return JSON.parse(jsonText);
  } catch {
    const err = new Error('Failed to parse JSON from model response');
    err.statusCode = 502;
    throw err;
  }
}

async function callChatModel({ system, user, temperature = 0 }) {
  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];

  // Preferred: Azure OpenAI endpoint + deployment + api key
  // AZURE_OPENAI_ENDPOINT=https://{resource}.openai.azure.com
  // AZURE_OPENAI_API_KEY=...
  // AZURE_OPENAI_DEPLOYMENT=...
  if (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_DEPLOYMENT) {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT.replace(/\/$/, '');
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21';

    const url = `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({ messages, temperature, max_tokens: 700 }),
    });

    const text = await r.text();
    if (!r.ok) {
      const err = new Error(`Azure OpenAI request failed (${r.status}): ${text.slice(0, 800)}`);
      err.statusCode = 502;
      throw err;
    }

    const data = JSON.parse(text);
    return data?.choices?.[0]?.message?.content ?? '';
  }

  // Fallback: Full Foundry chat-completions URL provided
  // Example: AZURE_AI_FOUNDRY_CHAT_COMPLETIONS_URL=https://.../chat/completions
  if (process.env.AZURE_AI_FOUNDRY_CHAT_COMPLETIONS_URL && process.env.AZURE_AI_FOUNDRY_API_KEY) {
    const url = process.env.AZURE_AI_FOUNDRY_CHAT_COMPLETIONS_URL;
    const apiKey = process.env.AZURE_AI_FOUNDRY_API_KEY;
    const model = process.env.AZURE_AI_FOUNDRY_MODEL;

    const body = {
      messages,
      temperature,
      max_tokens: 700,
      ...(model ? { model } : {}),
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(body),
    });

    const text = await r.text();
    if (!r.ok) {
      const err = new Error(`Azure AI Foundry request failed (${r.status}): ${text.slice(0, 800)}`);
      err.statusCode = 502;
      throw err;
    }

    // OpenAI-compatible responses typically look like: { choices: [ { message: { content } } ] }
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // In case provider returned non-JSON
      return text;
    }

    return data?.choices?.[0]?.message?.content ?? text;
  }

  const err = new Error(
    'Azure model credentials not configured. Set AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_API_KEY + AZURE_OPENAI_DEPLOYMENT. (Optional fallback: AZURE_AI_FOUNDRY_CHAT_COMPLETIONS_URL + AZURE_AI_FOUNDRY_API_KEY.)'
  );
  err.statusCode = 500;
  throw err;
}

function isModelConfigured() {
  return Boolean(
    (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_DEPLOYMENT) ||
      (process.env.AZURE_AI_FOUNDRY_CHAT_COMPLETIONS_URL && process.env.AZURE_AI_FOUNDRY_API_KEY)
  );
}

async function calculateUserPayment({ amount, userName, originatorName, rulesText, context, attorneyDataText }) {
  if (!userName) {
    const err = new Error('User name is required');
    err.statusCode = 400;
    throw err;
  }
  if (!rulesText) {
    const err = new Error('Rules sheet text is required');
    err.statusCode = 400;
    throw err;
  }
  mustBeFiniteNumber(amount, 'amount');
  if (amount < 0) {
    const err = new Error('amount must be >= 0');
    err.statusCode = 400;
    throw err;
  }

  const system =
    'You are AI #1: the user commission calculator. You must follow the provided Rules Sheet exactly. ' +
    'Return ONLY valid JSON (no markdown, no extra text). If the rules are missing/ambiguous, return JSON with error=true and a clear message.';

  const user =
    `RULES SHEET (authoritative):\n${rulesText}\n\n` +
    (attorneyDataText ? `ATTORNEY DATA (reference; may help match rules):\n${attorneyDataText}\n\n` : '') +
    `INPUT:\n` +
    `- amount_usd: ${amount}\n` +
    `- user: ${userName}\n` +
    `- originator: ${originatorName || '(not provided)'}\n` +
    (context ? `- context: ${context}\n` : '') +
    `\nTASK:\n` +
    `1) Select the single best matching rule from the Rules Sheet.\n` +
    `2) Identify the commission percentage for the USER (as a decimal, e.g. 0.35 for 35%).\n` +
    `3) Compute user_payment = amount_usd * percentage.\n` +
    `4) Output JSON with numeric fields as numbers (not strings).\n\n` +
    `OUTPUT JSON SCHEMA:\n` +
    `{
` +
    `  "error": boolean,
` +
    `  "error_message": string | null,
` +
    `  "rule_applied": string,
` +
    `  "percentage": number,
` +
    `  "amount_usd": number,
` +
    `  "user_payment": number,
` +
    `  "calculation": string
` +
    `}`;

  const content = await callChatModel({ system, user, temperature: 0 });
  const out = extractJsonObject(content);

  if (out && out.error) {
    const err = new Error(out.error_message || 'Rules sheet ambiguous');
    err.statusCode = 400;
    throw err;
  }

  const percentage = Number(out.percentage);
  const userPayment = Number(out.user_payment);
  mustBeFiniteNumber(percentage, 'percentage');
  mustBeFiniteNumber(userPayment, 'user_payment');

  return {
    amount_usd: amount,
    user: userName,
    originator: originatorName,
    rule_applied: String(out.rule_applied || ''),
    percentage,
    user_payment: userPayment,
    calculation: String(out.calculation || ''),
  };
}

function calculateOriginatorPaymentDeterministic({ userPayment, ownOriginationPercent }) {
  const pct = ownOriginationPercent / 100;
  const originatorPayment = userPayment * pct;
  return {
    originator_payment: originatorPayment,
    calculation: `${userPayment} * ${pct}`,
  };
}

async function calculateOriginatorPaymentWithAi({ userPayment, ownOriginationPercent, userName, originatorName }) {
  if (!userName || !originatorName) {
    const err = new Error('User name and originator name are required');
    err.statusCode = 400;
    throw err;
  }

  mustBeFiniteNumber(userPayment, 'userPayment');
  mustBeFiniteNumber(ownOriginationPercent, 'ownOriginationPercent');

  if (ownOriginationPercent < 0 || ownOriginationPercent > 100) {
    const err = new Error('ownOriginationPercent must be between 0 and 100');
    err.statusCode = 400;
    throw err;
  }

  const samePerson = normalizeName(userName) === normalizeName(originatorName);
  if (samePerson) {
    return {
      user_payment: userPayment,
      user: userName,
      originator: originatorName,
      own_origination_percent: ownOriginationPercent,
      originator_payment: 0,
      calculation: 'same person => 0',
    };
  }

  const system =
    'You are AI #2: the originator commission calculator. Return ONLY valid JSON (no markdown, no extra text). ' +
    'Compute originator_payment from the provided user_payment and own origination percent.';

  const user =
    `INPUT:\n` +
    `- user_payment_usd: ${userPayment}\n` +
    `- own_origination_other_work_percent: ${ownOriginationPercent}\n` +
    `- user: ${userName}\n` +
    `- originator: ${originatorName}\n\n` +
    `TASK:\n` +
    `Compute originator_payment = user_payment_usd * (own_origination_other_work_percent / 100).\n` +
    `Return JSON with numbers as numbers (not strings).\n\n` +
    `OUTPUT JSON SCHEMA:\n` +
    `{
` +
    `  "originator_payment": number,
` +
    `  "calculation": string
` +
    `}`;

  const content = await callChatModel({ system, user, temperature: 0 });
  const out = extractJsonObject(content);

  const originatorPayment = Number(out.originator_payment);
  mustBeFiniteNumber(originatorPayment, 'originator_payment');

  // Safety: if model drifts, override with deterministic math.
  const deterministic = calculateOriginatorPaymentDeterministic({ userPayment, ownOriginationPercent });
  const delta = Math.abs(originatorPayment - deterministic.originator_payment);
  if (delta > 0.01) {
    return {
      user_payment: userPayment,
      user: userName,
      originator: originatorName,
      own_origination_percent: ownOriginationPercent,
      originator_payment: deterministic.originator_payment,
      calculation: deterministic.calculation,
      warning: 'Model output disagreed with deterministic formula; formula result returned.',
    };
  }

  return {
    user_payment: userPayment,
    user: userName,
    originator: originatorName,
    own_origination_percent: ownOriginationPercent,
    originator_payment: originatorPayment,
    calculation: String(out.calculation || ''),
  };
}

app.get('/api/rules', async (req, res, next) => {
  try {
    const rulesText = await readRulesText();
    res.json({ rulesText });
  } catch (e) {
    next(e);
  }
});

app.post('/api/rules', async (req, res, next) => {
  try {
    const rulesText = String(req.body.rulesText || '');
    await writeRulesText(rulesText);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

function safeJsonStringify(obj, maxLen = 24000) {
  let s;
  try {
    s = JSON.stringify(obj, null, 2);
  } catch {
    s = String(obj ?? '');
  }
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen)}\n... (truncated)`;
}

function compactRowDataForPrompt(row, maxValueLen = 200) {
  const out = {};
  for (const [k, v] of Object.entries(row || {})) {
    let s;
    if (v == null) s = '';
    else if (typeof v === 'string') s = v;
    else {
      try {
        s = JSON.stringify(v);
      } catch {
        s = String(v);
      }
    }
    s = String(s);
    out[k] = s.length > maxValueLen ? `${s.slice(0, maxValueLen)}…` : s;
  }
  return out;
}

app.post('/api/rules/upload', upload.single('rulesFile'), async (req, res, next) => {
  try {
    if (!req.file) {
      const err = new Error('rulesFile is required');
      err.statusCode = 400;
      throw err;
    }
    const rulesText = req.file.buffer.toString('utf8');
    await writeRulesText(rulesText);
    res.json({ ok: true, rulesText });
  } catch (e) {
    next(e);
  }
});

app.post('/api/commission/user', async (req, res, next) => {
  try {
    const amount = Number(req.body.amount);
    const userName = String(req.body.userName || '').trim();
    const originatorName = String(req.body.originatorName || '').trim();
    const rulesTextInput = String(req.body.rulesText || '').trim();
    const context = String(req.body.context || '').trim();
    const attorneyDataText = String(req.body.attorneyDataText || '').trim();

    const rulesText = rulesTextInput || String((await readRulesText()) || '').trim();
    const out = await calculateUserPayment({ amount, userName, originatorName, rulesText, context, attorneyDataText });
    res.json(out);
  } catch (e) {
    next(e);
  }
});

app.post('/api/commission/originator', async (req, res, next) => {
  try {
    const userPayment = Number(req.body.userPayment);
    const ownOriginationPercent = Number(req.body.ownOriginationPercent);
    const userName = String(req.body.userName || '').trim();
    const originatorName = String(req.body.originatorName || '').trim();
    const out = await calculateOriginatorPaymentWithAi({
      userPayment,
      ownOriginationPercent,
      userName,
      originatorName,
    });
    res.json(out);
  } catch (e) {
    next(e);
  }
});

function escapeCsvValue(v) {
  const s = String(v ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function parseCsv(text) {
  // Minimal RFC4180-ish CSV parser (supports quotes, commas, CRLF/LF)
  const s = String(text || '');
  const rows = [];
  let row = [];
  let cur = '';
  let i = 0;
  let inQuotes = false;

  function endCell() {
    row.push(cur);
    cur = '';
  }
  function endRow() {
    // skip completely empty trailing line
    if (row.length === 1 && row[0] === '' && rows.length > 0) return;
    rows.push(row);
    row = [];
  }

  while (i < s.length) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cur += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ',') {
      endCell();
      i += 1;
      continue;
    }
    if (ch === '\n') {
      endCell();
      endRow();
      i += 1;
      continue;
    }
    if (ch === '\r') {
      // CRLF or bare CR
      if (s[i + 1] === '\n') i += 2;
      else i += 1;
      endCell();
      endRow();
      continue;
    }
    cur += ch;
    i += 1;
  }
  endCell();
  endRow();

  if (!rows.length) return { headers: [], records: [] };
  const headers = rows[0].map((h) => String(h || '').trim());
  const records = rows.slice(1).filter((r) => r.some((c) => String(c || '').trim() !== '')).map((r) => {
    const obj = {};
    for (let idx = 0; idx < headers.length; idx += 1) {
      const key = headers[idx] || `col_${idx + 1}`;
      obj[key] = r[idx] ?? '';
    }
    return obj;
  });
  return { headers, records };
}

function pickField(obj, keys) {
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
  }
  // try case-insensitive match
  const lowerMap = new Map(Object.keys(obj).map((k) => [k.toLowerCase(), k]));
  for (const k of keys) {
    const hit = lowerMap.get(String(k).toLowerCase());
    if (hit) return obj[hit];
  }
  return undefined;
}

function toNumberOrNaN(v) {
  const s = String(v ?? '').trim();
  if (!s) return NaN;
  const cleaned = s.replace(/[^0-9.\-]/g, '');
  return Number(cleaned);
}

function normalizeKey(s) {
  return String(s || '').trim().toLowerCase();
}

function findColumnKey(obj, predicate) {
  const keys = Object.keys(obj || {});
  for (const k of keys) {
    if (predicate(k)) return k;
  }
  return null;
}

function detectFieldsFromRow(row) {
  const entries = Object.entries(row || {});
  const lowerKeys = entries.map(([k]) => normalizeKey(k));
  const keyMap = new Map(lowerKeys.map((lk, i) => [lk, entries[i][0]]));

  const getByIncludesAny = (needles) => {
    for (const lk of lowerKeys) {
      if (needles.some((n) => lk.includes(n))) return keyMap.get(lk);
    }
    return null;
  };

  const amountKey =
    getByIncludesAny(['amount_usd']) ||
    getByIncludesAny(['amount', 'fee', 'revenue', 'collected', 'settlement', 'total']) ||
    null;

  const userKey = getByIncludesAny(['user']) || getByIncludesAny(['attorney', 'lawyer', 'employee', 'assigned']) || null;

  const originatorKey =
    getByIncludesAny(['originator']) || getByIncludesAny(['originating', 'origination', 'source']) || null;

  const contextKey =
    getByIncludesAny(['context']) || getByIncludesAny(['notes', 'note', 'matter', 'case', 'practice', 'team', 'exception']) || null;

  const ownOriginationPercentKey =
    getByIncludesAny(['own_origination_percent']) ||
    getByIncludesAny(['own origination', 'origination percent', 'originator percent', 'origination %', 'originator %']) ||
    null;

  let amount = toNumberOrNaN(amountKey ? row[amountKey] : undefined);
  if (!Number.isFinite(amount)) {
    const candidate = findColumnKey(row, (k) => {
      const lk = normalizeKey(k);
      if (!lk.includes('amount') && !lk.includes('fee') && !lk.includes('revenue') && !lk.includes('collected') && !lk.includes('total'))
        return false;
      return Number.isFinite(toNumberOrNaN(row[k]));
    });
    if (candidate) amount = toNumberOrNaN(row[candidate]);
  }

  const user = String(userKey ? row[userKey] : '').trim();
  const originatorRaw = String(originatorKey ? row[originatorKey] : '').trim();
  const originator = originatorRaw || user; // default missing originator to user
  const context = String(contextKey ? row[contextKey] : '').trim();

  let ownOriginationPercent = toNumberOrNaN(ownOriginationPercentKey ? row[ownOriginationPercentKey] : undefined);
  if (!Number.isFinite(ownOriginationPercent)) ownOriginationPercent = NaN;

  return { amount, user, originator, context, ownOriginationPercent };
}

async function calculateUserPaymentFromRow({ amount, userName, originatorName, rulesText, rowData }) {
  if (!userName) {
    const err = new Error('User name is required');
    err.statusCode = 400;
    throw err;
  }
  if (!rulesText) {
    const err = new Error('Rules sheet text is required');
    err.statusCode = 400;
    throw err;
  }
  mustBeFiniteNumber(amount, 'amount');
  if (amount < 0) {
    const err = new Error('amount must be >= 0');
    err.statusCode = 400;
    throw err;
  }

  const system =
    'You are AI #1: the user commission calculator. You must follow the provided Rules Sheet exactly. ' +
    'You MUST examine ALL fields in the provided payment row data when selecting the best matching rule. ' +
    'Return ONLY valid JSON (no markdown, no extra text). If the rules are missing/ambiguous, return JSON with error=true and a clear message.';

  const user =
    `RULES SHEET (authoritative):\n${rulesText}\n\n` +
    `PAYMENT ROW DATA (all columns; use this to match rules):\n${safeJsonStringify(compactRowDataForPrompt(rowData))}\n\n` +
    `INPUT (canonicalized):\n` +
    `- amount_usd: ${amount}\n` +
    `- user: ${userName}\n` +
    `- originator: ${originatorName || '(not provided)'}\n\n` +
    `TASK:\n` +
    `1) Select the single best matching rule from the Rules Sheet.\n` +
    `2) Identify the commission percentage for the USER (as a decimal, e.g. 0.35 for 35%).\n` +
    `3) Compute user_payment = amount_usd * percentage.\n` +
    `4) Output JSON with numeric fields as numbers (not strings).\n\n` +
    `OUTPUT JSON SCHEMA:\n` +
    `{
  "error": boolean,
  "error_message": string | null,
  "rule_applied": string,
  "percentage": number,
  "amount_usd": number,
  "user_payment": number,
  "calculation": string
}`;

  const content = await callChatModel({ system, user, temperature: 0 });
  const out = extractJsonObject(content);

  if (out && out.error) {
    const err = new Error(out.error_message || 'Rules sheet ambiguous');
    err.statusCode = 400;
    throw err;
  }

  const percentage = Number(out.percentage);
  const userPayment = Number(out.user_payment);
  mustBeFiniteNumber(percentage, 'percentage');
  mustBeFiniteNumber(userPayment, 'user_payment');

  return {
    amount_usd: amount,
    user: userName,
    originator: originatorName,
    rule_applied: String(out.rule_applied || ''),
    percentage,
    user_payment: userPayment,
    calculation: String(out.calculation || ''),
  };
}

app.post(
  '/api/calculate/batch',
  upload.fields([
    { name: 'attorneyDataFile', maxCount: 1 },
    { name: 'rulesFile', maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const attorneyFile = req.files?.attorneyDataFile?.[0];
      if (!attorneyFile) {
        const err = new Error('attorneyDataFile is required');
        err.statusCode = 400;
        throw err;
      }

      const rulesFile = req.files?.rulesFile?.[0];
      const rulesTextInput = String(req.body.rulesText || '').trim();
      const savedRules = String((await readRulesText()) || '').trim();
      const rulesText = String(rulesFile ? rulesFile.buffer.toString('utf8') : rulesTextInput || savedRules).trim();

      if (!rulesText) {
        const err = new Error('Rules are required (upload, save, or provide rulesText)');
        err.statusCode = 400;
        throw err;
      }

      const attorneyDataText = attorneyFile.buffer.toString('utf8');
      const { records } = parseCsv(attorneyDataText);

      if (!records.length) {
        const err = new Error('No rows found in attorney data CSV');
        err.statusCode = 400;
        throw err;
      }

      const results = [];
      for (let idx = 0; idx < records.length; idx += 1) {
        const row = records[idx];
        const amount = toNumberOrNaN(pickField(row, ['amount_usd', 'amount', 'amountUSD']));
        const userName = String(pickField(row, ['user', 'user_name', 'attorney', 'attorney_name']) || '').trim();
        const originatorName = String(pickField(row, ['originator', 'originator_name']) || '').trim();
        const context = String(pickField(row, ['context', 'notes', 'matter', 'case']) || '').trim();
        const ownOriginationPercent = toNumberOrNaN(
          pickField(row, ['own_origination_percent', 'ownOriginationPercent', 'originator_percent', 'originatorPercent'])
        );

        if (!Number.isFinite(amount) || amount < 0 || !userName) {
          results.push({
            row_number: idx + 2, // header is row 1
            error: true,
            error_message: 'Row must include user and amount_usd (>= 0)',
          });
          continue;
        }

        try {
          const userOut = await calculateUserPayment({
            amount,
            userName,
            originatorName,
            rulesText,
            context,
            attorneyDataText,
          });

          let originatorOut = null;
          if (
            originatorName &&
            normalizeName(originatorName) !== normalizeName(userName) &&
            Number.isFinite(ownOriginationPercent)
          ) {
            originatorOut = await calculateOriginatorPaymentWithAi({
              userPayment: userOut.user_payment,
              ownOriginationPercent,
              userName,
              originatorName,
            });
          }

          results.push({
            row_number: idx + 2,
            error: false,
            amount_usd: userOut.amount_usd,
            user: userOut.user,
            originator: originatorName,
            rule_applied: userOut.rule_applied,
            percentage: userOut.percentage,
            user_payment: userOut.user_payment,
            user_calculation: userOut.calculation,
            own_origination_percent: Number.isFinite(ownOriginationPercent) ? ownOriginationPercent : '',
            originator_payment: originatorOut ? originatorOut.originator_payment : '',
            originator_calculation: originatorOut ? originatorOut.calculation : '',
            warning: originatorOut?.warning || '',
          });
        } catch (e) {
          results.push({
            row_number: idx + 2,
            error: true,
            error_message: e.message || 'Failed to calculate row',
          });
        }
      }

      const header = [
        'row_number',
        'error',
        'error_message',
        'amount_usd',
        'user',
        'originator',
        'rule_applied',
        'percentage',
        'user_payment',
        'user_calculation',
        'own_origination_percent',
        'originator_payment',
        'originator_calculation',
        'warning',
      ];

      const lines = [header.join(',')];
      for (const r of results) {
        lines.push(header.map((h) => escapeCsvValue(r[h] ?? '')).join(','));
      }
      const csv = lines.join('\n');

      res.json({ csv, results_count: results.length });
    } catch (e) {
      next(e);
    }
  }
);

app.post(
  '/api/flow/run',
  upload.fields([
    { name: 'rulesFile', maxCount: 1 },
    { name: 'paymentFile', maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      if (!isModelConfigured()) {
        const err = new Error(
          'Azure model credentials not configured. Set AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_API_KEY + AZURE_OPENAI_DEPLOYMENT. (Optional fallback: AZURE_AI_FOUNDRY_CHAT_COMPLETIONS_URL + AZURE_AI_FOUNDRY_API_KEY.)'
        );
        err.statusCode = 500;
        throw err;
      }

      const rulesFile = req.files?.rulesFile?.[0];
      const paymentFile = req.files?.paymentFile?.[0];
      if (!rulesFile) {
        const err = new Error('rulesFile is required');
        err.statusCode = 400;
        throw err;
      }
      if (!paymentFile) {
        const err = new Error('paymentFile is required');
        err.statusCode = 400;
        throw err;
      }

      const rulesText = String(rulesFile.buffer.toString('utf8') || '').trim();
      if (!rulesText) {
        const err = new Error('Rules sheet file was empty');
        err.statusCode = 400;
        throw err;
      }

      const paymentText = paymentFile.buffer.toString('utf8');
      const filename = String(paymentFile.originalname || '').toLowerCase();
      const contentType = String(paymentFile.mimetype || '').toLowerCase();

      let records = [];
      if (filename.endsWith('.csv') || contentType.includes('csv')) {
        records = parseCsv(paymentText).records;
      } else if (filename.endsWith('.json') || contentType.includes('json')) {
        const parsed = JSON.parse(paymentText);
        if (Array.isArray(parsed)) records = parsed;
        else if (parsed && typeof parsed === 'object') records = [parsed];
      } else {
        // Default: attempt CSV first, fallback to 1-row key/value text.
        const maybe = parseCsv(paymentText);
        if (maybe.records?.length) records = maybe.records;
        else {
          const obj = {};
          for (const line of String(paymentText || '').split(/\r?\n/)) {
            const s = line.trim();
            if (!s) continue;
            const idx = s.indexOf(':');
            if (idx > 0) obj[s.slice(0, idx).trim()] = s.slice(idx + 1).trim();
            else obj[`field_${Object.keys(obj).length + 1}`] = s;
          }
          if (Object.keys(obj).length) records = [obj];
        }
      }

      if (!records.length) {
        const err = new Error('No rows found in payment file');
        err.statusCode = 400;
        throw err;
      }

      const results = [];
      for (let idx = 0; idx < records.length; idx += 1) {
        const row = records[idx] || {};
        const detected = detectFieldsFromRow(row);

        if (!Number.isFinite(detected.amount) || detected.amount < 0 || !detected.user) {
          results.push({
            row_number: idx + 2,
            error: true,
            error_message: 'Could not detect amount_usd (>= 0) and user from this row',
          });
          continue;
        }

        try {
          // AI #1 must fully complete first
          const userOut = await calculateUserPaymentFromRow({
            amount: detected.amount,
            userName: detected.user,
            originatorName: detected.originator,
            rulesText,
            rowData: row,
          });

          // AI #2 only when originator != user (and percent present)
          const same = normalizeName(detected.originator) === normalizeName(detected.user);
          let originatorOut = null;
          if (!same && Number.isFinite(detected.ownOriginationPercent)) {
            originatorOut = await calculateOriginatorPaymentWithAi({
              userPayment: userOut.user_payment,
              ownOriginationPercent: detected.ownOriginationPercent,
              userName: detected.user,
              originatorName: detected.originator,
            });
          }

          results.push({
            row_number: idx + 2,
            error: false,
            amount_usd: userOut.amount_usd,
            user: userOut.user,
            originator: detected.originator,
            rule_applied: userOut.rule_applied,
            percentage: userOut.percentage,
            user_payment: userOut.user_payment,
            user_calculation: userOut.calculation,
            own_origination_percent: Number.isFinite(detected.ownOriginationPercent) ? detected.ownOriginationPercent : '',
            originator_payment: originatorOut ? originatorOut.originator_payment : same ? 0 : '',
            originator_calculation: originatorOut ? originatorOut.calculation : same ? 'same person => 0' : '',
            warning:
              originatorOut?.warning ||
              (!same && !Number.isFinite(detected.ownOriginationPercent) ? 'Missing own origination % for originator calculation.' : ''),
          });
        } catch (e) {
          results.push({
            row_number: idx + 2,
            error: true,
            error_message: e.message || 'Failed to calculate row',
          });
        }
      }

      const header = [
        'row_number',
        'error',
        'error_message',
        'amount_usd',
        'user',
        'originator',
        'rule_applied',
        'percentage',
        'user_payment',
        'user_calculation',
        'own_origination_percent',
        'originator_payment',
        'originator_calculation',
        'warning',
      ];

      const lines = [header.join(',')];
      for (const r of results) {
        lines.push(header.map((h) => escapeCsvValue(r[h] ?? '')).join(','));
      }

      res.json({
        results_count: results.length,
        preview_first_row: results.find((r) => !r.error) || null,
        csv: lines.join('\n'),
      });
    } catch (e) {
      next(e);
    }
  }
);

// SPA fallback
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handler
app.use((err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: true,
    message: err.message || 'Unknown error',
  });
});

app.listen(PORT, () => {
  console.log(`Attorney Commission Calculator running at http://localhost:${PORT}`);
});
