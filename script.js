function $(id) {
  return document.getElementById(id);
}

const els = {
  amount: $('amount'),
  userName: $('userName'),
  originatorName: $('originatorName'),
  rulesText: $('rulesText'),
  context: $('context'),

  calcUserBtn: $('calcUserBtn'),
  userStatus: $('userStatus'),
  userResult: $('userResult'),
  ruleApplied: $('ruleApplied'),
  percentage: $('percentage'),
  userPayment: $('userPayment'),
  userCalc: $('userCalc'),

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

  els.ruleApplied.textContent = '';
  els.percentage.textContent = '';
  els.userPayment.textContent = '';
  els.userCalc.textContent = '';

  els.originatorPayment.textContent = '';
  els.originatorCalc.textContent = '';

  setStatus(els.userStatus, '', 'neutral');
  setStatus(els.originatorStatus, '', 'neutral');

  setPill('Waiting for Step 1', 'neutral');
  els.eligibilityNote.textContent = '';
  els.calcOriginatorBtn.disabled = true;
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
    setStatus(els.userStatus, 'Paste the rules sheet text.', 'error');
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
  } catch (e) {
    setStatus(els.originatorStatus, e.message || 'Failed to calculate originator payment.', 'error');
  } finally {
    els.calcOriginatorBtn.disabled = false;
  }
}

els.calcUserBtn.addEventListener('click', onCalculateUser);
els.calcOriginatorBtn.addEventListener('click', onCalculateOriginator);

els.userName.addEventListener('input', updateEligibility);
els.originatorName.addEventListener('input', updateEligibility);
els.ownOriginationPercent.addEventListener('input', () => {
  if (els.originatorStatus.textContent) setStatus(els.originatorStatus, '', 'neutral');
});

els.resetBtn.addEventListener('click', () => {
  els.amount.value = '';
  els.userName.value = '';
  els.originatorName.value = '';
  els.rulesText.value = '';
  els.context.value = '';
  els.ownOriginationPercent.value = '';
  clearResults();
});

clearResults();
