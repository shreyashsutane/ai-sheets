import React, { useState, useMemo } from 'react';
import { X, Table2, Plus, Sparkles, ArrowRight } from 'lucide-react';
import { SheetData, SelectionRange, PivotConfig } from '../../types/spreadsheet';
import { rangeToString, parseRangeString, coordsToCellKey } from '../../core/cellUtils';
import { generatePivotSheet } from '../../core/pivotEngine';

interface PivotTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: SheetData;
  selection: SelectionRange;
  onCreatePivotSheet: (pivotSheet: SheetData) => void;
}

export const PivotTableModal: React.FC<PivotTableModalProps> = ({
  isOpen,
  onClose,
  sheet,
  selection,
  onCreatePivotSheet,
}) => {
  const [sourceRangeStr, setSourceRangeStr] = useState(rangeToString(selection));
  const [rowColIdx, setRowColIdx] = useState<number>(0);
  const [colColIdx, setColColIdx] = useState<number | ''>('');
  const [valColIdx, setValColIdx] = useState<number>(1);
  const [aggregation, setAggregation] = useState<PivotConfig['aggregation']>('SUM');

  // Extract column headers from source range
  const headers = useMemo(() => {
    const range = parseRangeString(sourceRangeStr) || selection;
    const list: { label: string; colIdx: number }[] = [];
    for (let c = range.startCol; c <= range.endCol; c++) {
      const key = coordsToCellKey(range.startRow, c);
      const cell = sheet.cells[key];
      list.push({
        label: cell?.value ? String(cell.value) : `Column ${c + 1}`,
        colIdx: c,
      });
    }
    return list;
  }, [sheet, sourceRangeStr, selection]);

  if (!isOpen) return null;

  const handleGenerate = () => {
    try {
      const config: PivotConfig = {
        sourceRange: sourceRangeStr,
        rowFieldCol: rowColIdx,
        colFieldCol: colColIdx !== '' ? Number(colColIdx) : undefined,
        valueFieldCol: valColIdx,
        aggregation,
      };
      const pivotSheet = generatePivotSheet(sheet, config);
      onCreatePivotSheet(pivotSheet);
      onClose();
    } catch (err: any) {
      alert(`Pivot Error: ${err.message}`);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ width: '500px' }}
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
            <Table2 size={18} color="var(--accent-blue)" />
            <span style={{ fontSize: '15px', fontWeight: 600 }}>Create Pivot Table</span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Source Range */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Data Source Range
            </label>
            <input
              type="text"
              value={sourceRangeStr}
              onChange={(e) => setSourceRangeStr(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                borderRadius: '4px',
                border: '1px solid var(--border-strong)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Row Group Field */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Rows (Group By)
            </label>
            <select
              value={rowColIdx}
              onChange={(e) => setRowColIdx(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '12px',
                borderRadius: '4px',
                border: '1px solid var(--border-strong)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
              }}
            >
              {headers.map((h) => (
                <option key={h.colIdx} value={h.colIdx}>
                  {h.label}
                </option>
              ))}
            </select>
          </div>

          {/* Column Group Field (Optional) */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Columns (Optional Sub-grouping)
            </label>
            <select
              value={colColIdx}
              onChange={(e) => setColColIdx(e.target.value === '' ? '' : Number(e.target.value))}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '12px',
                borderRadius: '4px',
                border: '1px solid var(--border-strong)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">(None)</option>
              {headers.map((h) => (
                <option key={h.colIdx} value={h.colIdx}>
                  {h.label}
                </option>
              ))}
            </select>
          </div>

          {/* Value Field & Aggregation Function */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Values
              </label>
              <select
                value={valColIdx}
                onChange={(e) => setValColIdx(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  fontSize: '12px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-strong)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                }}
              >
                {headers.map((h) => (
                  <option key={h.colIdx} value={h.colIdx}>
                    {h.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Summarize by
              </label>
              <select
                value={aggregation}
                onChange={(e) => setAggregation(e.target.value as PivotConfig['aggregation'])}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  fontSize: '12px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-strong)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="SUM">SUM</option>
                <option value="AVERAGE">AVERAGE</option>
                <option value="COUNT">COUNT</option>
                <option value="MIN">MIN</option>
                <option value="MAX">MAX</option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <button type="button" className="btn-icon" onClick={onClose} style={{ padding: '6px 14px' }}>
              Cancel
            </button>
            <button type="button" onClick={handleGenerate} className="btn-primary" style={{ padding: '6px 18px' }}>
              <Plus size={14} /> Create Pivot Sheet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
