import { Capacitor, registerPlugin } from '@capacitor/core';
import { formatMoneyForCurrency } from './currency';
import { getTransactionCurrency } from './accountViewTotals';
import { convertCurrency } from './currencyConverter';
import { visibleTransactionsForAccountFilter } from './transactionFilters';
import { formatLoanAmount, getBudgetSpentInCurrency, resolveLoanCurrency } from './loanBudgetCurrency';

const NativeExport = registerPlugin('NativeExport');

function safeText(value) {
  return String(value ?? '')
    .replace(/\u20a8/g, 'Rs.')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
}

function htmlEscape(value) {
  return safeText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function markdownEscape(value) {
  return safeText(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function fileStamp() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
}

function displayDateTime() {
  return new Date().toLocaleString();
}

function isNativeAndroid() {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  } catch {
    return false;
  }
}

function textToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

async function tryWebShare(blob, filename) {
  if (!navigator.share || typeof File === 'undefined') return false;
  const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
  if (navigator.canShare && !navigator.canShare({ files: [file] })) return false;
  await navigator.share({ files: [file], title: filename, text: 'CashNest X data export' });
  return true;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function saveExportFile({ content, blob, filename, mimeType }) {
  if (isNativeAndroid()) {
    const saved = await NativeExport.saveFile({ fileName: filename, mimeType, base64Data: textToBase64(content), directory: 'Documents', folder: 'CashNest X', replaceExisting: false });
    return { method: saved?.method || 'android-documents', filename, fileName: filename, size: saved?.size || content.length, uri: saved?.uri, path: saved?.path, folder: saved?.folder || 'Documents/CashNest X', mimeType };
  }

  const exportBlob = blob || new Blob([content], { type: mimeType });
  try {
    const shared = await tryWebShare(exportBlob, filename);
    if (shared) return { method: 'share', filename, fileName: filename, size: exportBlob.size, mimeType };
  } catch {}

  downloadBlob(exportBlob, filename);
  return { method: 'browser-download', filename, fileName: filename, size: exportBlob.size, mimeType };
}

function money(value, currency, decimals = 0) {
  return formatMoneyForCurrency(value, currency, { decimals });
}

function numberMoney(value, decimals = 2) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount.toFixed(decimals) : '0.00';
}

function txCurrency(row, accounts, appCurrency) {
  return getTransactionCurrency(row, accounts, appCurrency);
}

function convertedMain(value, fromCurrency, appCurrency, rates) {
  return convertCurrency(Number(value || 0), fromCurrency, appCurrency, rates);
}

function transactionAmountLine(row, accounts, appCurrency, rates) {
  const currency = txCurrency(row, accounts, appCurrency);
  const original = money(row.amount || 0, currency, 0);
  if (currency === appCurrency) return original;
  return `${original} (${money(convertedMain(row.amount || 0, currency, appCurrency, rates), appCurrency, 0)})`;
}

function loanAmountLine(row, field, appCurrency, rates) {
  const currency = resolveLoanCurrency(row, appCurrency);
  const original = formatLoanAmount(row, field, appCurrency, { decimals: 0 });
  if (currency === appCurrency) return original;
  return `${original} (${money(convertedMain(row?.[field] || 0, currency, appCurrency, rates), appCurrency, 0)})`;
}

function buildExportView(state, accounts, totals, options = {}) {
  const rates = options.rates;
  const appCurrency = state.currency || 'LKR';
  const visibleTransactions = visibleTransactionsForAccountFilter(state.transactions || [], accounts, 'All');
  const visibleAccounts = (accounts || []).filter((account) => !account.hideFromTotal);
  const enrichedAccounts = (accounts || []).map((account) => ({
    ...account,
    hiddenLabel: account.hideFromTotal ? 'Hidden from total' : 'Included in total',
    balanceMain: convertedMain(account.balance || 0, account.currency || appCurrency, appCurrency, rates)
  }));
  const enrichedTransactions = visibleTransactions.map((tx) => {
    const currency = txCurrency(tx, accounts, appCurrency);
    return { ...tx, currency, amountMain: convertedMain(tx.amount || 0, currency, appCurrency, rates) };
  });
  const enrichedLoans = (state.loans || []).map((loan) => {
    const currency = resolveLoanCurrency(loan, appCurrency);
    return {
      ...loan,
      currency,
      amountMain: convertedMain(loan.amount || 0, currency, appCurrency, rates),
      paidMain: convertedMain(loan.paid || 0, currency, appCurrency, rates),
      remainingMain: convertedMain(Math.max(0, Number(loan.amount || 0) - Number(loan.paid || 0)), currency, appCurrency, rates)
    };
  });
  const enrichedBudgets = (state.budgets || []).map((budget) => {
    const spentMain = getBudgetSpentInCurrency({ transactions: state.transactions || [], accounts, category: budget.category, targetCurrency: appCurrency, rates });
    const limit = Number(budget.amount || 0);
    return { ...budget, currency: appCurrency, spentMain, leftMain: Math.max(0, limit - spentMain), progress: limit > 0 ? Math.min(100, Math.round((spentMain / limit) * 100)) : 0 };
  });
  const summary = {
    balance: totals.balance || 0,
    income: totals.income || 0,
    expenses: totals.expenses || 0,
    savings: totals.savings || 0,
    visibleAccounts: visibleAccounts.length,
    hiddenAccounts: (accounts || []).filter((account) => account.hideFromTotal).length,
    exportedTransactions: enrichedTransactions.length,
    accounts: (accounts || []).length,
    loans: enrichedLoans.length,
    budgets: enrichedBudgets.length,
    customCategories: (state.customCategories || []).length,
    note: 'Hidden account transactions are excluded from All Accounts exports. Select the hidden account inside the app to view them.'
  };
  return { appCurrency, rates, accounts: enrichedAccounts, transactions: enrichedTransactions, loans: enrichedLoans, budgets: enrichedBudgets, categories: state.customCategories || [], summary };
}

function exportFileGuide(view) {
  return [
    { type: 'CSV Transactions', extension: '.csv', inside: 'Only transaction rows. Best for quick spreadsheet import.', example: `2026-06-04,expense,Food,Groceries,Cash Wallet,LKR,1250,1250,Monthly food` },
    { type: 'Excel Workbook', extension: '.xls', inside: 'Beautiful spreadsheet with Summary, Accounts, Transactions, Loans, Budgets and Categories tables.', example: `Summary card: Balance ${money(view.summary.balance, view.appCurrency)}` },
    { type: 'JSON Backup', extension: '.json', inside: 'Full structured CashNest X backup with metadata, data, preferences and file guide.', example: '{ "app": "CashNest X", "currency": "LKR", "transactions": [...] }' },
    { type: 'Markdown Report', extension: '.md', inside: 'Readable note-style report for GitHub, notes apps or sharing.', example: `| Balance | ${money(view.summary.balance, view.appCurrency)} |` },
    { type: 'PDF Report', extension: '.pdf', inside: 'Simple printable report with summary and important records.', example: 'CashNest X Export Report - Balance, Income, Expenses, Accounts, Transactions' }
  ];
}

function exportSnapshot(state, accounts, totals, options = {}) {
  const view = buildExportView(state, accounts, totals, options);
  return {
    app: 'CashNest X',
    version: 'beautiful-export-v2',
    exportedAt: new Date().toISOString(),
    exportedAtLocal: displayDateTime(),
    currency: view.appCurrency,
    exportGuide: exportFileGuide(view),
    summary: view.summary,
    ratesUsed: view.rates || null,
    accounts: view.accounts,
    transactions: view.transactions,
    loans: view.loans,
    budgets: view.budgets,
    categories: view.categories,
    notifications: state.notifications || [],
    preferences: state.preferences || {}
  };
}

function tableRows(items, columns) {
  if (!items?.length) return `<tr><td colspan="${columns.length}" class="empty">No data</td></tr>`;
  return items.map((item) => `<tr>${columns.map((col) => `<td>${htmlEscape(col.value(item))}</td>`).join('')}</tr>`).join('');
}

function sheet(title, items, columns) {
  return `<section class="sheet"><h2>${htmlEscape(title)}</h2><table><thead><tr>${columns.map((col) => `<th>${htmlEscape(col.label)}</th>`).join('')}</tr></thead><tbody>${tableRows(items, columns)}</tbody></table></section>`;
}

function summaryCards(view) {
  const cards = [
    ['Total Balance', money(view.summary.balance, view.appCurrency)],
    ['Income', money(view.summary.income, view.appCurrency)],
    ['Expenses', money(view.summary.expenses, view.appCurrency)],
    ['Savings', money(view.summary.savings, view.appCurrency)],
    ['Transactions', view.summary.exportedTransactions],
    ['Accounts', `${view.summary.visibleAccounts} visible / ${view.summary.hiddenAccounts} hidden`]
  ];
  return `<div class="cards">${cards.map(([label, value]) => `<div class="card"><span>${htmlEscape(label)}</span><b>${htmlEscape(value)}</b></div>`).join('')}</div>`;
}

export async function exportLedgerJson(state, accounts, totals, options = {}) {
  const snapshot = exportSnapshot(state, accounts, totals, options);
  const content = JSON.stringify(snapshot, null, 2);
  const filename = `CashNest-Backup-${fileStamp()}.json`;
  return saveExportFile({ content, blob: new Blob([content], { type: 'application/json;charset=utf-8' }), filename, mimeType: 'application/json' });
}

export async function exportLedgerExcel(state, accounts, totals, options = {}) {
  const view = buildExportView(state, accounts, totals, options);
  const content = `<!doctype html><html><head><meta charset="utf-8" />
  <style>
    body{font-family:Arial,'Segoe UI',sans-serif;color:#111827;background:#f8fafc;margin:0;padding:24px}
    .hero{background:linear-gradient(135deg,#4f8ef7,#6d5dfc);color:white;border-radius:18px;padding:24px;margin-bottom:18px}
    h1{font-size:28px;margin:0 0 6px;font-weight:800}.meta{opacity:.85;font-size:12px}.note{font-size:12px;margin-top:10px;opacity:.9}
    .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0 20px}.card{background:white;border:1px solid #e2e8f0;border-radius:14px;padding:14px}.card span{display:block;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.08em}.card b{display:block;margin-top:6px;font-size:18px;color:#111827}
    .sheet{background:white;border:1px solid #e2e8f0;border-radius:16px;margin:0 0 18px;overflow:hidden}h2{font-size:17px;margin:0;padding:14px 16px;background:#eef2ff;color:#1e293b}
    table{border-collapse:collapse;width:100%}th{background:#f8fafc;color:#475569;font-weight:800;text-transform:uppercase;letter-spacing:.05em}th,td{border:1px solid #e2e8f0;padding:9px 10px;text-align:left;font-size:12px;vertical-align:top}td{color:#1f2937}.empty{color:#94a3b8;text-align:center;padding:20px}
  </style></head><body>
  <div class="hero"><h1>CashNest X Beautiful Export</h1><div class="meta">Generated: ${htmlEscape(displayDateTime())} &bull; Main Currency: ${htmlEscape(view.appCurrency)}</div><div class="note">Includes summary, accounts, transactions, loans, budgets, custom categories and examples of every export file type.</div></div>
  ${summaryCards(view)}
  ${sheet('File Type Examples', exportFileGuide(view), [
    { label: 'File Type', value: (row) => `${row.type} ${row.extension}` }, { label: 'Inside', value: (row) => row.inside }, { label: 'Example', value: (row) => row.example }
  ])}
  ${sheet('Summary', [view.summary], [
    { label: 'Balance', value: (row) => money(row.balance, view.appCurrency) },
    { label: 'Income', value: (row) => money(row.income, view.appCurrency) },
    { label: 'Expenses', value: (row) => money(row.expenses, view.appCurrency) },
    { label: 'Savings', value: (row) => money(row.savings, view.appCurrency) },
    { label: 'Hidden Accounts', value: (row) => row.hiddenAccounts }
  ])}
  ${sheet('Accounts', view.accounts, [
    { label: 'Name', value: (row) => row.name }, { label: 'Type', value: (row) => row.type }, { label: 'Currency', value: (row) => row.currency || view.appCurrency }, { label: 'Current Balance', value: (row) => money(row.balance || 0, row.currency || view.appCurrency) }, { label: `Balance (${view.appCurrency})`, value: (row) => money(row.balanceMain || 0, view.appCurrency) }, { label: 'Total Rule', value: (row) => row.hiddenLabel }
  ])}
  ${sheet('Transactions', view.transactions, [
    { label: 'Date', value: (row) => row.date || row.dateValue }, { label: 'Type', value: (row) => row.type }, { label: 'Title', value: (row) => row.title }, { label: 'Category', value: (row) => row.category }, { label: 'Account', value: (row) => row.accountName || row.accountId || row.fromAccountId || '' }, { label: 'Original Amount', value: (row) => money(row.amount || 0, row.currency) }, { label: `Amount (${view.appCurrency})`, value: (row) => money(row.amountMain || 0, view.appCurrency) }, { label: 'Note', value: (row) => row.note || '' }
  ])}
  ${sheet('Loans', view.loans, [
    { label: 'Person', value: (row) => row.person }, { label: 'Type', value: (row) => row.type }, { label: 'Currency', value: (row) => row.currency }, { label: 'Amount', value: (row) => money(row.amount || 0, row.currency) }, { label: `Amount (${view.appCurrency})`, value: (row) => money(row.amountMain || 0, view.appCurrency) }, { label: 'Paid', value: (row) => money(row.paid || 0, row.currency) }, { label: `Paid (${view.appCurrency})`, value: (row) => money(row.paidMain || 0, view.appCurrency) }, { label: 'Due', value: (row) => row.due || row.dueDateValue || '' }, { label: 'Status', value: (row) => row.status || 'active' }
  ])}
  ${sheet('Budgets', view.budgets, [
    { label: 'Name', value: (row) => row.name }, { label: 'Category', value: (row) => row.category }, { label: `Limit (${view.appCurrency})`, value: (row) => money(row.amount || 0, view.appCurrency) }, { label: `Spent (${view.appCurrency})`, value: (row) => money(row.spentMain || 0, view.appCurrency) }, { label: 'Left', value: (row) => money(row.leftMain || 0, view.appCurrency) }, { label: 'Progress', value: (row) => `${row.progress || 0}%` }, { label: 'Period', value: (row) => row.period }, { label: 'Note', value: (row) => row.note || '' }
  ])}
  ${sheet('Custom Categories', view.categories, [{ label: 'Name', value: (row) => row.name }, { label: 'Icon', value: (row) => row.icon }, { label: 'Color', value: (row) => row.color }])}
</body></html>`;
  const filename = `CashNest-Workbook-${fileStamp()}.xls`;
  return saveExportFile({ content, blob: new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8' }), filename, mimeType: 'application/vnd.ms-excel' });
}

function pdfEscape(value) {
  return safeText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildPdf(lines) {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 42;
  const lineHeight = 15;
  const pages = [];
  let page = [];
  lines.forEach((line) => {
    if (page.length >= Math.floor((pageHeight - margin * 2) / lineHeight)) { pages.push(page); page = []; }
    page.push(line);
  });
  if (page.length) pages.push(page);
  const objects = [''];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  const kids = pages.map((_, index) => `${3 + index * 2} 0 R`).join(' ');
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  pages.forEach((pageLines, index) => {
    const pageObj = 3 + index * 2;
    const contentObj = pageObj + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents ${contentObj} 0 R >>`);
    const text = pageLines.map((line, row) => {
      const isTitle = row === 0 && index === 0;
      const isSection = /^[-A-Z0-9 /&]+$/.test(line) && line.length < 46 && row > 2;
      const font = isTitle || isSection ? 'F2' : 'F1';
      const size = isTitle ? 18 : isSection ? 12 : 10;
      return `BT /${font} ${size} Tf ${margin} ${pageHeight - margin - row * lineHeight} Td (${pdfEscape(line)}) Tj ET`;
    }).join('\n');
    objects.push(`<< /Length ${text.length} >>\nstream\n${text}\nendstream`);
  });
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 1; i < objects.length; i += 1) { offsets[i] = pdf.length; pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`; }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i += 1) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}

function pushSection(lines, title, rows, renderRow) {
  lines.push('', title.toUpperCase(), '-'.repeat(Math.min(title.length, 46)));
  if (!rows?.length) { lines.push('No data'); return; }
  rows.forEach((row, index) => lines.push(`${index + 1}. ${renderRow(row)}`));
}

function buildReportLines(state, accounts, totals, options = {}) {
  const view = buildExportView(state, accounts, totals, options);
  const lines = [
    'CashNest X Beautiful Export Report',
    `Generated: ${displayDateTime()}`,
    `Main Currency: ${view.appCurrency}`,
    '',
    'SUMMARY',
    `Balance: ${money(view.summary.balance, view.appCurrency)}`,
    `Income: ${money(view.summary.income, view.appCurrency)}`,
    `Expenses: ${money(view.summary.expenses, view.appCurrency)}`,
    `Savings: ${money(view.summary.savings, view.appCurrency)}`,
    `Hidden accounts excluded from All totals: ${view.summary.hiddenAccounts}`
  ];
  pushSection(lines, 'File Type Examples', exportFileGuide(view), (row) => `${row.type} ${row.extension} - ${row.inside} Example: ${row.example}`);
  pushSection(lines, 'Accounts', view.accounts, (row) => `${row.name} | ${row.type} | ${money(row.balance || 0, row.currency || view.appCurrency)} | ${money(row.balanceMain || 0, view.appCurrency)} main | ${row.hiddenLabel}`);
  pushSection(lines, 'Transactions', view.transactions, (row) => `${row.date || row.dateValue} | ${row.type} | ${row.title} | ${transactionAmountLine(row, accounts, view.appCurrency, options.rates)} | ${row.note || ''}`);
  pushSection(lines, 'Loans', view.loans, (row) => `${row.person} | ${row.type} | paid ${loanAmountLine(row, 'paid', view.appCurrency, options.rates)} / ${loanAmountLine(row, 'amount', view.appCurrency, options.rates)} | ${row.status || 'active'}`);
  pushSection(lines, 'Budgets', view.budgets, (row) => `${row.name} | ${row.category} | limit ${money(row.amount || 0, view.appCurrency)} | spent ${money(row.spentMain || 0, view.appCurrency)} | left ${money(row.leftMain || 0, view.appCurrency)} | ${row.progress || 0}%`);
  return lines;
}

export async function exportLedgerPdf(state, accounts, totals, options = {}) {
  const content = buildPdf(buildReportLines(state, accounts, totals, options).flatMap((line) => {
    const text = safeText(line);
    const chunks = [];
    for (let i = 0; i < Math.max(1, text.length); i += 96) chunks.push(text.slice(i, i + 96));
    return chunks.length ? chunks : [''];
  }));
  const filename = `CashNest-Report-${fileStamp()}.pdf`;
  return saveExportFile({ content, blob: new Blob([content], { type: 'application/pdf' }), filename, mimeType: 'application/pdf' });
}

function markdownTable(headers, rows) {
  const head = `| ${headers.map(markdownEscape).join(' | ')} |`;
  const split = `| ${headers.map(() => '---').join(' | ')} |`;
  if (!rows?.length) return `${head}\n${split}\n| ${headers.map((_, index) => (index === 0 ? 'No data' : '')).join(' | ')} |`;
  const body = rows.map((row) => `| ${row.map(markdownEscape).join(' | ')} |`).join('\n');
  return `${head}\n${split}\n${body}`;
}

export async function exportLedgerMarkdown(state, accounts, totals, options = {}) {
  const view = buildExportView(state, accounts, totals, options);
  const guide = exportFileGuide(view);
  const content = [
    '# CashNest X Beautiful Export Report',
    '',
    `Generated: **${markdownEscape(displayDateTime())}**`,
    `Main Currency: **${markdownEscape(view.appCurrency)}**`,
    '',
    '## Summary',
    markdownTable(['Item', 'Value'], [
      ['Balance', money(view.summary.balance, view.appCurrency)],
      ['Income', money(view.summary.income, view.appCurrency)],
      ['Expenses', money(view.summary.expenses, view.appCurrency)],
      ['Savings', money(view.summary.savings, view.appCurrency)],
      ['Transactions', view.summary.exportedTransactions],
      ['Accounts', `${view.summary.visibleAccounts} visible / ${view.summary.hiddenAccounts} hidden`]
    ]),
    '',
    '## File Type Examples',
    markdownTable(['File', 'Inside', 'Example'], guide.map((row) => [`${row.type} ${row.extension}`, row.inside, row.example])),
    '',
    '## Accounts',
    markdownTable(['Name', 'Type', 'Balance', `Main (${view.appCurrency})`, 'Rule'], view.accounts.map((row) => [row.name, row.type, money(row.balance || 0, row.currency || view.appCurrency), money(row.balanceMain || 0, view.appCurrency), row.hiddenLabel])),
    '',
    '## Transactions',
    markdownTable(['Date', 'Type', 'Title', 'Category', 'Account', 'Amount', 'Note'], view.transactions.map((row) => [row.date || row.dateValue || '', row.type || '', row.title || '', row.category || '', row.accountName || row.accountId || row.fromAccountId || '', transactionAmountLine(row, accounts, view.appCurrency, options.rates), row.note || ''])),
    '',
    '## Loans',
    markdownTable(['Person', 'Type', 'Paid', 'Amount', 'Status'], view.loans.map((row) => [row.person || '', row.type || '', loanAmountLine(row, 'paid', view.appCurrency, options.rates), loanAmountLine(row, 'amount', view.appCurrency, options.rates), row.status || 'active'])),
    '',
    '## Budgets',
    markdownTable(['Name', 'Category', 'Limit', 'Spent', 'Left', 'Progress'], view.budgets.map((row) => [row.name || '', row.category || '', money(row.amount || 0, view.appCurrency), money(row.spentMain || 0, view.appCurrency), money(row.leftMain || 0, view.appCurrency), `${row.progress || 0}%`])),
    '',
    '> Saved from CashNest X. Hidden account transactions are excluded from All Accounts exports.'
  ].join('\n');
  const filename = `CashNest-Report-${fileStamp()}.md`;
  return saveExportFile({ content, blob: new Blob([content], { type: 'text/markdown;charset=utf-8' }), filename, mimeType: 'text/markdown' });
}

function csvCell(value) {
  const text = safeText(value).replace(/"/g, '""');
  return /[",\n]/.test(text) ? `"${text}"` : text;
}

export async function exportLedgerCsv(state, accounts, totals, options = {}) {
  const view = buildExportView(state, accounts, totals, options);
  const headers = ['Date', 'Type', 'Title', 'Category', 'Account', 'Currency', 'Original Amount', `Amount ${view.appCurrency}`, 'Note', 'Export Example'];
  const rows = view.transactions.map((row) => [
    row.date || row.dateValue || '',
    row.type || '',
    row.title || '',
    row.category || '',
    row.accountName || row.accountId || row.fromAccountName || '',
    row.currency || view.appCurrency,
    numberMoney(row.amount || 0),
    numberMoney(row.amountMain || 0),
    row.note || '',
    'Transaction row'
  ]);
  const sampleRows = rows.length ? [] : [[
    new Date().toISOString().slice(0, 10),
    'expense',
    'Example food bill',
    'Food',
    'Cash Wallet',
    view.appCurrency,
    '1250.00',
    '1250.00',
    'Example row - add transactions to replace this sample',
    'Sample only'
  ]];
  const content = [headers, ...rows, ...sampleRows].map((row) => row.map(csvCell).join(',')).join('\n');
  const filename = `CashNest-Transactions-${fileStamp()}.csv`;
  return saveExportFile({ content, blob: new Blob([content], { type: 'text/csv;charset=utf-8' }), filename, mimeType: 'text/csv' });
}

export async function exportLedgerData(format, state, accounts, totals, options = {}) {
  if (format === 'csv') return exportLedgerCsv(state, accounts, totals, options);
  if (format === 'xls') return exportLedgerExcel(state, accounts, totals, options);
  if (format === 'pdf') return exportLedgerPdf(state, accounts, totals, options);
  if (format === 'md') return exportLedgerMarkdown(state, accounts, totals, options);
  return exportLedgerJson(state, accounts, totals, options);
}
