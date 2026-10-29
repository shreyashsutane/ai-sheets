import React, { useState, useEffect, useCallback } from 'react';
import {
  Workbook,
  SheetData,
  CellCoords,
  SelectionRange,
  CellFormat,
  CellData,
  CellValue,
  AISettings,
  AIMessage,
  DataValidation,
  ConditionalFormatRule,
  AppTheme,
} from './types/spreadsheet';
import {
  coordsToCellKey,
  cellKeyToCoords,
  normalizeRange,
  rangeToString,
  expandRange,
  shiftFormula,
  predictFillSequence,
} from './core/cellUtils';
import { recalculateSheet } from './core/dependencyGraph';
import { HistoryManager } from './core/historyManager';
import { createEmptySheet, importSpreadsheetFile } from './core/ioUtils';
import { TEMPLATES, TemplateDefinition } from './core/templates';

import { Header } from './components/Header/Header';
import { Toolbar } from './components/Toolbar/Toolbar';
import { FormulaBar } from './components/FormulaBar/FormulaBar';
import { SpreadsheetGrid } from './components/Grid/SpreadsheetGrid';
import { SheetTabs } from './components/SheetTabs/SheetTabs';
import { AICopilotSidebar } from './components/AICopilot/AICopilotSidebar';
import { ChartViewer } from './components/Charts/ChartViewer';
import { TemplatesModal } from './components/Modals/TemplatesModal';
import { SettingsModal } from './components/Modals/SettingsModal';
import { FindReplaceModal } from './components/Modals/FindReplaceModal';
import { ShortcutsModal } from './components/Modals/ShortcutsModal';
import { DataValidationModal } from './components/Modals/DataValidationModal';
import { ConditionalFormatModal } from './components/Modals/ConditionalFormatModal';
import { PivotTableModal } from './components/Modals/PivotTableModal';
import { FormulaExplainerModal } from './components/Modals/FormulaExplainerModal';
import { GCSStorageModal } from './components/Modals/GCSStorageModal';

const historyManager = new HistoryManager(60);

