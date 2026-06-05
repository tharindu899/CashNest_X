import { useEffect, useMemo, useState } from 'react';
import { categoryInfo } from '../models/categories';

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function CategoryDonutChart({ categories = [], total = 0, ledger, type = 'expense' }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(false);
    const frame = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(frame);
  }, [categories, total]);


  const segments = useMemo(() => {
    let offset = 0;
    return categories.map(([name, amount], index) => {
      const cat = categoryInfo(name, type, ledger?.categories);
      const value = total > 0 ? Number(amount || 0) / total : 0;
      const length = value * CIRCUMFERENCE;
      const item = {
        name,
        amount,
        color: `var(--${cat.color})`,
        dash: `${animate ? length : 0} ${CIRCUMFERENCE - length}`,
        offset: -offset,
        percent: total > 0 ? Math.round((Number(amount || 0) / total) * 100) : 0,
        delay: `${index * 90}ms`,
      };
      offset += length;
      return item;
    });
  }, [animate, categories, ledger?.categories, total, type]);

  return (
    <div className={`donut-wrap ${animate ? 'is-animated' : ''} ${total > 0 ? 'has-data' : 'no-data'}`} aria-label={`${type === 'income' ? 'Income' : 'Expense'} category chart`}>
      <svg className="donut-svg" width="124" height="124" viewBox="0 0 124 124">
        <title>{type === 'income' ? 'Income category chart' : 'Expense category chart'}</title>
        <circle className="donut-track" cx="62" cy="62" r={RADIUS} />
        {segments.map((segment) => (
          <circle
            key={segment.name}
            className="donut-segment"
            cx="62"
            cy="62"
            r={RADIUS}
            stroke={segment.color}
            strokeDasharray={segment.dash}
            strokeDashoffset={segment.offset}
            style={{ transitionDelay: segment.delay }}
          />
        ))}
      </svg>
      <div className="donut-center" aria-hidden="true" />
    </div>
  );
}
