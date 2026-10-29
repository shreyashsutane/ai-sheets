import React, { useState, useRef, useEffect } from 'react';
import { Plus, ChevronDown, Trash2, Copy, Edit3, Palette, ArrowLeft, ArrowRight } from 'lucide-react';
import { Workbook, SheetData, SelectionRange, CellCoords } from '../../types/spreadsheet';
import { expandRange } from '../../core/cellUtils';

interface SheetTabsProps {
  workbook: Workbook;
  activeSheetId: string;
  selection: SelectionRange;
  onSelectSheet: (sheetId: string) => void;
  onAddSheet: () => void;
  onRenameSheet: (sheetId: string, newName: string) => void;
  onDuplicateSheet: (sheetId: string) => void;
  onDeleteSheet: (sheetId: string) => void;
  onChangeSheetColor: (sheetId: string, color?: string) => void;
}

const TAB_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

export const SheetTabs: React.FC<SheetTabsProps> = ({
  workbook,
  activeSheetId,
  selection,
  onSelectSheet,
  onAddSheet,
  onRenameSheet,
  onDuplicateSheet,
  onDeleteSheet,
  onChangeSheetColor,
}) => {
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [activeMenuSheetId, setActiveMenuSheetId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeSheet = workbook.sheets.find((s) => s.id === activeSheetId) || workbook.sheets[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuSheetId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStartRename = (sheet: SheetData) => {
    setEditingSheetId(sheet.id);
    setEditingName(sheet.name);
    setActiveMenuSheetId(null);
  };

  const handleFinishRename = (sheetId: string) => {
    setEditingSheetId(null);
    if (editingName.trim()) {
      onRenameSheet(sheetId, editingName.trim());
    }
  };

  // Compute live selection statistics for the bottom-right status bar
  const stats = React.useMemo(() => {
    if (!activeSheet) return null;
    const cellKeys = expandRange(selection);
    const nums: number[] = [];
    let countA = 0;

    for (const key of cellKeys) {
      const cell = activeSheet.cells[key];
      const val = cell?.computedValue !== undefined ? cell.computedValue : cell?.value;
      if (val !== null && val !== undefined && String(val).trim() !== '') {
        countA++;
        const num = Number(val);
        if (!isNaN(num) && typeof val !== 'boolean') {
          nums.push(num);
        }
      }
    }

    if (nums.length === 0 && countA <= 1) return null;

    const sum = nums.reduce((a, b) => a + b, 0);
    const avg = nums.length > 0 ? sum / nums.length : 0;
    const min = nums.length > 0 ? Math.min(...nums) : 0;
    const max = nums.length > 0 ? Math.max(...nums) : 0;

    return {
      sum: nums.length > 0 ? sum : null,
      avg: nums.length > 0 ? avg : null,
      min: nums.length > 0 ? min : null,
      max: nums.length > 0 ? max : null,
      count: nums.length,
      countA,
    };
  }, [activeSheet, selection]);

  return (
    <div
      ref={menuRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '36px',
        backgroundColor: 'var(--bg-header)',
        borderTop: '1px solid var(--border-subtle)',
        padding: '0 8px',
        position: 'relative',
        zIndex: 35,
      }}
    >
      {/* Left: + Add Sheet & Tabs List */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto' }}>
        <button
          className="btn-icon"
          onClick={onAddSheet}
          title="Add Sheet"
          style={{ width: '28px', height: '28px', padding: 0 }}
        >
          <Plus size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {workbook.sheets.map((sheet) => {
            const isActive = sheet.id === activeSheetId;

            return (
              <div
                key={sheet.id}
                onClick={() => onSelectSheet(sheet.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  height: '28px',
                  borderRadius: '6px 6px 0 0',
                  fontSize: '12px',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--bg-surface)' : 'transparent',
                  borderBottom: isActive ? '2px solid var(--accent-blue)' : '2px solid transparent',
                  cursor: 'pointer',
                  position: 'relative',
                  userSelect: 'none',
                  border: isActive ? '1px solid var(--border-subtle)' : '1px solid transparent',
                  borderBottomColor: isActive ? 'var(--accent-blue)' : 'transparent',
                }}
              >
                {/* Color Dot if set */}
                {sheet.color && (
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: sheet.color,
                    }}
                  />
                )}

                {/* Sheet Name (editable on double click) */}
                {editingSheetId === sheet.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => handleFinishRename(sheet.id)}
                    onKeyDown={(e) => e.key === 'Enter' && handleFinishRename(sheet.id)}
                    autoFocus
                    style={{
                      width: '70px',
                      fontSize: '12px',
                      padding: '1px 3px',
                      border: '1px solid var(--accent-blue)',
                      outline: 'none',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                    }}
                  />
                ) : (
                  <span onDoubleClick={() => handleStartRename(sheet)}>
                    {sheet.name}
                  </span>
                )}

                {/* Dropdown Arrow */}
                <button
                  className="btn-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuSheetId(activeMenuSheetId === sheet.id ? null : sheet.id);
                  }}
                  style={{ padding: '2px', marginLeft: '2px' }}
                >
                  <ChevronDown size={12} />
                </button>

                {/* Sheet Tab Dropdown Menu */}
                {activeMenuSheetId === sheet.id && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: 0,
                      marginBottom: '4px',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      boxShadow: 'var(--shadow-xl)',
                      padding: '6px 0',
                      minWidth: '180px',
                      zIndex: 100,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={tabMenuItem} onClick={() => handleStartRename(sheet)}>
                      <Edit3 size={13} /> Rename
                    </div>
                    <div style={tabMenuItem} onClick={() => { onDuplicateSheet(sheet.id); setActiveMenuSheetId(null); }}>
                      <Copy size={13} /> Duplicate
                    </div>
                    <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 0' }} />
                    <div style={{ padding: '4px 12px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                      TAB COLOR
                    </div>
                    <div style={{ display: 'flex', gap: '4px', padding: '4px 12px' }}>
                      {TAB_COLORS.map((c) => (
                        <div
                          key={c}
                          onClick={() => { onChangeSheetColor(sheet.id, c); setActiveMenuSheetId(null); }}
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            backgroundColor: c,
                            cursor: 'pointer',
                          }}
                        />
                      ))}
                      <div
                        onClick={() => { onChangeSheetColor(sheet.id, undefined); setActiveMenuSheetId(null); }}
                        title="Clear color"
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          border: '1px dashed var(--text-muted)',
                          cursor: 'pointer',
                        }}
                      />
                    </div>
                    {workbook.sheets.length > 1 && (
                      <>
                        <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 0' }} />
                        <div
                          style={{ ...tabMenuItem, color: '#ef4444' }}
                          onClick={() => { onDeleteSheet(sheet.id); setActiveMenuSheetId(null); }}
                        >
                          <Trash2 size={13} /> Delete Sheet
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Live Quick Metrics Status Bar */}
      {stats && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--bg-surface-secondary)',
            padding: '3px 10px',
            borderRadius: '4px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {stats.sum !== null && (
            <span>
              <strong>Sum:</strong> {stats.sum.toLocaleString()}
            </span>
          )}
          {stats.avg !== null && (
            <span>
              <strong>Avg:</strong> {stats.avg.toFixed(2)}
            </span>
          )}
          {stats.min !== null && (
            <span>
              <strong>Min:</strong> {stats.min.toLocaleString()}
            </span>
          )}
          {stats.max !== null && (
            <span>
              <strong>Max:</strong> {stats.max.toLocaleString()}
            </span>
          )}
          <span>
            <strong>Count:</strong> {stats.countA}
          </span>
        </div>
      )}
    </div>
  );
};

const tabMenuItem: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 12px',
  fontSize: '12px',
  color: 'var(--text-primary)',
  cursor: 'pointer',
};
