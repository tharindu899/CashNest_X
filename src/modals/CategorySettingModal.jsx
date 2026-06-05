import ModalPortal from '../components/ModalPortal';
import { colorVar } from '../models/categories';

export default function CategorySettingModal({ open, close, categories = [], disabledCategories = [], customCategories = [], onToggleCategory, onDeleteCategory }) {
  if (!open) return null;

  const disabledSet = new Set((disabledCategories || []).map((name) => String(name || '').toLowerCase()));
  const customSet = new Set((customCategories || []).map((item) => String(item?.name || '').toLowerCase()));
  const enabledCount = (categories || []).filter((category) => !disabledSet.has(String(category?.name || '').toLowerCase())).length;

  const modal = (
    <div className="modal-overlay open category-setting-overlay" role="dialog" aria-modal="true" onClick={close}>
      <div className="modal-sheet clean-form-sheet category-setting-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="modal-handle" />
        <div className="category-setting-head">
          <div>
            <div className="modal-title category-setting-title">Category Setting</div>
            <p>{enabledCount} enabled • {(categories || []).length - enabledCount} disabled</p>
          </div>
          <span className="category-setting-badge"><i className="ti ti-adjustments" /></span>
        </div>

        <div className="category-setting-list settings-section">
          {(categories || []).length ? categories.map((category) => {
            const name = category?.name || 'Category';
            const disabled = disabledSet.has(String(name).toLowerCase());
            const isCustom = customSet.has(String(name).toLowerCase()) || category?.custom;
            return (
              <div className={`settings-item category-setting-row ${disabled ? 'category-disabled' : ''}`} key={category?.id || name} onClick={() => onToggleCategory?.(name)}>
                <div className="s-icon" style={{ background: `color-mix(in srgb, ${colorVar(category?.color || 'accent')} 14%, transparent)`, color: colorVar(category?.color || 'accent') }}>
                  <i className={`ti ${category?.icon || 'ti-tag'}`} />
                </div>
                <div className="s-text">
                  <div className="s-name">{name}</div>
                  <div className="s-sub">{isCustom ? 'Custom category' : 'Default category'} • {disabled ? 'Disabled' : 'Enabled'}</div>
                </div>
                {isCustom && (
                  <button className="mini-danger-btn category-delete-inside" type="button" aria-label={`Delete ${name}`} onClick={(event) => { event.stopPropagation(); onDeleteCategory?.(name); }}>
                    <i className="ti ti-trash" />
                  </button>
                )}
                <div className="toggle-wrap" aria-hidden="true"><div className={`toggle ${disabled ? '' : 'on'}`}><div className="toggle-thumb" /></div></div>
              </div>
            );
          }) : (
            <div className="empty-state mini-empty">No categories found.</div>
          )}
        </div>

        <button className="ghost-btn category-setting-close" type="button" onClick={close}>
          <i className="ti ti-x" /> Close
        </button>
      </div>
    </div>
  );

  return <ModalPortal>{modal}</ModalPortal>;
}