export const App: React.FC = () => {
  // Theme state (7 themes: light, dark, nord, sepia, dracula, emerald, cyberpunk)
  const [theme, setTheme] = useState<AppTheme>(() => {
    return (localStorage.getItem('ai_sheets_theme') as AppTheme) || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ai_sheets_theme', theme);
  }, [theme]);

  // AI Settings state (Multi-LLM)
  const [aiSettings, setAiSettings] = useState<AISettings>(() => {
    const saved = localStorage.getItem('ai_sheets_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return {
      provider: 'builtin',
      apiKey: '',
      model: 'gemini-2.0-flash',
      openaiModel: 'gpt-4o',
      claudeModel: 'claude-3-7-sonnet-20250219',
      ollamaUrl: 'http://localhost:11434',
      ollamaModel: 'llama3',
    };
  });

  const handleSaveSettings = (newSettings: AISettings) => {
    setAiSettings(newSettings);
    localStorage.setItem('ai_sheets_settings', JSON.stringify(newSettings));
  };

  // Workbook state
  const [workbook, setWorkbook] = useState<Workbook>(() => {
    const initialSheet = TEMPLATES[0].generateSheet();
    return {
      id: `wb-${Date.now()}`,
      title: 'SaaS Growth & Financial Model',
      sheets: [initialSheet],
      activeSheetId: initialSheet.id,
    };
  });

  // Active Cell & Selection state
  const [activeCoords, setActiveCoords] = useState<CellCoords>({ row: 0, col: 0 });
  const [selection, setSelection] = useState<SelectionRange>({
    startRow: 0,
    startCol: 0,
    endRow: 0,
    endCol: 0,
  });

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [formulaBarValue, setFormulaBarValue] = useState('');

  // Modals state
  const [isAICopilotOpen, setIsAICopilotOpen] = useState(true);
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isFindReplaceModalOpen, setIsFindReplaceModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [isConditionalModalOpen, setIsConditionalModalOpen] = useState(false);
  const [isPivotModalOpen, setIsPivotModalOpen] = useState(false);
  const [isFormulaExplainerOpen, setIsFormulaExplainerOpen] = useState(false);
  const [isGCSModalOpen, setIsGCSModalOpen] = useState(false);

  // Active sheet reference
  const activeSheet = workbook.sheets.find((s) => s.id === workbook.activeSheetId) || workbook.sheets[0];
  const activeKey = coordsToCellKey(activeCoords.row, activeCoords.col);
  const activeCellData = activeSheet.cells[activeKey];

  // Sync formula bar
  useEffect(() => {
    if (!isEditing) {
      const cell = activeSheet.cells[activeKey];
      const val = cell?.formula || (cell?.value !== null && cell?.value !== undefined ? String(cell.value) : '');
      setFormulaBarValue(val);
    }
  }, [activeKey, activeSheet, isEditing]);

  // Update active sheet helper
  const updateActiveSheet = useCallback((newSheetData: SheetData) => {
    setWorkbook((prev) => {
      historyManager.pushState(prev);
      const recalculated = recalculateSheet(newSheetData, prev);
      const updatedSheets = prev.sheets.map((s) => (s.id === prev.activeSheetId ? recalculated : s));
      return { ...prev, sheets: updatedSheets };
    });
  }, []);

  // Commit Cell Edit
  const handleCommitEdit = useCallback((val: string) => {
    setIsEditing(false);
    const key = coordsToCellKey(activeCoords.row, activeCoords.col);
    const existing = activeSheet.cells[key] || { value: '' };

    const isFormula = val.startsWith('=');
    let cellValue: CellValue = val;

    if (!isFormula) {
      const num = Number(val);
      if (!isNaN(num) && val.trim() !== '') {
        cellValue = num;
      } else if (val.toUpperCase() === 'TRUE') {
        cellValue = true;
      } else if (val.toUpperCase() === 'FALSE') {
        cellValue = false;
      }
    }

    const updatedCells = {
      ...activeSheet.cells,
      [key]: {
        ...existing,
        value: isFormula ? '' : cellValue,
        formula: isFormula ? val : undefined,
      },
    };

    updateActiveSheet({
      ...activeSheet,
      cells: updatedCells,
    });
  }, [activeCoords, activeSheet, updateActiveSheet]);

  const handleStartEditing = (initialVal?: string) => {
    setIsEditing(true);
    const val = initialVal !== undefined ? initialVal : (activeCellData?.formula || String(activeCellData?.value ?? ''));
    setEditValue(val);
    setFormulaBarValue(val);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    const cell = activeSheet.cells[activeKey];
    setFormulaBarValue(cell?.formula || String(cell?.value ?? ''));
  };

  // Selection handlers
  const handleSelectCell = (coords: CellCoords, isShiftKey = false) => {
    setActiveCoords(coords);
    if (isShiftKey) {
      setSelection((prev) => ({
        startRow: prev.startRow,
        startCol: prev.startCol,
        endRow: coords.row,
        endCol: coords.col,
      }));
    } else {
      setSelection({
        startRow: coords.row,
        startCol: coords.col,
        endRow: coords.row,
        endCol: coords.col,
      });
    }
  };

  const handleUpdateSelection = (newSelection: SelectionRange) => {
    setSelection(newSelection);
  };

  // Formatting changes
  const handleFormatChange = (formatUpdate: Partial<CellFormat>) => {
    const keys = expandRange(selection);
    const updatedCells = { ...activeSheet.cells };

    for (const k of keys) {
      const cell = updatedCells[k] || { value: '' };
      updatedCells[k] = {
        ...cell,
        format: {
          ...(cell.format || {}),
          ...formatUpdate,
        },
      };
    }

    updateActiveSheet({ ...activeSheet, cells: updatedCells });
  };

  // Auto-Fill Drag Handle Logic
  const handleApplyFill = (sourceRange: SelectionRange, targetRange: SelectionRange) => {
    const sNorm = normalizeRange(sourceRange);
    const tNorm = normalizeRange(targetRange);

    const updatedCells = { ...activeSheet.cells };
    const rowDelta = tNorm.endRow - sNorm.endRow;
    const colDelta = tNorm.endCol - sNorm.endCol;

    if (rowDelta > 0 && colDelta === 0) {
      for (let c = sNorm.startCol; c <= sNorm.endCol; c++) {
        const sourceKeys: string[] = [];
        const sourceValues: CellValue[] = [];
        const sourceFormulas: (string | undefined)[] = [];

        for (let r = sNorm.startRow; r <= sNorm.endRow; r++) {
          const k = coordsToCellKey(r, c);
          sourceKeys.push(k);
          const cell = updatedCells[k];
          sourceValues.push(cell?.value ?? null);
          sourceFormulas.push(cell?.formula);
        }

        const sourceHeight = sNorm.endRow - sNorm.startRow + 1;
        const fillCount = tNorm.endRow - sNorm.endRow;
        const hasFormulas = sourceFormulas.some((f) => !!f);

        if (hasFormulas) {
          for (let i = 0; i < fillCount; i++) {
            const targetRow = sNorm.endRow + 1 + i;
            const srcIdx = i % sourceHeight;
            const srcKey = sourceKeys[srcIdx];
            const srcCell = updatedCells[srcKey];
            const targetKey = coordsToCellKey(targetRow, c);

            const shiftedFormula = srcCell?.formula ? shiftFormula(srcCell.formula, i + 1, 0) : undefined;
            updatedCells[targetKey] = {
              value: shiftedFormula ? '' : (srcCell?.value ?? ''),
              formula: shiftedFormula,
              format: srcCell?.format ? { ...srcCell.format } : undefined,
            };
          }
        } else {
          const predicted = predictFillSequence(sourceValues, fillCount);
          for (let i = 0; i < fillCount; i++) {
            const targetRow = sNorm.endRow + 1 + i;
            const targetKey = coordsToCellKey(targetRow, c);
            const templateCell = updatedCells[sourceKeys[i % sourceHeight]];

            updatedCells[targetKey] = {
              value: predicted[i],
              format: templateCell?.format ? { ...templateCell.format } : undefined,
            };
          }
        }
      }
    }

    updateActiveSheet({ ...activeSheet, cells: updatedCells });
    setSelection(tNorm);
  };

  // Undo / Redo
  const handleUndo = () => {
    const prev = historyManager.undo(workbook);
    if (prev) setWorkbook(prev);
  };

  const handleRedo = () => {
    const next = historyManager.redo(workbook);
    if (next) setWorkbook(next);
  };

  // Row / Col manipulation
  const handleInsertRow = (above: boolean) => {
    const targetRow = above ? activeCoords.row : activeCoords.row + 1;
    const newCells: Record<string, CellData> = {};

    for (const [key, cell] of Object.entries(activeSheet.cells)) {
      const coords = cellKeyToCoords(key);
      if (coords) {
        if (coords.row >= targetRow) {
          const shiftedKey = coordsToCellKey(coords.row + 1, coords.col);
          const shiftedFormula = cell.formula ? shiftFormula(cell.formula, 1, 0) : undefined;
          newCells[shiftedKey] = { ...cell, formula: shiftedFormula };
        } else {
          newCells[key] = cell;
        }
      }
    }

    updateActiveSheet({
      ...activeSheet,
      rowCount: (activeSheet.rowCount || 50) + 1,
      cells: newCells,
    });
  };

  const handleInsertCol = (left: boolean) => {
    const targetCol = left ? activeCoords.col : activeCoords.col + 1;
    const newCells: Record<string, CellData> = {};

    for (const [key, cell] of Object.entries(activeSheet.cells)) {
      const coords = cellKeyToCoords(key);
      if (coords) {
        if (coords.col >= targetCol) {
          const shiftedKey = coordsToCellKey(coords.row, coords.col + 1);
          const shiftedFormula = cell.formula ? shiftFormula(cell.formula, 0, 1) : undefined;
          newCells[shiftedKey] = { ...cell, formula: shiftedFormula };
        } else {
          newCells[key] = cell;
        }
      }
    }

    updateActiveSheet({
      ...activeSheet,
      colCount: (activeSheet.colCount || 26) + 1,
      cells: newCells,
    });
  };

  const handleDeleteRow = () => {
    const targetRow = activeCoords.row;
    const newCells: Record<string, CellData> = {};

    for (const [key, cell] of Object.entries(activeSheet.cells)) {
      const coords = cellKeyToCoords(key);
      if (coords) {
        if (coords.row !== targetRow) {
          if (coords.row > targetRow) {
            const shiftedKey = coordsToCellKey(coords.row - 1, coords.col);
            const shiftedFormula = cell.formula ? shiftFormula(cell.formula, -1, 0) : undefined;
            newCells[shiftedKey] = { ...cell, formula: shiftedFormula };
          } else {
            newCells[key] = cell;
          }
        }
      }
    }

    updateActiveSheet({
      ...activeSheet,
      rowCount: Math.max(10, (activeSheet.rowCount || 50) - 1),
      cells: newCells,
    });
  };

  const handleDeleteCol = () => {
    const targetCol = activeCoords.col;
    const newCells: Record<string, CellData> = {};

    for (const [key, cell] of Object.entries(activeSheet.cells)) {
      const coords = cellKeyToCoords(key);
      if (coords) {
        if (coords.col !== targetCol) {
          if (coords.col > targetCol) {
            const shiftedKey = coordsToCellKey(coords.row, coords.col - 1);
            const shiftedFormula = cell.formula ? shiftFormula(cell.formula, 0, -1) : undefined;
            newCells[shiftedKey] = { ...cell, formula: shiftedFormula };
          } else {
            newCells[key] = cell;
          }
        }
      }
    }

    updateActiveSheet({
      ...activeSheet,
      colCount: Math.max(5, (activeSheet.colCount || 26) - 1),
      cells: newCells,
    });
  };

  const handleClearRange = () => {
    const keys = expandRange(selection);
    const updatedCells = { ...activeSheet.cells };
    for (const k of keys) {
      delete updatedCells[k];
    }
    updateActiveSheet({ ...activeSheet, cells: updatedCells });
  };

  // Clipboard Copy / Paste
  const handleCopySelection = () => {
    const norm = normalizeRange(selection);
    const rows: string[] = [];

    for (let r = norm.startRow; r <= norm.endRow; r++) {
      const rowVals: string[] = [];
      for (let c = norm.startCol; c <= norm.endCol; c++) {
        const k = coordsToCellKey(r, c);
        const cell = activeSheet.cells[k];
        const val = cell?.formula || (cell?.computedValue !== undefined ? cell.computedValue : (cell?.value ?? ''));
        rowVals.push(String(val));
      }
      rows.push(rowVals.join('\t'));
    }

    navigator.clipboard.writeText(rows.join('\n'));
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;

      const lines = text.split(/\r?\n/).map((l) => l.split('\t'));
      const updatedCells = { ...activeSheet.cells };

      for (let r = 0; r < lines.length; r++) {
        const rowData = lines[r];
        for (let c = 0; c < rowData.length; c++) {
          const targetKey = coordsToCellKey(activeCoords.row + r, activeCoords.col + c);
          const val = rowData[c];
          if (val !== undefined) {
            const isFormula = val.startsWith('=');
            const num = Number(val);
            const cellVal = !isNaN(num) && val.trim() !== '' ? num : val;
            updatedCells[targetKey] = {
              value: isFormula ? '' : cellVal,
              formula: isFormula ? val : undefined,
            };
          }
        }
      }

      updateActiveSheet({ ...activeSheet, cells: updatedCells });
    } catch {
      // clipboard access fallback
    }
  };

  // Apply Proposed Changes from AI Copilot
  const handleApplyAIChanges = (proposed: AIMessage['proposedChanges']) => {
    if (!proposed) return;

    const updatedCells = { ...activeSheet.cells };
    for (const [key, cellUpdate] of Object.entries(proposed.affectedCells)) {
      const existing = updatedCells[key] || { value: '' };
      updatedCells[key] = {
        value: cellUpdate.newFormula ? '' : (cellUpdate.newValue !== undefined ? cellUpdate.newValue : existing.value),
        formula: cellUpdate.newFormula !== undefined ? (cellUpdate.newFormula || undefined) : existing.formula,
        format: cellUpdate.format ? { ...(existing.format || {}), ...cellUpdate.format } : existing.format,
      };
    }

    updateActiveSheet({ ...activeSheet, cells: updatedCells });

    if (proposed.chartSuggestion) {
      setIsChartModalOpen(true);
    }
  };

  // Feature: Column Sorting & Filtering
  const handleSortColumn = (colIndex: number, direction: 'asc' | 'desc') => {
    // Collect all data rows starting from row 1 (row 0 is header)
    const rowList: { rowIdx: number; val: any; cells: Record<string, CellData> }[] = [];
    const maxRow = activeSheet.rowCount || 50;

    for (let r = 1; r < maxRow; r++) {
      const key = coordsToCellKey(r, colIndex);
      const cell = activeSheet.cells[key];
      const val = cell?.computedValue !== undefined ? cell.computedValue : (cell?.value ?? '');

      const rowCells: Record<string, CellData> = {};
      for (let c = 0; c < (activeSheet.colCount || 26); c++) {
        const ck = coordsToCellKey(r, c);
        if (activeSheet.cells[ck]) {
          rowCells[ck] = activeSheet.cells[ck];
        }
      }
      rowList.push({ rowIdx: r, val, cells: rowCells });
    }

    rowList.sort((a, b) => {
      const numA = Number(a.val);
      const numB = Number(b.val);
      const isNum = !isNaN(numA) && !isNaN(numB) && a.val !== '' && b.val !== '';
      if (isNum) {
        return direction === 'asc' ? numA - numB : numB - numA;
      }
      return direction === 'asc'
        ? String(a.val).localeCompare(String(b.val))
        : String(b.val).localeCompare(String(a.val));
    });

    const newCells: Record<string, CellData> = {};
    // Keep header row intact
    for (let c = 0; c < (activeSheet.colCount || 26); c++) {
      const hk = coordsToCellKey(0, c);
      if (activeSheet.cells[hk]) newCells[hk] = activeSheet.cells[hk];
    }

    // Place sorted rows
    rowList.forEach((rObj, newIdx) => {
      const targetRow = newIdx + 1;
      for (let c = 0; c < (activeSheet.colCount || 26); c++) {
        const oldKey = coordsToCellKey(rObj.rowIdx, c);
        const cellData = rObj.cells[oldKey];
        if (cellData) {
          const newKey = coordsToCellKey(targetRow, c);
          newCells[newKey] = cellData;
        }
      }
    });

    updateActiveSheet({ ...activeSheet, cells: newCells });
  };

  const handleFilterColumnValues = (colIndex: number, hiddenValues: Set<string>) => {
    updateActiveSheet({
      ...activeSheet,
      filters: {
        ...(activeSheet.filters || {}),
        [colIndex]: { columnIndex: colIndex, hiddenValues },
      },
    });
  };

  // Feature: Data Validation Save
  const handleSaveValidation = (range: SelectionRange, validation?: DataValidation) => {
    const keys = expandRange(range);
    const updatedCells = { ...activeSheet.cells };

    for (const k of keys) {
      const cell = updatedCells[k] || { value: '' };
      updatedCells[k] = {
        ...cell,
        value: validation?.type === 'checkbox' && cell.value === '' ? false : cell.value,
        format: {
          ...(cell.format || {}),
          validation,
        },
      };
    }

    updateActiveSheet({ ...activeSheet, cells: updatedCells });
  };

  // Feature: Conditional Formatting Rules Save
  const handleSaveConditionalRules = (rules: ConditionalFormatRule[]) => {
    updateActiveSheet({
      ...activeSheet,
      conditionalRules: rules,
    });
  };

  // Feature: Create Pivot Table Sheet
  const handleCreatePivotSheet = (pivotSheet: SheetData) => {
    setWorkbook((prev) => {
      historyManager.pushState(prev);
      return {
        ...prev,
        sheets: [...prev.sheets, pivotSheet],
        activeSheetId: pivotSheet.id,
      };
    });
  };

  // Feature: AI Formula Auto-Fix
  const handleApplyFixedFormula = (cellKey: string, newFormula: string) => {
    const cell = activeSheet.cells[cellKey] || { value: '' };
    const updatedCells = {
      ...activeSheet.cells,
      [cellKey]: {
        ...cell,
        value: '',
        formula: newFormula,
      },
    };
    updateActiveSheet({ ...activeSheet, cells: updatedCells });
  };

  // Template selection
  const handleSelectTemplate = (template: TemplateDefinition) => {
    const newSheet = template.generateSheet();
    setWorkbook((prev) => {
      historyManager.pushState(prev);
      return {
        ...prev,
        title: template.name,
        sheets: [...prev.sheets, newSheet],
        activeSheetId: newSheet.id,
      };
    });
  };

  // File import
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const importedSheets = await importSpreadsheetFile(file);
      setWorkbook((prev) => {
        historyManager.pushState(prev);
        return {
          ...prev,
          title: file.name.replace(/\.[^/.]+$/, ''),
          sheets: importedSheets,
          activeSheetId: importedSheets[0].id,
        };
      });
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    }
    e.target.value = '';
  };

  // Sheet tab handlers
  const handleAddSheet = () => {
    const name = `Sheet${workbook.sheets.length + 1}`;
    const newSheet = createEmptySheet(name);
    setWorkbook((prev) => {
      historyManager.pushState(prev);
      return {
        ...prev,
        sheets: [...prev.sheets, newSheet],
        activeSheetId: newSheet.id,
      };
    });
  };

  const handleRenameSheet = (sheetId: string, newName: string) => {
    setWorkbook((prev) => ({
      ...prev,
      sheets: prev.sheets.map((s) => (s.id === sheetId ? { ...s, name: newName } : s)),
    }));
  };

  const handleDuplicateSheet = (sheetId: string) => {
    const target = workbook.sheets.find((s) => s.id === sheetId);
    if (!target) return;
    const duplicated: SheetData = {
      ...JSON.parse(JSON.stringify(target)),
      id: `sheet-${Date.now()}`,
      name: `${target.name} (Copy)`,
    };
    setWorkbook((prev) => ({
      ...prev,
      sheets: [...prev.sheets, duplicated],
      activeSheetId: duplicated.id,
    }));
  };

  const handleDeleteSheet = (sheetId: string) => {
    if (workbook.sheets.length <= 1) return;
    setWorkbook((prev) => {
      const filtered = prev.sheets.filter((s) => s.id !== sheetId);
      return {
        ...prev,
        sheets: filtered,
        activeSheetId: prev.activeSheetId === sheetId ? filtered[0].id : prev.activeSheetId,
      };
    });
  };

  const handleChangeSheetColor = (sheetId: string, color?: string) => {
    setWorkbook((prev) => ({
      ...prev,
      sheets: prev.sheets.map((s) => (s.id === sheetId ? { ...s, color } : s)),
    }));
  };

  const handleReplaceAll = (findText: string, replaceText: string, matchCase: boolean) => {
    const updatedCells = { ...activeSheet.cells };
    for (const [key, cell] of Object.entries(updatedCells)) {
      const valStr = String(cell.value ?? '');
      const regex = new RegExp(findText, matchCase ? 'g' : 'gi');
      if (regex.test(valStr)) {
        updatedCells[key] = {
          ...cell,
          value: valStr.replace(regex, replaceText),
        };
      }
    }
    updateActiveSheet({ ...activeSheet, cells: updatedCells });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-primary)',
        overflow: 'hidden',
      }}
    >
      {/* 1. Header Bar */}
      <Header
        workbook={workbook}
        activeSheet={activeSheet}
        theme={theme}
        onThemeSelect={(newTheme) => setTheme(newTheme)}
        onTitleChange={(newTitle) => setWorkbook((prev) => ({ ...prev, title: newTitle }))}
        onOpenTemplates={() => setIsTemplatesModalOpen(true)}
        onOpenChartModal={() => setIsChartModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
        onOpenFindReplace={() => setIsFindReplaceModalOpen(true)}
        onOpenGCSModal={() => setIsGCSModalOpen(true)}
        onToggleAICopilot={() => setIsAICopilotOpen(!isAICopilotOpen)}
        isAICopilotOpen={isAICopilotOpen}
        onImportFile={handleImportFile}
        onNewWorkbook={() => {
          const freshSheet = createEmptySheet('Sheet1');
          setWorkbook({
            id: `wb-${Date.now()}`,
            title: 'Untitled spreadsheet',
            sheets: [freshSheet],
            activeSheetId: freshSheet.id,
          });
        }}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyManager.canUndo()}
        canRedo={historyManager.canRedo()}
        onInsertRow={handleInsertRow}
        onInsertCol={handleInsertCol}
        onDeleteRow={handleDeleteRow}
        onDeleteCol={handleDeleteCol}
        onCleanData={() => setIsAICopilotOpen(true)}
        onAutoAnalyze={() => setIsAICopilotOpen(true)}
      />

      {/* 2. Formatting Toolbar */}
      <Toolbar
        currentFormat={activeCellData?.format}
        onFormatChange={handleFormatChange}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyManager.canUndo()}
        canRedo={historyManager.canRedo()}
        onOpenChartModal={() => setIsChartModalOpen(true)}
        onSmartFill={() => setIsAICopilotOpen(true)}
        isFilterActive={activeSheet.isFilterActive}
        onToggleFilter={() => updateActiveSheet({ ...activeSheet, isFilterActive: !activeSheet.isFilterActive })}
        onOpenValidationModal={() => setIsValidationModalOpen(true)}
        onOpenConditionalFormatModal={() => setIsConditionalModalOpen(true)}
        onOpenPivotModal={() => setIsPivotModalOpen(true)}
        onOpenFormulaExplainer={() => setIsFormulaExplainerOpen(true)}
      />

      {/* 3. Formula Bar */}
      <FormulaBar
        activeCellKey={activeKey}
        selectionString={rangeToString(selection)}
        formulaValue={formulaBarValue}
        onChangeFormula={(val) => {
          setFormulaBarValue(val);
          setEditValue(val);
        }}
        onCommitFormula={() => handleCommitEdit(formulaBarValue)}
        onCancelFormula={handleCancelEdit}
        onNavigateToCell={(key) => {
          const coords = cellKeyToCoords(key);
          if (coords) handleSelectCell(coords);
        }}
        onOpenFormulaExplainer={() => setIsFormulaExplainerOpen(true)}
      />

      {/* 4. Main Body: Grid + AI Copilot */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        <SpreadsheetGrid
          sheet={activeSheet}
          activeCoords={activeCoords}
          selection={selection}
          isEditing={isEditing}
          editValue={editValue}
          onSelectCell={handleSelectCell}
          onUpdateSelection={handleUpdateSelection}
          onStartEditing={handleStartEditing}
          onCommitEdit={handleCommitEdit}
          onCancelEdit={handleCancelEdit}
          onEditChange={(val) => {
            setEditValue(val);
            setFormulaBarValue(val);
          }}
          onApplyFill={handleApplyFill}
          onInsertRow={handleInsertRow}
          onInsertCol={handleInsertCol}
          onDeleteRow={handleDeleteRow}
          onDeleteCol={handleDeleteCol}
          onClearRange={handleClearRange}
          onOpenChartForSelection={() => setIsChartModalOpen(true)}
          onAskAIForSelection={() => setIsAICopilotOpen(true)}
          onCopySelection={handleCopySelection}
          onPasteClipboard={handlePasteClipboard}
          onSortColumn={handleSortColumn}
          onFilterColumnValues={handleFilterColumnValues}
        />

        {/* AI Copilot Sidebar with Voice Dictation */}
        <AICopilotSidebar
          isOpen={isAICopilotOpen}
          onClose={() => setIsAICopilotOpen(false)}
          currentSheet={activeSheet}
          selection={selection}
          settings={aiSettings}
          onApplyChanges={handleApplyAIChanges}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
        />
      </div>

      {/* 5. Sheet Tabs & Metrics Status Bar */}
      <SheetTabs
        workbook={workbook}
        activeSheetId={workbook.activeSheetId}
        selection={selection}
        onSelectSheet={(sheetId) => setWorkbook((prev) => ({ ...prev, activeSheetId: sheetId }))}
        onAddSheet={handleAddSheet}
        onRenameSheet={handleRenameSheet}
        onDuplicateSheet={handleDuplicateSheet}
        onDeleteSheet={handleDeleteSheet}
        onChangeSheetColor={handleChangeSheetColor}
      />

      {/* Modals */}
      <ChartViewer
        isOpen={isChartModalOpen}
        onClose={() => setIsChartModalOpen(false)}
        sheet={activeSheet}
        selection={selection}
      />

      <TemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={aiSettings}
        onSaveSettings={handleSaveSettings}
      />

      <FindReplaceModal
        isOpen={isFindReplaceModalOpen}
        onClose={() => setIsFindReplaceModalOpen(false)}
        sheet={activeSheet}
        onNavigateToCell={(coords) => handleSelectCell(coords)}
        onReplaceAll={handleReplaceAll}
      />

      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      <DataValidationModal
        isOpen={isValidationModalOpen}
        onClose={() => setIsValidationModalOpen(false)}
        selection={selection}
        initialValidation={activeCellData?.format?.validation}
        onSaveValidation={handleSaveValidation}
      />

      <ConditionalFormatModal
        isOpen={isConditionalModalOpen}
        onClose={() => setIsConditionalModalOpen(false)}
        selection={selection}
        rules={activeSheet.conditionalRules || []}
        onSaveRules={handleSaveConditionalRules}
      />

      <PivotTableModal
        isOpen={isPivotModalOpen}
        onClose={() => setIsPivotModalOpen(false)}
        sheet={activeSheet}
        selection={selection}
        onCreatePivotSheet={handleCreatePivotSheet}
      />

      <FormulaExplainerModal
        isOpen={isFormulaExplainerOpen}
        onClose={() => setIsFormulaExplainerOpen(false)}
        cellKey={activeKey}
        sheet={activeSheet}
        onApplyFixedFormula={handleApplyFixedFormula}
      />

      <GCSStorageModal
        isOpen={isGCSModalOpen}
        onClose={() => setIsGCSModalOpen(false)}
        workbook={workbook}
        onLoadWorkbook={(loaded) => setWorkbook(loaded)}
      />
    </div>
  );
};

export default App;
