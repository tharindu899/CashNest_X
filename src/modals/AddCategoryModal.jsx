import { useEffect, useState } from 'react';
import { categoryColorChoices, categoryIconChoices, colorVar } from '../models/categories';
import OptionPickerModal from './OptionPickerModal';

export default function AddCategoryModal({ open, close, onSave }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('ti-tag');
  const [color, setColor] = useState('accent');
  const [picker, setPicker] = useState(null);

  useEffect(() => {
    if (!open) return;
    setName(''); setIcon('ti-tag'); setColor('accent'); setPicker(null);
  }, [open]);

  if (!open) return null;

  function submit() {
    if (!name.trim()) return;
    onSave({ name, icon, color });
    close();
  }

  return (
    <>
      <div className="modal-overlay open" onClick={close}>
        <div className="modal-sheet clean-form-sheet category-create-sheet" onClick={(event) => event.stopPropagation()}>
          <div className="modal-handle" />
          <div className="modal-title">Create Category</div>
          <div className="category-preview-card">
            <span style={{ color: colorVar(color), background: `color-mix(in srgb, ${colorVar(color)} 16%, transparent)` }}><i className={`ti ${icon}`} /></span>
            <div><b>{name || 'New Category'}</b><small>Custom expense category</small></div>
          </div>
          <div className="form-stack">
            <label><span className="form-label">Category Name</span><input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Example: Internet" /></label>
            <div className="field-row">
              <div><span className="form-label">Icon</span><button className="form-picker-btn" type="button" onClick={() => setPicker('icon')}><span><i className={`ti ${icon}`} />Icon</span><i className="ti ti-chevron-down" /></button></div>
              <div><span className="form-label">Color</span><button className="form-picker-btn" type="button" onClick={() => setPicker('color')}><span><i className="ti ti-palette" />{color}</span><i className="ti ti-chevron-down" /></button></div>
            </div>
          </div>
          <button className="save-btn" type="button" onClick={submit}>Save Category</button>
        </div>
      </div>
      <OptionPickerModal open={picker === 'icon'} title="Choose Category Icon" grid options={categoryIconChoices.map((item) => ({ value: item, label: item.replace('ti-', '').replaceAll('-', ' '), icon: item, color }))} value={icon} onSelect={setIcon} close={() => setPicker(null)} />
      <OptionPickerModal open={picker === 'color'} title="Choose Color" options={categoryColorChoices.map((item) => ({ value: item, label: item, icon: 'ti-circle-filled', color: item }))} value={color} onSelect={setColor} close={() => setPicker(null)} />
    </>
  );
}
