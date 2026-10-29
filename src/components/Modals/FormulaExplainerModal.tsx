import React, { useMemo } from 'react';
import { X, Sparkles, Lightbulb, Wrench, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { SheetData, CellCoords } from '../../types/spreadsheet';
import { coordsToCellKey, extractFormulaTokensWithColors, expandRange } from '../../core/cellUtils';

interface FormulaExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  cellKey: string;
  sheet: SheetData;
  onApplyFixedFormula: (cellKey: string, newFormula: string) => void;
}

export const FormulaExplainerModal: React.FC<FormulaExplainerModalProps> = ({
  isOpen,
  onClose,
  cellKey,
  sheet,
  onApplyFixedFormula,
}) => {
  const cell = sheet.cells[cellKey];
  const formula = cell?.formula || '';
  const computedVal = cell?.computedValue;
  const isError = typeof computedVal === 'string' && computedVal.startsWith('#');

  // Breakdown referenced cells & their values
  const tokenBreakdown = useMemo(() => {
    if (!formula.startsWith('=')) return [];
    const tokens = extractFormulaTokensWithColors(formula);
    return tokens.map((t) => {
      const keys = expandRange(t.range);
      const values = keys.map((k) => {
        const c = sheet.cells[k];
        return {
          key: k,
          val: c?.computedValue !== undefined ? c.computedValue : (c?.value ?? '(blank)'),
        };
      });
      return { token: t.ref, color: t.color, values };
    });
  }, [formula, sheet]);

  // AI error diagnosis & auto-fix proposition
  const fixSuggestion = useMemo(() => {
    if (!isError) return null;
    if (computedVal === '#DIV/0!') {
      return {
        explanation: 'Division by zero error: The denominator cell evaluates to 0 or is empty.',
        fixedFormula: formula.replace(/=([A-Z0-9$]+)\/([A-Z0-9$]+)/i, '=IF($2=0, 0, $1/$2)'),
      };
    }
    if (computedVal === '#CYCLE!') {
      return {
        explanation: 'Circular dependency detected: This cell references itself directly or indirectly in a loop.',
        fixedFormula: formula.replace(new RegExp(cellKey, 'gi'), '0'),
      };
    }
    if (computedVal === '#NAME?') {
      return {
        explanation: 'Unrecognized function name: Check for spelling typos in function names.',
        fixedFormula: formula.toUpperCase(),
      };
    }
    return {
      explanation: 'Formula evaluation issue with values or types in referenced cells.',
      fixedFormula: `=IFERROR(${formula.replace(/^=/, '')}, "")`,
    };
  }, [isError, computedVal, formula, cellKey]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ width: '560px' }}
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
            <Sparkles size={18} color="var(--accent-blue)" />
            <span style={{ fontSize: '15px', fontWeight: 600 }}>AI Formula Explainer & Debugger</span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Cell & Formula Info Card */}
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-surface-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                Target Cell: {cellKey}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: isError ? '#ef4444' : '#10b981',
                }}
              >
                Output: {String(computedVal ?? '(empty)')}
              </span>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--accent-blue)',
                padding: '6px 10px',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: '4px',
                border: '1px solid var(--border-strong)',
              }}
            >
              {formula || '(No formula in this cell)'}
            </div>
          </div>

          {/* Referenced Cells & Values Breakdown */}
          {tokenBreakdown.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Lightbulb size={14} color="var(--accent-blue)" />
                Step-by-Step Referenced Values
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                {tokenBreakdown.map((t, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-surface-secondary)',
                      borderLeft: `4px solid ${t.color}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: t.color }}>
                      {t.token}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {t.values.map((v) => `${v.key}: ${v.val}`).join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Auto-Fixer Card (if error detected) */}
          {isError && fixSuggestion && (
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', fontWeight: 600, fontSize: '13px' }}>
                <AlertCircle size={16} /> Error Diagnosis
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                {fixSuggestion.explanation}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--accent-blue)' }}>
                  {fixSuggestion.fixedFormula}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onApplyFixedFormula(cellKey, fixSuggestion.fixedFormula);
                    onClose();
                  }}
                  className="btn-primary"
                  style={{ fontSize: '11px', padding: '4px 10px', backgroundColor: '#10b981' }}
                >
                  <Wrench size={12} /> Apply Fix
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button className="btn-primary" onClick={onClose} style={{ padding: '6px 18px' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
