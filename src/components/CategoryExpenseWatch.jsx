import { useEffect, useMemo, useState } from 'react';
import { categoryInfo } from '../models/categories';
import { formatMoneyForCurrency } from '../utils/currency';

export default function CategoryExpenseWatch({ watch, ledger, currency }) {
  const categories = useMemo(() => watch?.categories || [], [watch?.categories]);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    if (!categories.length) {
      setSelectedCategory('');
      return;
    }
    if (!categories.some((item) => item.category === selectedCategory)) {
      setSelectedCategory(categories[0].category);
    }
  }, [categories, selectedCategory]);

  const selected = categories.find((item) => item.category === selectedCategory) || categories[0] || null;
  const selectedRank = selected ? categories.findIndex((item) => item.category === selected.category) + 1 : 0;
  const selectedInfo = selected ? categoryInfo(selected.category, 'expense', ledger.categories) : null;

  return (
    <div className="chart-card expense-watch-card">
      <div className="chart-title chart-title-row expense-watch-title">
        <span>Expense Watch</span>
      </div>

      {categories.length ? (
        <>
          <div className="expense-watch-picker" aria-label="Choose expense category">
            {categories.map((item) => {
              const cat = categoryInfo(item.category, 'expense', ledger.categories);
              const active = selected?.category === item.category;
              return (
                <button
                  type="button"
                  className={`expense-watch-chip ${active ? 'active' : ''}`}
                  key={item.category}
                  onClick={() => setSelectedCategory(item.category)}
                >
                  <i className={`ti ${cat.icon}`} style={{ color: `var(--${cat.color})` }} />
                  <span>{item.category}</span>
                </button>
              );
            })}
          </div>

          {selected && (
            <div className="expense-watch-selected">
              <div className="expense-watch-selected-head simple">
                <div className="expense-watch-selected-icon" style={{ color: `var(--${selectedInfo.color})` }}><i className={`ti ${selectedInfo.icon}`} /></div>
                <div>
                  <b>{selected.category}</b>
                </div>
              </div>

              <div className="expense-watch-detail-grid compact-watch-values">
                <div>
                  <span>Daily expense</span>
                  <b>{formatMoneyForCurrency(selected.dailyExpense, currency, { decimals: 0 })}</b>
                </div>
                <div>
                  <span>This month expense</span>
                  <b>{formatMoneyForCurrency(selected.amount, currency, { decimals: 0 })}</b>
                </div>
                <div>
                  <span>Last month expense</span>
                  <b>{selected.previous > 0 ? formatMoneyForCurrency(selected.previous, currency, { decimals: 0 }) : 'No data'}</b>
                </div>
                <div>
                  <span>All time expense</span>
                  <b>{formatMoneyForCurrency(selected.allTimeExpense, currency, { decimals: 0 })}</b>
                </div>
                <div>
                  <span>Rank</span>
                  <b>#{selectedRank}</b>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">No expense data to watch for this month.</div>
      )}
    </div>
  );
}
