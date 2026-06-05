export function normaliseReceiptText(text = '') {
  return String(text || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[|]/g, ' ')
    .replace(/(?<=\d)[oO](?=\d)/g, '0')
    .replace(/(?<=\d)[lI](?=\d)/g, '1')
    .replace(/\bT0TAL\b/gi, 'TOTAL')
    .replace(/\bTQTAL\b/gi, 'TOTAL')
    .replace(/\bGRAND\s*T0TAL\b/gi, 'GRAND TOTAL')
    .replace(/\bSUB\s*T0TAL\b/gi, 'SUB TOTAL')
    .trim();
}

function cleanLine(line = '') {
  return normaliseReceiptText(line).replace(/\s+/g, ' ').trim();
}

function toAmount(raw = '') {
  const fixed = String(raw || '').replace(/,/g, '').replace(/[^0-9.]/g, '');
  const number = Number(fixed);
  return Number.isFinite(number) && number > 0 && number < 10000000 ? number : 0;
}

function lineAmounts(line = '') {
  const fixed = cleanLine(line)
    .replace(/,/g, '')
    .replace(/(?<=\d)\s*[\.:]\s*(?=\d{2}\b)/g, '.')
    .replace(/(?<=\d)\s+(?=\d{2}\b)/g, '.');
  const matches = [
    ...fixed.matchAll(/(?:rs\.?|lkr|රු\.?)?\s*(\d{1,7})(?:[\.,](\d{2}))\b/gi),
    ...fixed.matchAll(/(?:rs\.?|lkr|රු\.?)\s*:?\s*(\d{1,7})\b/gi)
  ];
  return matches
    .map((m) => toAmount(`${m[1]}.${m[2] || '00'}`))
    .filter(Boolean);
}

export function pickReceiptAmount(text = '') {
  const lines = String(text || '').split(/\r?\n/).map(cleanLine).filter(Boolean);
  const strong = [];
  const weak = [];
  const all = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    const values = lineAmounts(line);
    if (!values.length) continue;
    if (/phone|tel|bill\s*no|invoice\s*no|operator|cashier|unit|qty|quantity|date|time|balance|change|card\s*no/.test(lower)) continue;
    const max = Math.max(...values);
    if (/grand\s*total|net\s*total|total\s*amount|amount\s*due|final\s*total|payable/.test(lower)) strong.push(max);
    else if (/\btotal\b|\bamount\b|\bcash\b|\bcard\b|subtotal|sub\s*total/.test(lower)) weak.push(max);
    else all.push(max);
  }

  const picked = strong.at(-1) || weak.at(-1) || (all.length ? Math.max(...all) : 0);
  return picked ? picked.toFixed(2).replace(/\.00$/, '') : '';
}

export function pickReceiptDate(text = '') {
  const source = normaliseReceiptText(text);
  const patterns = [
    /\b(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/,
    /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/
  ];
  const currentYear = new Date().getFullYear();
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (!match) continue;
    let year; let month; let day;
    if (match[1].length === 4) {
      year = Number(match[1]); month = Number(match[2]); day = Number(match[3]);
    } else {
      day = Number(match[1]); month = Number(match[2]); year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
      if (month > 12 && day <= 12) [day, month] = [month, day];
    }
    if (year < 2000 || year > currentYear + 1) year = currentYear;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return '';
}

export function pickReceiptMerchant(text = '', fileName = '') {
  const bad = /^(tax|invoice|receipt|duplicate|copy|date|time|cashier|operator|unit|qty|quantity|item|price|amount|total|subtotal|balance|tel|phone|vat|tin|bill|card|cash|change|thank|welcome|no)$/i;
  const lines = String(text || '').split(/\r?\n/)
    .map((line) => line.replace(/[^a-zA-Z0-9&'. -]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((line) => line.length >= 3 && line.length <= 44);
  const firstGood = lines.find((line) => /[A-Za-z]/.test(line) && !bad.test(line.toLowerCase()) && !/\d{5,}/.test(line) && !/phone|tel|bill|invoice|receipt|road/i.test(line));
  if (firstGood) return firstGood;
  return String(fileName || '').replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim() || 'Scanned Receipt';
}

export function guessReceiptCategory(text = '', merchant = '', fileName = '') {
  const source = `${text} ${merchant} ${fileName}`.toLowerCase();
  if (/cigarette|tobacco|smoke|smoking|vape|lighter|cigar/.test(source)) return 'Smoke';
  if (/beer|wine|bar|pub|liquor|alcohol|cocktail|arrack|whisky|vodka|drink/.test(source)) return 'Drink';
  if (/keells|cargills|grocery|super|market|food|restaurant|cafe|pizza|kfc|burger|meal|bakery|hotel/.test(source)) return 'Food';
  if (/fuel|petrol|diesel|gas|ceypetco|ioc|shed/.test(source)) return 'Fuel';
  if (/uber|pickme|taxi|bus|train|transport|parking/.test(source)) return 'Transport';
  if (/dialog|mobitel|hutch|slt|telecom|electric|water|ceb|bill|utility|internet/.test(source)) return 'Utilities';
  if (/pharmacy|hospital|medical|doctor|health/.test(source)) return 'Health';
  if (/fashion|shopping|store|mall|bookshop|retail/.test(source)) return 'Shopping';
  return 'Bills';
}

export function parseReceiptText(text = '', fileName = '') {
  const cleanText = normaliseReceiptText(text);
  const merchant = pickReceiptMerchant(cleanText, fileName);
  return {
    text: cleanText,
    merchant,
    amount: pickReceiptAmount(cleanText),
    dateValue: pickReceiptDate(cleanText),
    category: guessReceiptCategory(cleanText, merchant, fileName)
  };
}
