import React, { useState, useEffect, useRef } from 'react';
import { Check, X, ChevronDown, Sparkles, Lightbulb } from 'lucide-react';
import { FUNCTIONS } from '../../core/formulaEvaluator';
import { extractFormulaTokensWithColors } from '../../core/cellUtils';

interface FormulaBarProps {
  activeCellKey: string;
  selectionString: string;
  formulaValue: string;
  onChangeFormula: (val: string) => void;
  onCommitFormula: () => void;
  onCancelFormula: () => void;
  onNavigateToCell: (cellKey: string) => void;
  onOpenFormulaExplainer?: () => void;
}

const CATEGORIZED_FUNCTIONS = [
  {
    category: 'AI Functions',
    icon: '✨',
    funcs: [
      { name: 'AI', syntax: '=AI("prompt", [cell])', desc: 'Process text using AI natural language' },
      { name: 'AI_SENTIMENT', syntax: '=AI_SENTIMENT(cell)', desc: 'Detect Positive, Neutral, or Negative sentiment' },
      { name: 'AI_EXTRACT', syntax: '=AI_EXTRACT(cell, "email")', desc: 'Extract email, phone, or entity from text' },
      { name: 'AI_TRANSLATE', syntax: '=AI_TRANSLATE(cell, "Spanish")', desc: 'Translate cell text to target language' },
      { name: 'AI_CLASSIFY', syntax: '=AI_CLASSIFY(cell, "High, Medium, Low")', desc: 'Categorize text into options' },
    ],
  },
  {
    category: 'Math & Statistics',
    icon: '∑',
    funcs: [
      { name: 'SUM', syntax: '=SUM(range)', desc: 'Sum of all numbers in range' },
      { name: 'AVERAGE', syntax: '=AVERAGE(range)', desc: 'Mean average of numbers' },
      { name: 'COUNT', syntax: '=COUNT(range)', desc: 'Count numeric values' },
      { name: 'COUNTA', syntax: '=COUNTA(range)', desc: 'Count non-empty cells' },
      { name: 'MIN', syntax: '=MIN(range)', desc: 'Smallest value in range' },
      { name: 'MAX', syntax: '=MAX(range)', desc: 'Largest value in range' },
      { name: 'ROUND', syntax: '=ROUND(num, decimals)', desc: 'Round to decimal places' },
      { name: 'PRODUCT', syntax: '=PRODUCT(range)', desc: 'Multiply all numbers in range' },
    ],
  },
  {
    category: 'Logical & Lookup',
    icon: '⎇',
    funcs: [
      { name: 'IF', syntax: '=IF(condition, value_if_true, value_if_false)', desc: 'Conditional logic evaluation' },
      { name: 'IFS', syntax: '=IFS(cond1, val1, cond2, val2...)', desc: 'Multiple condition branches' },
      { name: 'VLOOKUP', syntax: '=VLOOKUP(val, table, col_idx, exact)', desc: 'Vertical table search' },
      { name: 'INDEX', syntax: '=INDEX(range, row, col)', desc: 'Fetch cell by row/col coordinates' },
      { name: 'MATCH', syntax: '=MATCH(val, range)', desc: 'Position index of matching item' },
      { name: 'COUNTIF', syntax: '=COUNTIF(range, ">50")', desc: 'Count cells meeting criterion' },
      { name: 'SUMIF', syntax: '=SUMIF(range, ">0", sum_range)', desc: 'Sum cells meeting criterion' },
    ],
  },
  {
    category: 'Text Manipulation',
    icon: 'Tt',
    funcs: [
      { name: 'CONCATENATE', syntax: '=CONCATENATE(text1, text2)', desc: 'Combine multiple text strings' },
      { name: 'TEXTJOIN', syntax: '=TEXTJOIN(", ", TRUE, range)', desc: 'Join range with delimiter' },
      { name: 'LEFT', syntax: '=LEFT(text, num_chars)', desc: 'Extract starting characters' },
      { name: 'RIGHT', syntax: '=RIGHT(text, num_chars)', desc: 'Extract ending characters' },
      { name: 'MID', syntax: '=MID(text, start, length)', desc: 'Extract middle characters' },
      { name: 'TRIM', syntax: '=TRIM(text)', desc: 'Remove excess whitespace' },
      { name: 'UPPER', syntax: '=UPPER(text)', desc: 'Convert text to uppercase' },
      { name: 'LOWER', syntax: '=LOWER(text)', desc: 'Convert text to lowercase' },
    ],
  },
  {
    category: 'Date & Time',
    icon: '📅',
    funcs: [
      { name: 'TODAY', syntax: '=TODAY()', desc: 'Current date (YYYY-MM-DD)' },
      { name: 'NOW', syntax: '=NOW()', desc: 'Current date and timestamp' },
      { name: 'YEAR', syntax: '=YEAR(date)', desc: 'Extract year from date' },
      { name: 'MONTH', syntax: '=MONTH(date)', desc: 'Extract month number (1-12)' },
      { name: 'DAY', syntax: '=DAY(date)', desc: 'Extract day of month' },
    ],
  },
];

