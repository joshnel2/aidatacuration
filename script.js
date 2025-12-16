function $(id) {
  return document.getElementById(id);
}

const els = {
  rulesFile: $('rulesFile'),
  paymentFile: $('paymentFile'),

  runFlowBtn: $('runFlowBtn'),
  flowStatus: $('flowStatus'),

  flowResult: $('flowResult'),
  parsedInfo: $('parsedInfo'),
  ruleApplied: $('ruleApplied'),
  percentage: $('percentage'),
  userPayment: $('userPayment'),
  userCalc: $('userCalc'),
  eligibility: $('eligibility'),
  eligibilityNote: $('eligibilityNote'),
  originatorPayment: $('originatorPayment'),
  originatorCalc: $('originatorCalc'),

  flowCsvResult: $('flowCsvResult'),
  flowCsv: $('flowCsv'),
  copyFlowCsvBtn: $('copyFlowCsvBtn'),

  resetBtn: $('resetBtn'),
};

let state = {
  lastRun: null,
};

function normalizeName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
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
  state = { lastRun: null };

  els.flowResult.hidden = true;
  els.flowCsvResult.hidden = true;

  if (els.parsedInfo) els.parsedInfo.textContent = '';
  els.ruleApplied.textContent = '';
  els.percentage.textContent = '';
  els.userPayment.textContent = '';
  els.userCalc.textContent = '';

  els.originatorPayment.textContent = '';
  els.originatorCalc.textContent = '';
  if (els.flowCsv) els.flowCsv.value = '';

  setStatus(els.flowStatus, '', 'neutral');

  setPill('Waiting', 'neutral');
  els.eligibilityNote.textContent = '';
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

async function onRunFlow() {
  clearResults();

  const rulesFile = els.rulesFile.files && els.rulesFile.files[0];
  const paymentFile = els.paymentFile.files && els.paymentFile.files[0];

  if (!rulesFile) {
    setStatus(els.flowStatus, 'Upload a rules sheet file first.', 'error');
    return;
  }
  if (!paymentFile) {
    setStatus(els.flowStatus, 'Upload a payment information file first.', 'error');
    return;
  }

  els.runFlowBtn.disabled = true;
  setStatus(els.flowStatus, 'Running calculations (user first, then originator if applicable)…', 'neutral');

  try {
    const fd = new FormData();
    fd.append('rulesFile', rulesFile);
    fd.append('paymentFile', paymentFile);

    const r = await fetch('/api/flow/run', { method: 'POST', body: fd });
    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(text || `Request failed (${r.status})`);
    }
    if (!r.ok) throw new Error(data?.message || `Request failed (${r.status})`);

    state.lastRun = data;

    // Show a compact preview from first row (if present)
    const first = data?.preview_first_row || null;
    if (first) {
      if (els.parsedInfo) {
        const info = {
          detected_amount_usd: first.amount_usd,
          detected_user: first.user,
          detected_originator: first.originator,
          detected_own_origination_percent: first.own_origination_percent,
        };
        els.parsedInfo.textContent = JSON.stringify(info, null, 2);
      }

      els.ruleApplied.textContent = first.rule_applied || '';
      els.percentage.textContent = formatPercent(first.percentage);
      els.userPayment.textContent = formatUsd(first.user_payment);
      els.userCalc.textContent = first.user_calculation || '';

      const same = normalizeName(first.user) === normalizeName(first.originator || '');
      if (!first.originator || same) {
        setPill('Not applicable', 'neutral');
        els.eligibilityNote.textContent = !first.originator ? 'No originator detected for this row.' : 'Originator equals user, so originator payment is $0.';
        els.originatorPayment.textContent = formatUsd(0);
        els.originatorCalc.textContent = 'same person / no originator => 0';
      } else if (!Number.isFinite(first.own_origination_percent)) {
        setPill('Missing %', 'bad');
        els.eligibilityNote.textContent = 'Originator differs from user, but own origination % was not detected in this row.';
        els.originatorPayment.textContent = '';
        els.originatorCalc.textContent = '';
      } else {
        setPill('Eligible', 'good');
        els.eligibilityNote.textContent = 'Originator differs from user; originator payment calculated for this row.';
        els.originatorPayment.textContent = formatUsd(first.originator_payment);
        els.originatorCalc.textContent = first.originator_calculation || '';
      }

      els.flowResult.hidden = false;
    } else {
      if (els.parsedInfo) els.parsedInfo.textContent = '(No preview row available)';
      els.flowResult.hidden = false;
    }

    if (els.flowCsv) {
      els.flowCsv.value = data.csv || '';
      els.flowCsvResult.hidden = false;
    }

    setStatus(els.flowStatus, `Done (${data.results_count || 0} rows).`, 'success');
  } catch (e) {
    setStatus(els.flowStatus, e.message || 'Failed to run flow.', 'error');
  } finally {
    els.runFlowBtn.disabled = false;
    els.rulesFile.value = '';
    els.paymentFile.value = '';
  }
}

els.runFlowBtn.addEventListener('click', onRunFlow);
els.copyFlowCsvBtn.addEventListener('click', async () => {
  const ok = await copyToClipboard(els.flowCsv.value);
  setStatus(els.flowStatus, ok ? 'CSV copied.' : 'Could not copy CSV.', ok ? 'success' : 'error');
});

els.resetBtn.addEventListener('click', () => {
  els.rulesFile.value = '';
  els.paymentFile.value = '';
  clearResults();
});

clearResults();
