import React, { useState } from 'react';
import { X, Sparkles, Plus, Trash2, Palette, Flame } from 'lucide-react';
import { ConditionalFormatRule, SelectionRange, ConditionalRuleOperator } from '../../types/spreadsheet';
import { rangeToString } from '../../core/cellUtils';

interface ConditionalFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  selection: SelectionRange;
  rules: ConditionalFormatRule[];
  onSaveRules: (rules: ConditionalFormatRule[]) => void;
}

export const ConditionalFormatModal: React.FC<ConditionalFormatModalProps> = ({
  isOpen,
  onClose,
  selection,
  rules,
  onSaveRules,
}) => {
  const [activeRules, setActiveRules] = useState<ConditionalFormatRule[]>(rules || []);
  const [ruleType, setRuleType] = useState<'single' | 'colorScale'>('single');
  const [targetRange, setTargetRange] = useState(rangeToString(selection));
  const [operator, setOperator] = useState<ConditionalRuleOperator>('greaterThan');
  const [val1, setVal1] = useState('100');
  const [val2, setVal2] = useState('500');
  const [bgColor, setBgColor] = useState('#bbf7d0');
  const [textColor, setTextColor] = useState('#14532d');
  const [minColor, setMinColor] = useState('#bbf7d0');
  const [midColor, setMidColor] = useState('#fef08a');
  const [maxColor, setMaxColor] = useState('#fca5a5');

  if (!isOpen) return null;

  const handleAddRule = () => {
    const newRule: ConditionalFormatRule = {
      id: `rule-${Date.now()}`,
      range: targetRange.trim() || rangeToString(selection),
      rule:
        ruleType === 'single'
          ? {
              type: 'single',
              operator,
              value1: val1,
              value2: operator === 'between' ? val2 : undefined,
              format: { bgColor, textColor, bold: true },
            }
          : {
              type: 'colorScale',
              minColor,
              midColor,
              maxColor,
            },
    };

    const updated = [...activeRules, newRule];
    setActiveRules(updated);
    onSaveRules(updated);
  };

  const handleRemoveRule = (ruleId: string) => {
    const updated = activeRules.filter((r) => r.id !== ruleId);
    setActiveRules(updated);
    onSaveRules(updated);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ width: '560px', maxHeight: '85vh' }}
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
            <Palette size={18} color="var(--accent-blue)" />
            <span style={{ fontSize: '15px', fontWeight: 600 }}>Conditional Formatting & Heatmaps</span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          {/* Active Rules List */}
          {activeRules.length > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                Active Rules ({activeRules.length})
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {activeRules.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-surface-secondary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '3px',
                          backgroundColor: r.rule.type === 'single' ? r.rule.format.bgColor || '#e2e8f0' : r.rule.maxColor,
                        }}
                      />
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>
                        {r.range}: {r.rule.type === 'single' ? `${r.rule.operator} ${r.rule.value1}` : '3-Color Heatmap Scale'}
                      </span>
                    </div>
                    <button
                      className="btn-icon"
                      onClick={() => handleRemoveRule(r.id)}
                      style={{ color: '#ef4444', padding: '2px' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Rule Section */}
          <div
            style={{
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface-secondary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600 }}>Add New Formatting Rule</div>

            {/* Target Range */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Apply to Range
              </label>
              <input
                type="text"
                value={targetRange}
                onChange={(e) => setTargetRange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '5px 8px',
                  fontSize: '12px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-strong)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Rule Type Selector */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`btn-icon ${ruleType === 'single' ? 'active' : ''}`}
                onClick={() => setRuleType('single')}
                style={{ flex: 1, padding: '6px', fontSize: '12px', borderRadius: '4px' }}
              >
                Single Color Rule
              </button>
              <button
                type="button"
                className={`btn-icon ${ruleType === 'colorScale' ? 'active' : ''}`}
                onClick={() => setRuleType('colorScale')}
                style={{ flex: 1, padding: '6px', fontSize: '12px', borderRadius: '4px' }}
              >
                Color Scale Heatmap
              </button>
            </div>

            {/* Single Color Controls */}
            {ruleType === 'single' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                    Format cells if...
                  </label>
                  <select
                    value={operator}
                    onChange={(e) => setOperator(e.target.value as ConditionalRuleOperator)}
                    style={{
                      width: '100%',
                      padding: '5px 8px',
                      fontSize: '12px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-strong)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="greaterThan">Greater than</option>
                    <option value="lessThan">Less than</option>
                    <option value="equalTo">Is equal to</option>
                    <option value="notEqualTo">Is not equal to</option>
                    <option value="between">Is between</option>
                    <option value="contains">Text contains</option>
                    <option value="startsWith">Text starts with</option>
                    <option value="isEmpty">Is empty</option>
                    <option value="isNotEmpty">Is not empty</option>
                  </select>
                </div>

                {!['isEmpty', 'isNotEmpty'].includes(operator) && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={val1}
                      onChange={(e) => setVal1(e.target.value)}
                      placeholder="Value / text"
                      style={{
                        flex: 1,
                        padding: '5px 8px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-strong)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    {operator === 'between' && (
                      <input
                        type="text"
                        value={val2}
                        onChange={(e) => setVal2(e.target.value)}
                        placeholder="Max value"
                        style={{
                          flex: 1,
                          padding: '5px 8px',
                          fontSize: '12px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-strong)',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    )}
                  </div>
                )}

                {/* Preset Style Swatches */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600 }}>Fill / Text:</span>
                  <div
                    onClick={() => { setBgColor('#bbf7d0'); setTextColor('#14532d'); }}
                    style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#bbf7d0', color: '#14532d', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Soft Green
                  </div>
                  <div
                    onClick={() => { setBgColor('#fef08a'); setTextColor('#854d0e'); }}
                    style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#fef08a', color: '#854d0e', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Soft Yellow
                  </div>
                  <div
                    onClick={() => { setBgColor('#fca5a5'); setTextColor('#991b1b'); }}
                    style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#fca5a5', color: '#991b1b', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Soft Red
                  </div>
                </div>
              </div>
            ) : (
              /* Color Scale Heatmap Controls */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '11px' }}>Min:</span>
                    <input type="color" value={minColor} onChange={(e) => setMinColor(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '11px' }}>Mid:</span>
                    <input type="color" value={midColor} onChange={(e) => setMidColor(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '11px' }}>Max:</span>
                    <input type="color" value={maxColor} onChange={(e) => setMaxColor(e.target.value)} />
                  </div>
                </div>
                {/* Heatmap Preview Gradient */}
                <div
                  style={{
                    height: '18px',
                    borderRadius: '4px',
                    background: `linear-gradient(to right, ${minColor}, ${midColor}, ${maxColor})`,
                  }}
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleAddRule}
              className="btn-primary"
              style={{ justifyContent: 'center', marginTop: '4px', padding: '6px' }}
            >
              <Plus size={14} /> Add Rule
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button className="btn-primary" onClick={onClose} style={{ padding: '6px 20px' }}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
