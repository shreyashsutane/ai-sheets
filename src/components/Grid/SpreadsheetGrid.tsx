import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  SheetData,
  SelectionRange,
  CellCoords,
  CellData,
  CellFormat,
  DropdownOption,
  FormulaTokenColor,
} from '../../types/spreadsheet';
import {
  colIndexToLetter,
  colLetterToIndex,
  coordsToCellKey,
  cellKeyToCoords,
  normalizeRange,
  rangeToString,
  formatCellValue,
  shiftFormula,
  predictFillSequence,
  extractFormulaTokensWithColors,
} from '../../core/cellUtils';
import { getConditionalFormatStyle } from '../../core/conditionalFormatting';
import { Filter, ChevronDown, ArrowUpAZ, ArrowDownAZ, Check, Search } from 'lucide-react';

interface SpreadsheetGridProps {
  sheet: SheetData;
  activeCoords: CellCoords;
  selection: SelectionRange;
  isEditing: boolean;
  editValue: string;
  onSelectCell: (coords: CellCoords, isShiftKey?: boolean) => void;
  onUpdateSelection: (selection: SelectionRange) => void;
  onStartEditing: (initialVal?: string) => void;
  onCommitEdit: (value: string) => void;
  onCancelEdit: () => void;
  onEditChange: (val: string) => void;
  onApplyFill: (sourceRange: SelectionRange, targetRange: SelectionRange) => void;
  onInsertRow: (above: boolean) => void;
  onInsertCol: (left: boolean) => void;
  onDeleteRow: () => void;
  onDeleteCol: () => void;
  onClearRange: () => void;
  onOpenChartForSelection: () => void;
  onAskAIForSelection: () => void;
  onCopySelection: () => void;
  onPasteClipboard: () => void;
  onSortColumn?: (colIndex: number, direction: 'asc' | 'desc') => void;
  onFilterColumnValues?: (colIndex: number, hiddenValues: Set<string>) => void;
}

const DEFAULT_ROW_HEIGHT = 26;
const DEFAULT_COL_WIDTH = 100;
const ROW_HEADER_WIDTH = 46;
const COL_HEADER_HEIGHT = 26;
const OVERSCAN = 5;

