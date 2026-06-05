export const NUMBER_FORMAT_KEY = 'cashnest_x_number_format_compact_v1';
export const COMPACT_NUMBER_MIN = 100_000;

export function getCompactNumberPreference() {
  try {
    return localStorage.getItem(NUMBER_FORMAT_KEY) === 'true';
  } catch (_) {
    return false;
  }
}

export function setCompactNumberPreference(enabled) {
  try {
    localStorage.setItem(NUMBER_FORMAT_KEY, enabled ? 'true' : 'false');
  } catch (_) {}
}

export function formatPlainNumber(value, locale = 'en-US', decimals = 0) {
  const number = Number(value || 0);
  return number.toLocaleString(locale, {
    useGrouping: false,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

export function formatCompactNumber(value, locale = 'en-US') {
  const number = Number(value || 0);
  const abs = Math.abs(number);
  if (abs < COMPACT_NUMBER_MIN) return formatPlainNumber(number, locale, 0);

  const units = [
    { value: 1_000_000_000, suffix: 'B' },
    { value: 1_000_000, suffix: 'M' },
    { value: 1_000, suffix: 'k' }
  ];
  const unit = units.find((item) => abs >= item.value) || units[2];
  const scaled = number / unit.value;
  const scaledAbs = Math.abs(scaled);
  const maxDigits = scaledAbs >= 100 ? 0 : scaledAbs >= 10 ? 1 : 1;
  const formatted = scaled.toLocaleString(locale, {
    useGrouping: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDigits
  }).replace(/\.0$/, '');
  return `${formatted}${unit.suffix}`;
}
