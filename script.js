function $(id) {
  return document.getElementById(id);
}

const els = {
  amount: $('amount'),
  userName: $('userName'),
  originatorName: $('originatorName'),
  rulesText: $('rulesText'),
  context: $('context'),

  rulesFile: $('rulesFile'),
  saveRulesBtn: $('saveRulesBtn'),
  rulesStatus: $('rulesStatus'),

  attorneyDataFile: $('attorneyDataFile'),
  calcBatchBtn: $('calcBatchBtn'),
  batchStatus: $('batchStatus'),
  batchResult: $('batchResult'),
  batchCsv: $('batchCsv'),
  copyBatchCsvBtn: $('copyBatchCsvBtn'),

  calcUserBtn: $('calcUserBtn'),
  userStatus: $('userStatus'),
  userResult: $('userResult'),
  ruleApplied: $('ruleApplied'),
  percentage: $('percentage'),
  userPayment: $('userPayment'),
  userCalc: $('userCalc'),

  singleCsvResult: $('singleCsvResult'),
  singleCsv: $('singleCsv'),
  copySingleCsvBtn: $('copySingleCsvBtn'),

  ownOriginationPercent: $('ownOriginationPercent'),
  eligibility: $('eligibility'),
  eligibilityNote: $('eligibilityNote'),
  calcOriginatorBtn: $('calcOriginatorBtn'),
  originatorStatus: $('originatorStatus'),
  originatorResult: $('originatorResult'),
  originatorPayment: $('originatorPayment'),
  originatorCalc: $('originatorCalc'),

  resetBtn: $('resetBtn'),
};

let state = {
  userPayment: null,
  userCalc: null,
  ruleApplied: null,
  percentage: null,
};

function normalizeName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function parseMoney(input) {
  const raw = String(input || '').trim();
  if (!raw) return NaN;
  // Keep digits, dot, minus
  const cleaned = raw.replace(/[^0-9.\-]/g, '');
  return Number(cleaned);
}

function formatUsd(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(n);
}

function formatPercent(p) {
  if (typeof p !== 'number' || !Number.isFinite(p)) return '';
  return `${(p * 100).toFixed(2)}%`;
}

function setStatus(el, msg, kind = 'neutral') {
  el.textContent = msg;
  el.classList.remove('status--neutral', 'status--error', 'status--success');
  el.classList.add(`status--${kind}`);
}

function setPill(text, kind = 'neutral') {
  els.eligibility.textContent = text;
  els.eligibility.classList.remove('pill--neutral', 'pill--good', 'pill--bad');
  els.eligibility.classList.add(`pill--${kind}`);
}

function clearResults() {
  state = { userPayment: null, userCalc: null, ruleApplied: null, percentage: null };

  els.userResult.hidden = true;
  els.originatorResult.hidden = true;
  if (els.singleCsvResult) els.singleCsvResult.hidden = true;

  els.ruleApplied.textContent = '';
  els.percentage.textContent = '';
  els.userPayment.textContent = '';
  els.userCalc.textContent = '';

  els.originatorPayment.textContent = '';
  els.originatorCalc.textContent = '';
  if (els.singleCsv) els.singleCsv.value = '';

  setStatus(els.userStatus, '', 'neutral');
  setStatus(els.originatorStatus, '', 'neutral');

  setPill('Waiting for Step 1', 'neutral');
  els.eligibilityNote.textContent = '';
  els.calcOriginatorBtn.disabled = true;
}

function escapeCsvValue(v) {
  const s = String(v ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function buildSingleCsv({
  amountUsd,
  userName,
  originatorName,
  ruleApplied,
  percentage,
  userPayment,
  userCalc,
  ownOriginationPercent,
  originatorPayment,
  originatorCalc,
}) {
  const header = [
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
  ];
  const row = {
    amount_usd: amountUsd,
    user: userName,
    originator: originatorName,
    rule_applied: ruleApplied,
    percentage,
    user_payment: userPayment,
    user_calculation: userCalc,
    own_origination_percent: ownOriginationPercent ?? '',
    originator_payment: originatorPayment ?? '',
    originator_calculation: originatorCalc ?? '',
  };
  return [header.join(','), header.map((h) => escapeCsvValue(row[h] ?? '')).join(',')].join('\n');
}

async function copyToClipboard(text) {
  const s = String(text || '');
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = s;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(ta);
    }
  }
}

