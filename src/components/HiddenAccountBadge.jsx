export default function HiddenAccountBadge({ hidden, compact = false }) {
  if (!hidden) return null;
  return <span className={compact ? 'hidden-account-chip compact' : 'hidden-account-chip'}><i className="ti ti-eye-off" /> Hidden</span>;
}
