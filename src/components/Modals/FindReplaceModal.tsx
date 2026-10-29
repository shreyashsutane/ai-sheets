import React, { useState } from 'react';
import { X, Search, Replace, ArrowRight } from 'lucide-react';
import { SheetData, CellCoords } from '../../types/spreadsheet';
import { coordsToCellKey, cellKeyToCoords } from '../../core/cellUtils';

interface FindReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: SheetData;
  onNavigateToCell: (coords: CellCoords) => void;
  onReplaceAll: (findText: string, replaceText: string, matchCase: boolean) => void;
}

export const FindReplaceModal: React.FC<FindReplaceModalProps> = ({
  isOpen,
  onClose,
  sheet,
  onNavigateToCell,
  onReplaceAll,
}) => {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [matchCount, setMatchCount] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleFind = (e: React.FormEvent) => {
    e.preventDefault();
    if (!findText.trim()) return;

    let count = 0;
    let firstMatch: CellCoords | null = null;

    for (const [key, cell] of Object.entries(sheet.cells)) {
      const valStr = String(cell.computedValue !== undefined ? cell.computedValue : (cell.value ?? ''));
      const textToSearch = matchCase ? valStr : valStr.toLowerCase();
      const target = matchCase ? findText : findText.toLowerCase();

      if (textToSearch.includes(target)) {
        count++;
        if (!firstMatch) {
          firstMatch = cellKeyToCoords(key);
        }
      }
    }

    setMatchCount(count);
    if (firstMatch) {
      onNavigateToCell(firstMatch);
    }
  };

  const handleReplace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!findText.trim()) return;
    onReplaceAll(findText, replaceText, matchCase);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ width: '460px' }}
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
            <Search size={16} color="var(--accent-blue)" />
            <span style={{ fontSize: '15px', fontWeight: 600 }}>Find and Replace</span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleFind} style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Find
            </label>
            <input
              type="text"
              value={findText}
              onChange={(e) => {
                setFindText(e.target.value);
                setMatchCount(null);
              }}
              placeholder="Text to find..."
              autoFocus
              style={{
                width: '100%',
                padding: '7px 10px',
                fontSize: '13px',
                borderRadius: '6px',
                border: '1px solid var(--border-strong)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Replace with
            </label>
            <input
              type="text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="Replacement text..."
              style={{
                width: '100%',
                padding: '7px 10px',
                fontSize: '13px',
                borderRadius: '6px',
                border: '1px solid var(--border-strong)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={matchCase}
              onChange={(e) => setMatchCase(e.target.checked)}
            />
            <span>Match case</span>
          </label>

          {matchCount !== null && (
            <div style={{ fontSize: '12px', color: matchCount > 0 ? 'var(--accent-blue)' : '#ef4444' }}>
              {matchCount > 0 ? `Found ${matchCount} occurrence(s)` : 'No matches found'}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <button
              type="submit"
              className="btn-icon"
              style={{ padding: '6px 14px', fontSize: '13px' }}
            >
              Find Next
            </button>
            <button
              type="button"
              onClick={handleReplace}
              className="btn-primary"
              disabled={!findText.trim()}
              style={{ padding: '6px 16px', fontSize: '13px' }}
            >
              Replace All
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
