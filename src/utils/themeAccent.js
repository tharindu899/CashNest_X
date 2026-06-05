export const accentThemes = [
  { value: 'blue', label: 'Ocean Blue', accent: '#4f8ef7', accent2: '#7b6cf7' },
  { value: 'emerald', label: 'Emerald Green', accent: '#10b981', accent2: '#2dd4bf' },
  { value: 'violet', label: 'Violet Purple', accent: '#8b5cf6', accent2: '#ec4899' },
  { value: 'amber', label: 'Golden Amber', accent: '#f59e0b', accent2: '#f97316' },
  { value: 'rose', label: 'Rose Pink', accent: '#f43f5e', accent2: '#fb7185' }
];

export function getAccentTheme(value = 'blue') {
  return accentThemes.find((theme) => theme.value === value) || accentThemes[0];
}
