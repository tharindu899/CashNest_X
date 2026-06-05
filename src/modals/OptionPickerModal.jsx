import ModalPortal from '../components/ModalPortal';

export default function OptionPickerModal({ open, title, options, value, onSelect, close, grid = false, variant = '' }) {
  if (!open) return null;

  const variantClass = variant ? `${variant}-choice` : '';
  const modal = (
    <div className={`choice-overlay open ${variantClass ? `${variantClass}-overlay` : ''}`} onClick={close}>
      <div className={`choice-sheet ${grid ? 'icon-grid-sheet' : ''} ${variantClass ? `${variantClass}-sheet` : ''}`} onClick={(event) => event.stopPropagation()}>
        <div className="choice-handle" />
        <div className="choice-title">{title}</div>
        <div className={`${grid ? 'choice-icon-grid' : 'choice-list'} ${variantClass ? `${variantClass}-list` : ''}`}>
          {options.map((option) => {
            const optionValue = option.value ?? option;
            const label = option.label ?? option;
            const icon = option.icon;
            const iconText = option.iconText;
            const color = option.color;
            const subtitle = option.subtitle;
            const active = value === optionValue;
            return (
              <button
                type="button"
                className={grid ? `icon-choice ${active ? 'active' : ''} ${variantClass ? `${variantClass}-item` : ''}` : `choice-item ${active ? 'active' : ''} ${variantClass ? `${variantClass}-item` : ''}`}
                key={optionValue || label}
                onClick={() => { onSelect(optionValue); close(); }}
              >
                {grid ? (
                  <>
                    <span className="icon-choice-icon" style={color ? { color: `var(--${color})`, background: `color-mix(in srgb, var(--${color}) 14%, transparent)` } : undefined}><i className={`ti ${icon}`} /></span>
                    <small>{label}</small>
                  </>
                ) : (
                  <>
                    <span className={variant === 'currency' ? 'currency-settings-left' : 'choice-left'}>
                      {(icon || iconText) && (
                        <span className={variant === 'currency' ? 's-icon currency-settings-icon' : 'choice-icon'} style={color ? { color: `var(--${color})`, background: `color-mix(in srgb, var(--${color}) 14%, transparent)` } : undefined}>
                          {iconText ? <span className={variant === 'currency' ? 'currency-settings-icon-text' : 'choice-icon-text'}>{iconText}</span> : <i className={`ti ${icon}`} />}
                        </span>
                      )}
                      <span className={variant === 'currency' ? 's-text currency-settings-text' : 'choice-copy'}>
                        <b className={variant === 'currency' ? 's-name' : ''}>{label}</b>
                        {subtitle && <small className={variant === 'currency' ? 's-sub' : ''}>{subtitle}</small>}
                      </span>
                    </span>
                    <span className="choice-radio">{active && <span />}</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
        {variant === 'currency' && (
          <button className="choice-close-btn currency-choice-close" type="button" onClick={close}>Cancel</button>
        )}
      </div>
    </div>
  );

  return <ModalPortal>{modal}</ModalPortal>;
}
