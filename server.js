// Attorney Commission Calculator Server (Azure AI Foundry)
// Serves a single-page UI and exposes two AI-backed calculation endpoints.

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

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

  // Option A: Full Foundry chat-completions URL provided
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
        Authorization: `Bearer ${apiKey}`,
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

  // Option B: Azure OpenAI-style endpoint+deployment
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

  const err = new Error(
    'Azure model credentials not configured. Set AZURE_AI_FOUNDRY_CHAT_COMPLETIONS_URL + AZURE_AI_FOUNDRY_API_KEY (recommended), or AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_API_KEY + AZURE_OPENAI_DEPLOYMENT.'
  );
  err.statusCode = 500;
  throw err;
}

app.post('/api/commission/user', async (req, res, next) => {
  try {
    const amount = Number(req.body.amount);
    const userName = String(req.body.userName || '').trim();
    const originatorName = String(req.body.originatorName || '').trim();
    const rulesText = String(req.body.rulesText || '').trim();
    const context = String(req.body.context || '').trim();

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
      'You are an attorney commission calculator. You must follow the provided rules sheet exactly. ' +
      'Return ONLY valid JSON (no markdown, no extra text). If the rules are missing/ambiguous, return JSON with error=true and a clear message.';

    const user =
      `RULES SHEET (authoritative):\n${rulesText}\n\n` +
      `INPUT:\n` +
      `- amount_usd: ${amount}\n` +
      `- user: ${userName}\n` +
      `- originator: ${originatorName || '(not provided)'}\n` +
      (context ? `- context: ${context}\n` : '') +
      `\nTASK:\n` +
      `1) Select the single best matching rule from the rules sheet and identify its commission percentage.\n` +
      `2) Compute user_payment = amount_usd * percentage.\n` +
      `3) Output JSON with numeric fields as numbers (not strings).\n\n` +
      `OUTPUT JSON SCHEMA:\n` +
      `{
` +
      `  "error": boolean,
` +
      `  "error_message": string | null,
` +
      `  "rule_applied": string,
` +
      `  "percentage": number,            // e.g. 0.35 for 35%
` +
      `  "amount_usd": number,
` +
      `  "user_payment": number,
` +
      `  "calculation": string            // short: e.g. "200000 * 0.35"
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

    res.json({
      amount_usd: amount,
      user: userName,
      originator: originatorName,
      rule_applied: String(out.rule_applied || ''),
      percentage,
      user_payment: userPayment,
      calculation: String(out.calculation || ''),
    });
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
      return res.json({
        user_payment: userPayment,
        user: userName,
        originator: originatorName,
        own_origination_percent: ownOriginationPercent,
        originator_payment: 0,
        calculation: 'same person => 0',
      });
    }

    const system =
      'You are an attorney commission calculator. Return ONLY valid JSON (no markdown, no extra text). ' +
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
      `  "calculation": string            // short: e.g. "70000 * 0.2"
` +
      `}`;

    const content = await callChatModel({ system, user, temperature: 0 });
    const out = extractJsonObject(content);

    const originatorPayment = Number(out.originator_payment);
    mustBeFiniteNumber(originatorPayment, 'originator_payment');

    res.json({
      user_payment: userPayment,
      user: userName,
      originator: originatorName,
      own_origination_percent: ownOriginationPercent,
      originator_payment: originatorPayment,
      calculation: String(out.calculation || ''),
    });
  } catch (e) {
    next(e);
  }
});

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
