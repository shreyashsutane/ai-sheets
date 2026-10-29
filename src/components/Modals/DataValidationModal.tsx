import React, { useState } from 'react';
import { X, CheckSquare, ListPlus, Plus, Trash2, Check } from 'lucide-react';
import { DataValidation, DropdownOption, SelectionRange } from '../../types/spreadsheet';
import { rangeToString } from '../../core/cellUtils';

interface DataValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selection: SelectionRange;
  initialValidation?: DataValidation;
  onSaveValidation: (range: SelectionRange, validation?: DataValidation) => void;
}

const BADGE_COLORS = [
  { bg: '#dbeafe', text: '#1e40af' }, // Blue
  { bg: '#dcfce7', text: '#15803d' }, // Green
  { bg: '#fef3c7', text: '#b45309' }, // Yellow / Amber
  { bg: '#fee2e2', text: '#b91c1c' }, // Red
  { bg: '#f3e8ff', text: '#6b21a8' }, // Purple
  { bg: '#ffedd5', text: '#c2410c' }, // Orange
  { bg: '#f1f5f9', text: '#475569' }, // Gray
];

export const DataValidationModal: React.FC<DataValidationModalProps> = ({
  isOpen,
  onClose,
  selection,
  initialValidation,
  onSaveValidation,
}) => {
  const [valType, setValType] = useState<'dropdown' | 'checkbox' | 'none'>(
    initialValidation?.type === 'checkbox' ? 'checkbox' : initialValidation?.type === 'dropdown' ? 'dropdown' : 'dropdown'
  );

  const [options, setOptions] = useState<DropdownOption[]>(() => {
    if (initialValidation?.options && initialValidation.options.length > 0) {
      return initialValidation.options;
    }
    return [
      { label: 'Todo', value: 'Todo', color: BADGE_COLORS[0].bg, textColor: BADGE_COLORS[0].text },
      { label: 'In Progress', value: 'In Progress', color: BADGE_COLORS[2].bg, textColor: BADGE_COLORS[2].text },
      { label: 'Done', value: 'Done', color: BADGE_COLORS[1].bg, textColor: BADGE_COLORS[1].text },
    ];
  });

  const [newOptLabel, setNewOptLabel] = useState('');

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (!newOptLabel.trim()) return;
    const color = BADGE_COLORS[options.length % BADGE_COLORS.length];
    setOptions([
      ...options,
      { label: newOptLabel.trim(), value: newOptLabel.trim(), color: color.bg, textColor: color.text },
    ]);
    setNewOptLabel('');
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (valType === 'none') {
      onSaveValidation(selection, undefined);
    } else if (valType === 'checkbox') {
      onSaveValidation(selection, { type: 'checkbox' });
    } else {
      onSaveValidation(selection, { type: 'dropdown', options });
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ width: '480px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ListPlus size={18} color="var(--accent-blue)" />
            <span style={{ fontSize: '15px', fontWeight: 600 }}>Data Validation & Dropdowns</span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Target Range */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Apply to Range
            </label>
            <input
              type="text"
              readOnly
              value={rangeToString(selection)}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                borderRadius: '4px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface-secondary)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Validation Type Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
              Validation Criteria
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`btn-icon ${valType === 'dropdown' ? 'active' : ''}`}
                onClick={() => setValType('dropdown')}
                style={{ flex: 1, padding: '8px', fontSize: '12px', fontWeight: 500, borderRadius: '6px' }}
              >
                <ListPlus size={14} style={{ marginRight: '4px' }} />
                Dropdown List
              </button>
              <button
                type="button"
                className={`btn-icon ${valType === 'checkbox' ? 'active' : ''}`}
                onClick={() => setValType('checkbox')}
                style={{ flex: 1, padding: '8px', fontSize: '12px', fontWeight: 500, borderRadius: '6px' }}
              >
                <CheckSquare size={14} style={{ marginRight: '4px' }} />
                Checkbox
              </button>
              <button
                type="button"
                className={`btn-icon ${valType === 'none' ? 'active' : ''}`}
                onClick={() => setValType('none')}
                style={{ flex: 1, padding: '8px', fontSize: '12px', fontWeight: 500, borderRadius: '6px' }}
              >
                Remove
              </button>
            </div>
          </div>

          {/* Dropdown Options Editor */}
          {valType === 'dropdown' && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
                Dropdown Items & Badge Colors
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto', marginBottom: '8px' }}>
                {options.map((opt, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-surface-secondary)',
                    }}
                  >
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: opt.color || '#e2e8f0',
                        color: opt.textColor || '#0f172a',
                      }}
                    >
                      {opt.label}
                    </span>
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => handleRemoveOption(idx)}
                      style={{ color: '#ef4444', padding: '2px' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Option input */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  value={newOptLabel}
                  onChange={(e) => setNewOptLabel(e.target.value)}
                  placeholder="New item label..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    fontSize: '12px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-strong)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="btn-icon"
                  style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: 'var(--accent-blue-subtle)', color: 'var(--accent-blue)' }}
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>
          )}

          {valType === 'checkbox' && (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '8px 12px', backgroundColor: 'var(--accent-blue-subtle)', borderRadius: '6px' }}>
              ✓ Selected cells will render as interactive clickable checkboxes linked to TRUE / FALSE values.
            </div>
          )}

          {/* Footer Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <button type="button" className="btn-icon" onClick={onClose} style={{ padding: '6px 14px' }}>
              Cancel
            </button>
            <button type="button" onClick={handleSave} className="btn-primary" style={{ padding: '6px 18px' }}>
              Save Validation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