export const FormulaBar: React.FC<FormulaBarProps> = ({
  activeCellKey,
  selectionString,
  formulaValue,
  onChangeFormula,
  onCommitFormula,
  onCancelFormula,
  onNavigateToCell,
  onOpenFormulaExplainer,
}) => {
  const [coordsInput, setCoordsInput] = useState(activeCellKey);
  const [fxOpen, setFxOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCoordsInput(selectionString || activeCellKey);
  }, [selectionString, activeCellKey]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setFxOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCoordsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (coordsInput.trim()) {
      onNavigateToCell(coordsInput.trim().toUpperCase());
    }
  };

  const handleInsertFunction = (syntax: string) => {
    onChangeFormula(syntax);
    setFxOpen(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const tokens = extractFormulaTokensWithColors(formulaValue);

  return (
    <div
      ref={dropdownRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'relative',
        zIndex: 30,
      }}
    >
      {/* Name / Coordinate Box */}
      <form onSubmit={handleCoordsSubmit}>
        <input
          type="text"
          value={coordsInput}
          onChange={(e) => setCoordsInput(e.target.value)}
          style={{
            width: '74px',
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: 600,
            padding: '4px 6px',
            border: '1px solid var(--border-strong)',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-surface-secondary)',
            color: 'var(--text-primary)',
            outline: 'none',
            fontFamily: 'var(--font-mono)',
          }}
          title="Active cell / range"
        />
      </form>

      {/* fx button */}
      <div style={{ position: 'relative' }}>
        <button
          className="btn-icon"
          onClick={() => setFxOpen(!fxOpen)}
          style={{
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            color: 'var(--accent-blue)',
            fontWeight: 700,
            fontSize: '14px',
            fontStyle: 'italic',
          }}
          title="Insert Function library"
        >
          <span>fx</span>
          <ChevronDown size={12} />
        </button>

        {/* Function catalog dropdown */}
        {fxOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '4px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              boxShadow: 'var(--shadow-xl)',
              padding: '8px',
              width: '340px',
              maxHeight: '380px',
              overflowY: 'auto',
              zIndex: 100,
            }}
          >
            {CATEGORIZED_FUNCTIONS.map((cat) => (
              <div key={cat.category} style={{ marginBottom: '8px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    padding: '4px 6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.category}</span>
                </div>
                {cat.funcs.map((f) => (
                  <div
                    key={f.name}
                    onClick={() => handleInsertFunction(f.syntax)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '12px', color: 'var(--accent-blue)' }}>
                        {f.name}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {f.desc}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cancel / Commit buttons */}
      {formulaValue && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button className="btn-icon" onClick={onCancelFormula} title="Cancel (Esc)" style={{ color: '#ef4444', padding: '3px' }}>
            <X size={14} />
          </button>
          <button className="btn-icon" onClick={onCommitFormula} title="Commit (Enter)" style={{ color: '#10b981', padding: '3px' }}>
            <Check size={14} />
          </button>
        </div>
      )}

      {/* Formula Input Box */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input
          ref={inputRef}
          type="text"
          value={formulaValue}
          onChange={(e) => onChangeFormula(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCommitFormula();
            else if (e.key === 'Escape') onCancelFormula();
          }}
          placeholder="Enter a value or formula (e.g. =SUM(A1:A10) or =AI('summarize', A1))"
          style={{
            flex: 1,
            fontSize: '13px',
            fontFamily: 'var(--font-mono)',
            padding: '5px 10px',
            borderRadius: '4px',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            outline: 'none',
          }}
        />

        {/* Explain Formula Action */}
        {formulaValue.startsWith('=') && (
          <button
            type="button"
            onClick={onOpenFormulaExplainer}
            className="btn-icon"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              padding: '4px 8px',
              backgroundColor: 'var(--accent-blue-subtle)',
              color: 'var(--accent-blue)',
              fontWeight: 600,
            }}
            title="Explain this formula step-by-step with AI"
          >
            <Lightbulb size={13} />
            <span>Explain</span>
          </button>
        )}
      </div>
    </div>
  );
};