function updateEligibility() {
  const userName = els.userName.value;
  const originatorName = els.originatorName.value;

  if (state.userPayment == null) {
    setPill('Waiting for Step 1', 'neutral');
    els.eligibilityNote.textContent = 'Calculate user payment first.';
    els.calcOriginatorBtn.disabled = true;
    return;
  }

  if (!String(originatorName || '').trim()) {
    setPill('Originator missing', 'bad');
    els.eligibilityNote.textContent = 'Enter an originator name (or set it equal to the user).';
    els.calcOriginatorBtn.disabled = true;
    return;
  }

  const same = normalizeName(userName) === normalizeName(originatorName);
  if (same) {
    setPill('Same person', 'bad');
    els.eligibilityNote.textContent = 'Originator equals user, so originator payment is $0.';
    els.calcOriginatorBtn.disabled = true;
    els.originatorResult.hidden = false;
    els.originatorPayment.textContent = formatUsd(0);
    els.originatorCalc.textContent = 'same person => 0';
    return;
  }

  setPill('Eligible', 'good');
  els.eligibilityNote.textContent = 'Originator is different from user; you can compute originator payment.';
  els.calcOriginatorBtn.disabled = false;
}

async function postJson(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await r.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: true, message: text };
  }

  if (!r.ok) {
    const msg = data?.message || `Request failed (${r.status})`;
    const err = new Error(msg);
    err.status = r.status;
    err.data = data;
    throw err;
  }

  return data;
}

async function loadRules() {
  try {
    const r = await fetch('/api/rules');
    const data = await r.json();
    if (typeof data?.rulesText === 'string') els.rulesText.value = data.rulesText;
  } catch {
    // ignore
  }
}

async function onSaveRules() {
  els.saveRulesBtn.disabled = true;
  setStatus(els.rulesStatus, 'Saving rules…', 'neutral');
  try {
    await postJson('/api/rules', { rulesText: els.rulesText.value || '' });
    setStatus(els.rulesStatus, 'Rules saved.', 'success');
  } catch (e) {
    setStatus(els.rulesStatus, e.message || 'Failed to save rules.', 'error');
  } finally {
    els.saveRulesBtn.disabled = false;
  }
}

async function onUploadRulesFile() {
  const file = els.rulesFile.files && els.rulesFile.files[0];
  if (!file) return;
  setStatus(els.rulesStatus, 'Uploading rules…', 'neutral');
  try {
    const fd = new FormData();
    fd.append('rulesFile', file);
    const r = await fetch('/api/rules/upload', { method: 'POST', body: fd });
    const text = await r.text();
    const data = JSON.parse(text);
    if (!r.ok) throw new Error(data?.message || `Upload failed (${r.status})`);
    els.rulesText.value = data?.rulesText || '';
    setStatus(els.rulesStatus, 'Rules uploaded and saved.', 'success');
  } catch (e) {
    setStatus(els.rulesStatus, e.message || 'Failed to upload rules.', 'error');
  } finally {
    els.rulesFile.value = '';
  }
}

async function onCalculateUser() {
  clearResults();

  const amount = parseMoney(els.amount.value);
  const userName = els.userName.value.trim();
  const originatorName = els.originatorName.value.trim();
  const rulesText = els.rulesText.value.trim();
  const context = els.context.value.trim();

  if (!Number.isFinite(amount) || amount < 0) {
    setStatus(els.userStatus, 'Enter a valid amount (>= 0).', 'error');
    return;
  }
  if (!userName) {
    setStatus(els.userStatus, 'Enter a user name.', 'error');
    return;
  }
  if (!rulesText) {
    setStatus(els.userStatus, 'Add rules in the Rules section (upload or type, then save).', 'error');
    return;
  }

  els.calcUserBtn.disabled = true;
  setStatus(els.userStatus, 'Calculating user payment…', 'neutral');

  try {
    const data = await postJson('/api/commission/user', {
      amount,
      userName,
      originatorName,
      rulesText,
      context,
    });

    state.userPayment = data.user_payment;
    state.userCalc = data.calculation;
    state.ruleApplied = data.rule_applied;
    state.percentage = data.percentage;

    els.ruleApplied.textContent = data.rule_applied || '(rule not returned)';
    els.percentage.textContent = formatPercent(data.percentage);
    els.userPayment.textContent = formatUsd(data.user_payment);
    els.userCalc.textContent = data.calculation || '';

    els.userResult.hidden = false;
    setStatus(els.userStatus, 'User payment calculated.', 'success');

    updateEligibility();

    // CSV output (single)
    if (els.singleCsv) {
      els.singleCsv.value = buildSingleCsv({
        amountUsd: amount,
        userName,
        originatorName,
        ruleApplied: data.rule_applied || '',
        percentage: data.percentage,
        userPayment: data.user_payment,
        userCalc: data.calculation || '',
        ownOriginationPercent: '',
        originatorPayment: '',
        originatorCalc: '',
      });
      els.singleCsvResult.hidden = false;
    }
  } catch (e) {
    setStatus(els.userStatus, e.message || 'Failed to calculate user payment.', 'error');
  } finally {
    els.calcUserBtn.disabled = false;
  }
}

