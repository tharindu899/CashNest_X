const actions = [
  ['expense', 'ti-circle-minus', 'Expense', 'red'],
  ['income', 'ti-circle-plus', 'Income', 'green'],
  ['transfer', 'ti-arrows-exchange', 'Transfer', 'accent'],
  ['loan', 'ti-clock-dollar', 'Loan', 'amber'],
  ['account', 'ti-building-bank', 'Bank Pay', 'purple'],
  ['budget', 'ti-target', 'Budget', 'pink'],
  ['scan', 'ti-qrcode', 'Scan Bill', 'teal'],
  ['more', 'ti-dots', 'More', 'text2']
];

function colorFor(color) {
  if (color === 'text2') return 'var(--text2)';
  return `var(--${color})`;
}

export default function QuickActions({ openAdd, openLoan, openAccount, openBudget, openMore, notify }) {
  function run(type) {
    if (['expense', 'income', 'transfer'].includes(type)) openAdd(type);
    else if (type === 'loan') openAdd('loan');
    else if (type === 'budget') openBudget();
    else if (type === 'account') openAccount();
    else if (type === 'scan') openAdd('scan');
    else if (type === 'more') openMore?.();
    else notify('Feature ready for app build', 'ti-info-circle');
  }
  return (
    <>
      <div className="section-label">Quick Actions</div>
      <div className="quick-grid">
        {actions.map(([type, icon, label, color]) => (
          <div className="quick-btn" key={type} onClick={() => run(type)}>
            <div className="quick-icon" style={{ background: 'rgba(79,142,247,0.12)', color: colorFor(color) }}><i className={`ti ${icon}`} /></div>
            <span className="quick-lbl">{label}</span>
          </div>
        ))}
      </div>
    </>
  );
}
