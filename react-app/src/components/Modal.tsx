/* ============================================================
   Modal — React port of shell.js's PSModal (prompt()/confirm()
   replacement used across members/shifts/geofencing/wifi/team
   pages). Same field types (text/select), same validation
   (required by default), same open/close animation classes.
   ============================================================ */

import { useEffect, useRef, useState } from 'react';

export interface ModalFieldOption {
  value: string;
  label: string;
}

export interface ModalField {
  name: string;
  label: string;
  type?: string; // 'text' (default), 'password', 'email', 'select', ...
  placeholder?: string;
  value?: string;
  required?: boolean; // defaults to true, matching the original
  options?: ModalFieldOption[]; // for type: 'select'
}

export interface ModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  fields: ModalField[];
  submitLabel?: string;
  cancelLabel?: string;
  onSubmit: (values: Record<string, string>) => void;
  onClose: () => void;
}

export default function Modal({ open, title, subtitle = '', fields, submitLabel = 'Save', cancelLabel = 'Cancel', onSubmit, onClose }: ModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const firstInputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (!open) return;
    const initial: Record<string, string> = {};
    fields.forEach((f) => { initial[f.name] = f.value ?? ''; });
    setValues(initial);
    setError('');
    const t = setTimeout(() => firstInputRef.current?.focus(), 50);
    function onKeydown(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKeydown);
    return () => { clearTimeout(t); document.removeEventListener('keydown', onKeydown); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    for (const f of fields) {
      if (f.required !== false && !values[f.name]?.trim()) {
        setError(`${f.label} is required.`);
        return;
      }
    }
    setError('');
    const trimmed: Record<string, string> = {};
    Object.keys(values).forEach((k) => { trimmed[k] = (values[k] ?? '').trim(); });
    onSubmit(trimmed);
    onClose();
  }

  return (
    <div className="ps-modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ps-modal" role="dialog" aria-modal="true">
        <div className="ps-modal-header">
          <div>
            <div className="ps-modal-title">{title}</div>
            {subtitle ? <div className="ps-modal-subtitle">{subtitle}</div> : null}
          </div>
          <button type="button" className="ps-modal-close" aria-label="Close" onClick={onClose}>&times;</button>
        </div>
        <form className="ps-modal-body" onSubmit={handleSubmit}>
          {error ? <div className="ps-modal-error visible">{error}</div> : <div className="ps-modal-error" />}
          {fields.map((f, i) => (
            <div className="ps-field" key={f.name}>
              <label>{f.label}</label>
              {f.type === 'select' ? (
                <select
                  ref={i === 0 ? (firstInputRef as React.RefObject<HTMLSelectElement>) : undefined}
                  name={f.name}
                  required={f.required !== false}
                  value={values[f.name] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                >
                  {(f.options || []).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  ref={i === 0 ? (firstInputRef as React.RefObject<HTMLInputElement>) : undefined}
                  type={f.type || 'text'}
                  name={f.name}
                  placeholder={f.placeholder || ''}
                  required={f.required !== false}
                  value={values[f.name] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                />
              )}
            </div>
          ))}
          <div className="ps-modal-actions">
            <button type="button" className="ps-btn ps-btn-ghost" onClick={onClose}>{cancelLabel}</button>
            <button type="submit" className="ps-btn ps-btn-primary">{submitLabel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