async function onCalculateOriginator() {
  els.originatorResult.hidden = true;

  const userName = els.userName.value.trim();
  const originatorName = els.originatorName.value.trim();
  const ownOriginationPercent = Number(String(els.ownOriginationPercent.value || '').trim().replace(/[^0-9.\-]/g, ''));

  if (state.userPayment == null) {
    setStatus(els.originatorStatus, 'Calculate user payment first.', 'error');
    return;
  }

  if (!Number.isFinite(ownOriginationPercent) || ownOriginationPercent < 0 || ownOriginationPercent > 100) {
    setStatus(els.originatorStatus, 'Enter a valid % between 0 and 100.', 'error');
    return;
  }

  const same = normalizeName(userName) === normalizeName(originatorName);
  if (same) {
    // Guard; should already be disabled.
    els.originatorResult.hidden = false;
    els.originatorPayment.textContent = formatUsd(0);
    els.originatorCalc.textContent = 'same person => 0';
    setStatus(els.originatorStatus, 'Originator equals user, so originator payment is $0.', 'success');
    return;
  }

  els.calcOriginatorBtn.disabled = true;
  setStatus(els.originatorStatus, 'Calculating originator payment…', 'neutral');

  try {
    const data = await postJson('/api/commission/originator', {
      userPayment: state.userPayment,
      ownOriginationPercent,
      userName,
      originatorName,
    });

    els.originatorPayment.textContent = formatUsd(data.originator_payment);
    els.originatorCalc.textContent = data.calculation || '';
    els.originatorResult.hidden = false;
    setStatus(els.originatorStatus, 'Originator payment calculated.', 'success');

    // Update CSV now that originator step is done
    if (els.singleCsv) {
      els.singleCsv.value = buildSingleCsv({
        amountUsd: parseMoney(els.amount.value),
        userName,
        originatorName,
        ruleApplied: state.ruleApplied || '',
        percentage: state.percentage,
        userPayment: state.userPayment,
        userCalc: state.userCalc || '',
        ownOriginationPercent,
        originatorPayment: data.originator_payment,
        originatorCalc: data.calculation || '',
      });
      els.singleCsvResult.hidden = false;
    }
  } catch (e) {
    setStatus(els.originatorStatus, e.message || 'Failed to calculate originator payment.', 'error');
  } finally {
    els.calcOriginatorBtn.disabled = false;
  }
}

async function onCalculateBatch() {
  els.batchResult.hidden = true;
  els.batchCsv.value = '';

  const file = els.attorneyDataFile.files && els.attorneyDataFile.files[0];
  if (!file) {
    setStatus(els.batchStatus, 'Upload an attorney data CSV first.', 'error');
    return;
  }

  const rulesText = els.rulesText.value.trim();
  if (!rulesText) {
    setStatus(els.batchStatus, 'Add rules in the Rules section first.', 'error');
    return;
  }

  els.calcBatchBtn.disabled = true;
  setStatus(els.batchStatus, 'Calculating batch CSV…', 'neutral');

  try {
    const fd = new FormData();
    fd.append('attorneyDataFile', file);
    fd.append('rulesText', rulesText);

    const r = await fetch('/api/calculate/batch', { method: 'POST', body: fd });
    const text = await r.text();
    const data = JSON.parse(text);
    if (!r.ok) throw new Error(data?.message || `Batch failed (${r.status})`);

    els.batchCsv.value = data.csv || '';
    els.batchResult.hidden = false;
    setStatus(els.batchStatus, `Batch complete (${data.results_count || 0} rows).`, 'success');
  } catch (e) {
    setStatus(els.batchStatus, e.message || 'Failed to calculate batch CSV.', 'error');
  } finally {
    els.calcBatchBtn.disabled = false;
  }
}

els.calcUserBtn.addEventListener('click', onCalculateUser);
els.calcOriginatorBtn.addEventListener('click', onCalculateOriginator);
els.saveRulesBtn.addEventListener('click', onSaveRules);
els.rulesFile.addEventListener('change', onUploadRulesFile);
els.calcBatchBtn.addEventListener('click', onCalculateBatch);

els.copySingleCsvBtn.addEventListener('click', async () => {
  const ok = await copyToClipboard(els.singleCsv.value);
  setStatus(els.userStatus, ok ? 'CSV copied.' : 'Could not copy CSV.', ok ? 'success' : 'error');
});
els.copyBatchCsvBtn.addEventListener('click', async () => {
  const ok = await copyToClipboard(els.batchCsv.value);
  setStatus(els.batchStatus, ok ? 'CSV copied.' : 'Could not copy CSV.', ok ? 'success' : 'error');
});

els.userName.addEventListener('input', updateEligibility);
els.originatorName.addEventListener('input', updateEligibility);
els.ownOriginationPercent.addEventListener('input', () => {
  if (els.originatorStatus.textContent) setStatus(els.originatorStatus, '', 'neutral');
});

els.resetBtn.addEventListener('click', () => {
  els.amount.value = '';
  els.userName.value = '';
  els.originatorName.value = '';
  els.context.value = '';
  els.ownOriginationPercent.value = '';
  els.attorneyDataFile.value = '';
  setStatus(els.batchStatus, '', 'neutral');
  els.batchResult.hidden = true;
  els.batchCsv.value = '';
  clearResults();
});

clearResults();
loadRules();