export const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({
  sheet,
  activeCoords,
  selection,
  isEditing,
  editValue,
  onSelectCell,
  onUpdateSelection,
  onStartEditing,
  onCommitEdit,
  onCancelEdit,
  onEditChange,
  onApplyFill,
  onInsertRow,
  onInsertCol,
  onDeleteRow,
  onDeleteCol,
  onClearRange,
  onOpenChartForSelection,
  onAskAIForSelection,
  onCopySelection,
  onPasteClipboard,
  onSortColumn,
  onFilterColumnValues,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorInputRef = useRef<HTMLInputElement>(null);

  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportSize, setViewportSize] = useState({ width: 1200, height: 700 });

  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<CellCoords | null>(null);

  // Fill handle dragging state
  const [isDraggingFill, setIsDraggingFill] = useState(false);
  const [fillTargetRange, setFillTargetRange] = useState<SelectionRange | null>(null);

  // Column / Row Resizing state
  const [resizingCol, setResizingCol] = useState<{ col: number; startX: number; startWidth: number } | null>(null);
  const [resizingRow, setResizingRow] = useState<{ row: number; startY: number; startHeight: number } | null>(null);
  const [colWidths, setColWidths] = useState<Record<number, number>>(sheet.colWidths || {});
  const [rowHeights, setRowHeights] = useState<Record<number, number>>(sheet.rowHeights || {});

  // Dropdown Selection Popup state
  const [openDropdownCell, setOpenDropdownCell] = useState<{
    key: string;
    options: DropdownOption[];
    x: number;
    y: number;
  } | null>(null);

  // Filter Header Popup state
  const [filterMenuCol, setFilterMenuCol] = useState<{
    colIndex: number;
    x: number;
    y: number;
    uniqueValues: string[];
    selectedValues: Set<string>;
    searchQuery: string;
  } | null>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean } | null>(null);

  const rowCount = sheet.rowCount || 50;
  const colCount = sheet.colCount || 26;

  // Track viewport size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setViewportSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (sheet.colWidths) setColWidths(sheet.colWidths);
    if (sheet.rowHeights) setRowHeights(sheet.rowHeights);
  }, [sheet.id]);

  const getColWidth = useCallback((col: number) => colWidths[col] || DEFAULT_COL_WIDTH, [colWidths]);
  const getRowHeight = useCallback((row: number) => rowHeights[row] || DEFAULT_ROW_HEIGHT, [rowHeights]);

  // Compute cumulative positions for fast virtualization
  const { colPositions, totalWidth } = useMemo(() => {
    const pos: number[] = [0];
    let sum = 0;
    for (let c = 0; c < colCount; c++) {
      sum += getColWidth(c);
      pos.push(sum);
    }
    return { colPositions: pos, totalWidth: sum };
  }, [colCount, getColWidth]);

  const { rowPositions, totalHeight } = useMemo(() => {
    const pos: number[] = [0];
    let sum = 0;
    for (let r = 0; r < rowCount; r++) {
      sum += getRowHeight(r);
      pos.push(sum);
    }
    return { rowPositions: pos, totalHeight: sum };
  }, [rowCount, getRowHeight]);

  // Virtualized row and column ranges
  const visibleRowRange = useMemo(() => {
    let start = 0;
    while (start < rowCount - 1 && rowPositions[start + 1] < scrollTop) {
      start++;
    }
    let end = start;
    const viewBottom = scrollTop + viewportSize.height;
    while (end < rowCount - 1 && rowPositions[end] < viewBottom) {
      end++;
    }
    return {
      start: Math.max(0, start - OVERSCAN),
      end: Math.min(rowCount - 1, end + OVERSCAN),
    };
  }, [rowCount, rowPositions, scrollTop, viewportSize.height]);

  const visibleColRange = useMemo(() => {
    let start = 0;
    while (start < colCount - 1 && colPositions[start + 1] < scrollLeft) {
      start++;
    }
    let end = start;
    const viewRight = scrollLeft + viewportSize.width;
    while (end < colCount - 1 && colPositions[end] < viewRight) {
      end++;
    }
    return {
      start: Math.max(0, start - OVERSCAN),
      end: Math.min(colCount - 1, end + OVERSCAN),
    };
  }, [colCount, colPositions, scrollLeft, viewportSize.width]);

  // Formula Reference Highlight Bounding Boxes
  const formulaHighlightTokens: FormulaTokenColor[] = useMemo(() => {
    if (isEditing && editValue.startsWith('=')) {
      return extractFormulaTokensWithColors(editValue);
    }
    return [];
  }, [isEditing, editValue]);

  // Handle scroll events
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
    setScrollLeft(e.currentTarget.scrollLeft);
  };

  // Keyboard navigation & Shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isEditing) {
      if (e.key === 'Enter') {
        e.preventDefault();
        onCommitEdit(editValue);
        onSelectCell({ row: Math.min(rowCount - 1, activeCoords.row + 1), col: activeCoords.col });
      } else if (e.key === 'Tab') {
        e.preventDefault();
        onCommitEdit(editValue);
        onSelectCell({ row: activeCoords.row, col: Math.min(colCount - 1, activeCoords.col + 1) });
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancelEdit();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      onSelectCell({ row: Math.min(rowCount - 1, activeCoords.row + 1), col: activeCoords.col }, e.shiftKey);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      onSelectCell({ row: Math.max(0, activeCoords.row - 1), col: activeCoords.col }, e.shiftKey);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onSelectCell({ row: activeCoords.row, col: Math.min(colCount - 1, activeCoords.col + 1) }, e.shiftKey);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onSelectCell({ row: activeCoords.row, col: Math.max(0, activeCoords.col - 1) }, e.shiftKey);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      onSelectCell({ row: activeCoords.row, col: Math.min(colCount - 1, activeCoords.col + 1) });
    } else if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      const activeKey = coordsToCellKey(activeCoords.row, activeCoords.col);
      const cell = sheet.cells[activeKey];
      onStartEditing(cell?.formula || String(cell?.value ?? ''));
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onClearRange();
    } else if (e.ctrlKey || e.metaKey) {
      if (e.key === 'c') {
        e.preventDefault();
        onCopySelection();
      } else if (e.key === 'v') {
        onPasteClipboard();
      }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      onStartEditing(e.key);
    }
  };

  // Mouse handlers for cell selection
  const handleCellMouseDown = (row: number, col: number, e: React.MouseEvent) => {
    if (e.button === 2) return;

    const cellKey = coordsToCellKey(row, col);
    const cell = sheet.cells[cellKey];

    // Handle interactive checkbox toggle
    if (cell?.format?.validation?.type === 'checkbox') {
      const currentBool = !!cell.value;
      onCommitEdit(String(!currentBool).toUpperCase());
      onSelectCell({ row, col });
      return;
    }

    // Handle interactive dropdown badge click
    if (cell?.format?.validation?.type === 'dropdown' && cell.format.validation.options) {
      const rect = e.currentTarget.getBoundingClientRect();
      setOpenDropdownCell({
        key: cellKey,
        options: cell.format.validation.options,
        x: rect.left,
        y: rect.bottom + 2,
      });
      onSelectCell({ row, col });
      return;
    }

    if (isEditing) {
      if (editValue.startsWith('=')) {
        onEditChange(`${editValue}${cellKey}`);
        return;
      }
      onCommitEdit(editValue);
    }

    setIsSelecting(true);
    setSelectionStart({ row, col });
    onSelectCell({ row, col }, e.shiftKey);
    setContextMenu(null);
    setOpenDropdownCell(null);
    setFilterMenuCol(null);
  };

  const handleCellMouseEnter = (row: number, col: number) => {
    if (isSelecting && selectionStart) {
      onUpdateSelection({
        startRow: selectionStart.row,
        startCol: selectionStart.col,
        endRow: row,
        endCol: col,
      });
    }

    if (isDraggingFill) {
      const norm = normalizeRange(selection);
      if (row > norm.endRow) {
        setFillTargetRange({
          startRow: norm.startRow,
          startCol: norm.startCol,
          endRow: row,
          endCol: norm.endCol,
        });
      } else if (col > norm.endCol) {
        setFillTargetRange({
          startRow: norm.startRow,
          startCol: norm.startCol,
          endRow: norm.endRow,
          endCol: col,
        });
      }
    }
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    if (isDraggingFill && fillTargetRange) {
      setIsDraggingFill(false);
      onApplyFill(selection, fillTargetRange);
      setFillTargetRange(null);
    } else {
      setIsDraggingFill(false);
      setFillTargetRange(null);
    }
  };

  const handleFillHandleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingFill(true);
    setFillTargetRange(selection);
  };

  // Resize column / row
  const handleColResizeMouseDown = (col: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setResizingCol({ col, startX: e.clientX, startWidth: getColWidth(col) });
  };

  const handleRowResizeMouseDown = (row: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setResizingRow({ row, startY: e.clientY, startHeight: getRowHeight(row) });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizingCol) {
        const delta = e.clientX - resizingCol.startX;
        const newWidth = Math.max(35, resizingCol.startWidth + delta);
        setColWidths((prev) => ({ ...prev, [resizingCol.col]: newWidth }));
      }
      if (resizingRow) {
        const delta = e.clientY - resizingRow.startY;
        const newHeight = Math.max(20, resizingRow.startHeight + delta);
        setRowHeights((prev) => ({ ...prev, [resizingRow.row]: newHeight }));
      }
    };

    const handleGlobalMouseUp = () => {
      if (resizingCol) setResizingCol(null);
      if (resizingRow) setResizingRow(null);
      setIsSelecting(false);
      if (isDraggingFill && fillTargetRange) {
        setIsDraggingFill(false);
        onApplyFill(selection, fillTargetRange);
        setFillTargetRange(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [resizingCol, resizingRow, isDraggingFill, fillTargetRange, selection, onApplyFill]);

  // Context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      visible: true,
    });
  };

  // Open Column Filter Popup
  const handleOpenFilterMenu = (colIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

    // Extract unique values in column
    const vals = new Set<string>();
    for (let r = 1; r < rowCount; r++) {
      const key = coordsToCellKey(r, colIdx);
      const cell = sheet.cells[key];
      if (cell && cell.value !== undefined && cell.value !== '') {
        vals.add(String(cell.value));
      }
    }

    const uniqueList = Array.from(vals).sort();
    setFilterMenuCol({
      colIndex: colIdx,
      x: rect.left,
      y: rect.bottom + 2,
      uniqueValues: uniqueList,
      selectedValues: new Set(uniqueList),
      searchQuery: '',
    });
  };

  const normSelection = normalizeRange(selection);
  const activeKey = coordsToCellKey(activeCoords.row, activeCoords.col);
  const activeCellData = sheet.cells[activeKey];

  const selTop = rowPositions[normSelection.startRow] || 0;
  const selLeft = colPositions[normSelection.startCol] || 0;
  const selBottom = rowPositions[normSelection.endRow + 1] || 0;
  const selRight = colPositions[normSelection.endCol + 1] || 0;
  const selWidth = selRight - selLeft;
  const selHeight = selBottom - selTop;

  const activeTop = rowPositions[activeCoords.row] || 0;
  const activeLeft = colPositions[activeCoords.col] || 0;
  const activeWidth = getColWidth(activeCoords.col);
  const activeHeight = getRowHeight(activeCoords.row);

  let fillPreviewBox: { top: number; left: number; width: number; height: number } | null = null;
  if (isDraggingFill && fillTargetRange) {
    const fNorm = normalizeRange(fillTargetRange);
    const fTop = rowPositions[fNorm.startRow];
    const fLeft = colPositions[fNorm.startCol];
    const fWidth = (colPositions[fNorm.endCol + 1] || 0) - fLeft;
    const fHeight = (rowPositions[fNorm.endRow + 1] || 0) - fTop;
    fillPreviewBox = { top: fTop, left: fLeft, width: fWidth, height: fHeight };
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      onMouseUp={handleMouseUp}
      onContextMenu={handleContextMenu}
      tabIndex={0}
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'auto',
        backgroundColor: 'var(--bg-app)',
        outline: 'none',
      }}
    >
      <div
        style={{
          width: totalWidth + ROW_HEADER_WIDTH,
          height: totalHeight + COL_HEADER_HEIGHT,
          position: 'relative',
        }}
      >
        {/* Top-Left Corner Header */}
        <div
          onClick={() =>
            onUpdateSelection({
              startRow: 0,
              startCol: 0,
              endRow: rowCount - 1,
              endCol: colCount - 1,
            })
          }
          style={{
            position: 'sticky',
            top: 0,
            left: 0,
            width: ROW_HEADER_WIDTH,
            height: COL_HEADER_HEIGHT,
            backgroundColor: 'var(--header-grid-bg)',
            borderRight: '1px solid var(--border-grid)',
            borderBottom: '1px solid var(--border-grid)',
            zIndex: 25,
            cursor: 'pointer',
          }}
        />

        {/* Sticky Column Headers */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            left: ROW_HEADER_WIDTH,
            height: COL_HEADER_HEIGHT,
            width: totalWidth,
            display: 'flex',
            backgroundColor: 'var(--header-grid-bg)',
            borderBottom: '1px solid var(--border-grid)',
            zIndex: 20,
          }}
        >
          {Array.from({ length: visibleColRange.end - visibleColRange.start + 1 }).map((_, i) => {
            const c = visibleColRange.start + i;
            const isColSelected = c >= normSelection.startCol && c <= normSelection.endCol;
            const leftPos = colPositions[c];
            const width = getColWidth(c);

            return (
              <div
                key={c}
                onClick={() =>
                  onUpdateSelection({
                    startRow: 0,
                    startCol: c,
                    endRow: rowCount - 1,
                    endCol: c,
                  })
                }
                style={{
                  position: 'absolute',
                  left: leftPos,
                  width,
                  height: COL_HEADER_HEIGHT,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 4px 0 8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: isColSelected ? 'var(--accent-blue)' : 'var(--header-grid-text)',
                  backgroundColor: isColSelected ? 'var(--accent-blue-subtle)' : 'transparent',
                  borderRight: '1px solid var(--border-grid)',
                  userSelect: 'none',
                  cursor: 'pointer',
                }}
              >
                <span>{colIndexToLetter(c)}</span>

                {/* Column Filter Icon Button if filters active */}
                {sheet.isFilterActive && (
                  <button
                    type="button"
                    onClick={(e) => handleOpenFilterMenu(c, e)}
                    className="btn-icon"
                    style={{ padding: '2px', color: 'var(--accent-blue)' }}
                    title="Filter & Sort Column"
                  >
                    <Filter size={11} />
                  </button>
                )}

                {/* Column Resize Handle */}
                <div
                  onMouseDown={(e) => handleColResizeMouseDown(c, e)}
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    width: '5px',
                    height: '100%',
                    cursor: 'col-resize',
                    zIndex: 2,
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Sticky Row Headers */}
        <div
          style={{
            position: 'sticky',
            left: 0,
            top: COL_HEADER_HEIGHT,
            width: ROW_HEADER_WIDTH,
            height: totalHeight,
            backgroundColor: 'var(--header-grid-bg)',
            borderRight: '1px solid var(--border-grid)',
            zIndex: 15,
          }}
        >
          {Array.from({ length: visibleRowRange.end - visibleRowRange.start + 1 }).map((_, i) => {
            const r = visibleRowRange.start + i;
            const isRowSelected = r >= normSelection.startRow && r <= normSelection.endRow;
            const topPos = rowPositions[r];
            const height = getRowHeight(r);

            return (
              <div
                key={r}
                onClick={() =>
                  onUpdateSelection({
                    startRow: r,
                    startCol: 0,
                    endRow: r,
                    endCol: colCount - 1,
                  })
                }
                style={{
                  position: 'absolute',
                  top: topPos,
                  width: ROW_HEADER_WIDTH,
                  height,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: isRowSelected ? 'var(--accent-blue)' : 'var(--header-grid-text)',
                  backgroundColor: isRowSelected ? 'var(--accent-blue-subtle)' : 'transparent',
                  borderBottom: '1px solid var(--border-grid)',
                  userSelect: 'none',
                  cursor: 'pointer',
                }}
              >
                <span>{r + 1}</span>
                <div
                  onMouseDown={(e) => handleRowResizeMouseDown(r, e)}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    height: '5px',
                    cursor: 'row-resize',
                    zIndex: 2,
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Grid Cells */}
        <div
          style={{
            position: 'absolute',
            top: COL_HEADER_HEIGHT,
            left: ROW_HEADER_WIDTH,
            width: totalWidth,
            height: totalHeight,
          }}
        >
          {Array.from({ length: visibleRowRange.end - visibleRowRange.start + 1 }).map((_, rIdx) => {
            const r = visibleRowRange.start + rIdx;
            const top = rowPositions[r];
            const height = getRowHeight(r);

            return Array.from({ length: visibleColRange.end - visibleColRange.start + 1 }).map((_, cIdx) => {
              const c = visibleColRange.start + cIdx;
              const left = colPositions[c];
              const width = getColWidth(c);
              const cellKey = coordsToCellKey(r, c);
              const cellData = sheet.cells[cellKey];
              const fmt = cellData?.format || {};
              const isError = typeof cellData?.computedValue === 'string' && cellData.computedValue.startsWith('#');

              // Apply Conditional Formatting overrides
              const condStyle = getConditionalFormatStyle(
                cellKey,
                cellData?.computedValue !== undefined ? cellData.computedValue : (cellData?.value ?? null),
                sheet
              );

              const effectiveBg = condStyle?.bgColor || fmt.bgColor || 'var(--bg-surface)';
              const effectiveTextColor = isError ? '#ef4444' : condStyle?.textColor || fmt.textColor || 'var(--text-primary)';
              const effectiveBold = condStyle?.bold !== undefined ? condStyle.bold : fmt.bold;

              const isCheckbox = fmt.validation?.type === 'checkbox';
              const isDropdown = fmt.validation?.type === 'dropdown';

              const formattedText = formatCellValue(
                cellData?.computedValue !== undefined ? cellData.computedValue : (cellData?.value ?? null),
                fmt
              );

              return (
                <div
                  key={cellKey}
                  onMouseDown={(e) => handleCellMouseDown(r, c, e)}
                  onMouseEnter={() => handleCellMouseEnter(r, c)}
                  onDoubleClick={() => {
                    if (!isCheckbox) {
                      onStartEditing(cellData?.formula || String(cellData?.value ?? ''));
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top,
                    left,
                    width,
                    height,
                    padding: '2px 6px',
                    fontSize: fmt.fontSize ? `${fmt.fontSize}px` : '12px',
                    fontFamily: fmt.fontFamily || 'var(--font-sans)',
                    fontWeight: effectiveBold ? 600 : 400,
                    fontStyle: fmt.italic ? 'italic' : 'normal',
                    textDecoration: `${fmt.underline ? 'underline' : ''} ${fmt.strikethrough ? 'line-through' : ''}`.trim() || 'none',
                    textAlign: fmt.align || (typeof cellData?.value === 'number' ? 'right' : 'left'),
                    display: 'flex',
                    alignItems: fmt.verticalAlign === 'top' ? 'flex-start' : fmt.verticalAlign === 'bottom' ? 'flex-end' : 'center',
                    justifyContent: isCheckbox ? 'center' : undefined,
                    color: effectiveTextColor,
                    backgroundColor: effectiveBg,
                    borderRight: fmt.borders?.right ? `1px solid ${fmt.borders.right.color}` : '1px solid var(--border-grid)',
                    borderBottom: fmt.borders?.bottom ? `1px solid ${fmt.borders.bottom.color}` : '1px solid var(--border-grid)',
                    borderTop: fmt.borders?.top ? `1px solid ${fmt.borders.top.color}` : undefined,
                    borderLeft: fmt.borders?.left ? `1px solid ${fmt.borders.left.color}` : undefined,
                    overflow: fmt.wrapText === 'wrap' ? 'visible' : 'hidden',
                    whiteSpace: fmt.wrapText === 'wrap' ? 'normal' : 'nowrap',
                    textOverflow: fmt.wrapText === 'clip' ? 'clip' : 'ellipsis',
                    boxSizing: 'border-box',
                    userSelect: 'none',
                    cursor: isCheckbox ? 'pointer' : 'cell',
                  }}
                >
                  {/* Interactive Checkbox */}
                  {isCheckbox ? (
                    <input
                      type="checkbox"
                      checked={!!cellData?.value}
                      onChange={() => {}}
                      style={{ cursor: 'pointer', transform: 'scale(1.15)' }}
                    />
                  ) : isDropdown && cellData?.value ? (
                    /* Interactive Dropdown Badge */
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '1px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor:
                          fmt.validation?.options?.find((o) => o.value === String(cellData.value))?.color || '#e2e8f0',
                        color:
                          fmt.validation?.options?.find((o) => o.value === String(cellData.value))?.textColor || '#0f172a',
                      }}
                    >
                      <span>{formattedText}</span>
                      <ChevronDown size={10} />
                    </div>
                  ) : (
                    formattedText
                  )}

                  {/* Comment Indicator Corner Marker */}
                  {cellData?.comments && cellData.comments.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: 0,
                        height: 0,
                        borderTop: '6px solid #f59e0b',
                        borderLeft: '6px solid transparent',
                      }}
                    />
                  )}
                </div>
              );
            });
          })}

          {/* Selection Box Overlay */}
          <div
            style={{
              position: 'absolute',
              top: selTop,
              left: selLeft,
              width: selWidth,
              height: selHeight,
              border: '2px solid var(--selection-border)',
              backgroundColor: 'var(--selection-bg)',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          />

          {/* Live Formula Reference Colored Highlights */}
          {formulaHighlightTokens.map((t, idx) => {
            const norm = normalizeRange(t.range);
            const tTop = rowPositions[norm.startRow];
            const tLeft = colPositions[norm.startCol];
            const tRight = colPositions[norm.endCol + 1] || 0;
            const tBottom = rowPositions[norm.endRow + 1] || 0;
            const tWidth = tRight - tLeft;
            const tHeight = tBottom - tTop;

            return (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  top: tTop,
                  left: tLeft,
                  width: tWidth,
                  height: tHeight,
                  border: `2px solid ${t.color}`,
                  backgroundColor: `${t.color}15`,
                  pointerEvents: 'none',
                  zIndex: 9,
                }}
              />
            );
          })}

          {/* Fill Handle */}
          <div
            onMouseDown={handleFillHandleMouseDown}
            style={{
              position: 'absolute',
              top: selBottom - 4,
              left: selRight - 4,
              width: '8px',
              height: '8px',
              backgroundColor: 'var(--fill-handle-color)',
              border: '1px solid #ffffff',
              borderRadius: '1px',
              cursor: 'crosshair',
              zIndex: 12,
            }}
            title="Drag to auto-fill"
          />

          {/* Fill Drag Preview */}
          {fillPreviewBox && (
            <div
              style={{
                position: 'absolute',
                top: fillPreviewBox.top,
                left: fillPreviewBox.left,
                width: fillPreviewBox.width,
                height: fillPreviewBox.height,
                border: '2px dashed var(--accent-blue)',
                pointerEvents: 'none',
                zIndex: 11,
              }}
            />
          )}

          {/* In-Cell Live Editor */}
          {isEditing && (
            <input
              ref={editorInputRef}
              type="text"
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              style={{
                position: 'absolute',
                top: activeTop - 1,
                left: activeLeft - 1,
                width: activeWidth + 2,
                height: activeHeight + 2,
                padding: '2px 6px',
                fontSize: activeCellData?.format?.fontSize ? `${activeCellData.format.fontSize}px` : '12px',
                fontFamily: editValue.startsWith('=') ? 'var(--font-mono)' : 'var(--font-sans)',
                fontWeight: activeCellData?.format?.bold ? 600 : 400,
                color: 'var(--text-primary)',
                backgroundColor: 'var(--bg-surface)',
                border: '2px solid var(--accent-blue)',
                borderRadius: '2px',
                outline: 'none',
                zIndex: 30,
                boxShadow: 'var(--shadow-md)',
              }}
            />
          )}
        </div>
      </div>

      {/* Dropdown Options Popup */}
      {openDropdownCell && (
        <div
          style={{
            position: 'fixed',
            top: openDropdownCell.y,
            left: openDropdownCell.x,
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-xl)',
            padding: '6px',
            minWidth: '150px',
            zIndex: 1000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {openDropdownCell.options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onCommitEdit(opt.value);
                setOpenDropdownCell(null);
              }}
              style={{
                padding: '6px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: opt.color || '#e2e8f0',
                color: opt.textColor || '#0f172a',
                cursor: 'pointer',
                marginBottom: '4px',
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}

      {/* Column Filter & Sort Popup */}
      {filterMenuCol && (
        <div
          style={{
            position: 'fixed',
            top: filterMenuCol.y,
            left: filterMenuCol.x,
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-xl)',
            padding: '10px',
            width: '220px',
            zIndex: 1000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
            <div
              onClick={() => {
                onSortColumn?.(filterMenuCol.colIndex, 'asc');
                setFilterMenuCol(null);
              }}
              style={filterItemStyle}
            >
              <ArrowUpAZ size={14} /> Sort A → Z (Ascending)
            </div>
            <div
              onClick={() => {
                onSortColumn?.(filterMenuCol.colIndex, 'desc');
                setFilterMenuCol(null);
              }}
              style={filterItemStyle}
            >
              <ArrowDownAZ size={14} /> Sort Z → A (Descending)
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '6px 0' }} />

          {/* Search values */}
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
            FILTER BY VALUES
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 6px',
              backgroundColor: 'var(--bg-surface-secondary)',
              borderRadius: '4px',
              marginBottom: '6px',
            }}
          >
            <Search size={12} color="var(--text-muted)" />
            <input
              type="text"
              value={filterMenuCol.searchQuery}
              onChange={(e) => setFilterMenuCol({ ...filterMenuCol, searchQuery: e.target.value })}
              placeholder="Search values..."
              style={{ border: 'none', background: 'transparent', fontSize: '11px', outline: 'none', width: '100%' }}
            />
          </div>

          {/* Values List */}
          <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filterMenuCol.uniqueValues
              .filter((v) => v.toLowerCase().includes(filterMenuCol.searchQuery.toLowerCase()))
              .map((val) => {
                const isSelected = filterMenuCol.selectedValues.has(val);
                return (
                  <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        const newSet = new Set(filterMenuCol.selectedValues);
                        if (isSelected) newSet.delete(val);
                        else newSet.add(val);
                        setFilterMenuCol({ ...filterMenuCol, selectedValues: newSet });
                      }}
                    />
                    <span>{val}</span>
                  </label>
                );
              })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              className="btn-primary"
              onClick={() => {
                const hidden = new Set(filterMenuCol.uniqueValues.filter((v) => !filterMenuCol.selectedValues.has(v)));
                onFilterColumnValues?.(filterMenuCol.colIndex, hidden);
                setFilterMenuCol(null);
              }}
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              Apply Filter
            </button>
          </div>
        </div>
      )}

      {/* Right Click Context Menu */}
      {contextMenu?.visible && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-xl)',
            padding: '6px 0',
            minWidth: '200px',
            zIndex: 1000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={contextItemStyle} onClick={() => { onCopySelection(); setContextMenu(null); }}>
            Copy (Ctrl+C)
          </div>
          <div style={contextItemStyle} onClick={() => { onPasteClipboard(); setContextMenu(null); }}>
            Paste (Ctrl+V)
          </div>
          <div style={contextDivider} />
          <div style={contextItemStyle} onClick={() => { onInsertRow(true); setContextMenu(null); }}>
            Insert Row Above
          </div>
          <div style={contextItemStyle} onClick={() => { onInsertRow(false); setContextMenu(null); }}>
            Insert Row Below
          </div>
          <div style={contextItemStyle} onClick={() => { onInsertCol(true); setContextMenu(null); }}>
            Insert Column Left
          </div>
          <div style={contextItemStyle} onClick={() => { onInsertCol(false); setContextMenu(null); }}>
            Insert Column Right
          </div>
          <div style={contextDivider} />
          <div style={contextItemStyle} onClick={() => { onDeleteRow(); setContextMenu(null); }}>
            Delete Row
          </div>
          <div style={contextItemStyle} onClick={() => { onDeleteCol(); setContextMenu(null); }}>
            Delete Column
          </div>
          <div style={contextItemStyle} onClick={() => { onClearRange(); setContextMenu(null); }}>
            Clear Contents (Del)
          </div>
          <div style={contextDivider} />
          <div style={{ ...contextItemStyle, color: 'var(--accent-blue)', fontWeight: 600 }} onClick={() => { onAskAIForSelection(); setContextMenu(null); }}>
            ✨ Ask AI about this selection
          </div>
          <div style={contextItemStyle} onClick={() => { onOpenChartForSelection(); setContextMenu(null); }}>
            📊 Create Chart from selection
          </div>
        </div>
      )}
    </div>
  );
};

const filterItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 8px',
  fontSize: '12px',
  borderRadius: '4px',
  cursor: 'pointer',
};

const contextItemStyle: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: '13px',
  color: 'var(--text-primary)',
  cursor: 'pointer',
};

const contextDivider: React.CSSProperties = {
  height: '1px',
  backgroundColor: 'var(--border-subtle)',
  margin: '4px 0',
};
