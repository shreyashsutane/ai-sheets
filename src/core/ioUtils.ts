import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Workbook, SheetData, CellData, CellValue } from '../types/spreadsheet';
import { coordsToCellKey, cellKeyToCoords, colIndexToLetter, colLetterToIndex } from './cellUtils';
import { recalculateSheet } from './dependencyGraph';

/**
 * Export workbook to genuine Excel XLSX file
 */
export function exportToXLSX(workbook: Workbook, filename?: string): void {
  const wb = XLSX.utils.book_new();

  for (const sheet of workbook.sheets) {
    const data: any[][] = [];
    
    // Find bounds
    let maxRow = 0;
    let maxCol = 0;
    for (const key of Object.keys(sheet.cells)) {
      const coords = cellKeyToCoords(key);
      if (coords) {
        if (coords.row > maxRow) maxRow = coords.row;
        if (coords.col > maxCol) maxCol = coords.col;
      }
    }

    // Build 2D array
    for (let r = 0; r <= maxRow; r++) {
      const rowArr: any[] = [];
      for (let c = 0; c <= maxCol; c++) {
        const key = coordsToCellKey(r, c);
        const cell = sheet.cells[key];
        const val = cell?.computedValue !== undefined ? cell.computedValue : (cell?.value ?? '');
        rowArr.push(val);
      }
      data.push(rowArr);
    }

    const ws = XLSX.utils.aoa_to_sheet(data.length > 0 ? data : [['']]);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.substring(0, 31)); // 31 char limit for Excel sheet names
  }

  XLSX.writeFile(wb, `${filename || workbook.title || 'Spreadsheet'}.xlsx`);
}

/**
 * Export active sheet to CSV
 */
export function exportToCSV(sheet: SheetData, filename?: string): void {
  let maxRow = 0;
  let maxCol = 0;
  for (const key of Object.keys(sheet.cells)) {
    const coords = cellKeyToCoords(key);
    if (coords) {
      if (coords.row > maxRow) maxRow = coords.row;
      if (coords.col > maxCol) maxCol = coords.col;
    }
  }

  const data: any[][] = [];
  for (let r = 0; r <= maxRow; r++) {
    const rowArr: any[] = [];
    for (let c = 0; c <= maxCol; c++) {
      const key = coordsToCellKey(r, c);
      const cell = sheet.cells[key];
      const val = cell?.computedValue !== undefined ? cell.computedValue : (cell?.value ?? '');
      rowArr.push(val);
    }
    data.push(rowArr);
  }

  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename || sheet.name || 'Sheet'}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export full workbook to JSON
 */
export function exportToJSON(workbook: Workbook, filename?: string): void {
  const jsonStr = JSON.stringify(workbook, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename || workbook.title || 'Workbook'}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Import XLSX or CSV file
 */
export async function importSpreadsheetFile(file: File): Promise<SheetData[]> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        complete: (results) => {
          const rows = results.data as string[][];
          const cells: Record<string, CellData> = {};
          let rowCount = Math.max(50, rows.length + 10);
          let colCount = 26;

          for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            if (row.length > colCount) colCount = row.length + 5;
            for (let c = 0; c < row.length; c++) {
              const val = row[c];
              if (val !== undefined && val !== '') {
                const key = coordsToCellKey(r, c);
                // Check if numeric
                const num = Number(val);
                const cellVal = !isNaN(num) && val.trim() !== '' ? num : val;
                cells[key] = {
                  value: cellVal,
                  computedValue: cellVal,
                  format: r === 0 ? { bold: true, bgColor: '#f1f5f9' } : undefined,
                };
              }
            }
          }

          const sheetName = file.name.replace(/\.csv$/i, '');
          const newSheet: SheetData = {
            id: `sheet-${Date.now()}`,
            name: sheetName,
            cells,
            rowCount,
            colCount,
          };
          resolve([newSheet]);
        },
        error: (err) => reject(err),
      });
    });
  }

  if (extension === 'xlsx' || extension === 'xls') {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheets: SheetData[] = [];

    for (const name of wb.SheetNames) {
      const ws = wb.Sheets[name];
      const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      const cells: Record<string, CellData> = {};
      let rowCount = Math.max(50, json.length + 10);
      let colCount = 26;

      for (let r = 0; r < json.length; r++) {
        const row = json[r];
        if (row && row.length > colCount) colCount = row.length + 5;
        if (!row) continue;

        for (let c = 0; c < row.length; c++) {
          const val = row[c];
          if (val !== undefined && val !== null && val !== '') {
            const key = coordsToCellKey(r, c);
            const isFormula = typeof val === 'string' && val.startsWith('=');
            cells[key] = {
              value: val,
              formula: isFormula ? val : undefined,
              computedValue: val,
              format: r === 0 ? { bold: true, bgColor: '#f8fafc' } : undefined,
            };
          }
        }
      }

      const importedSheet: SheetData = {
        id: `sheet-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name,
        cells,
        rowCount,
        colCount,
      };

      sheets.push(recalculateSheet(importedSheet));
    }

    return sheets.length > 0 ? sheets : [createEmptySheet('Sheet1')];
  }

  throw new Error('Unsupported file format. Please upload .xlsx, .xls, or .csv file.');
}

/**
 * Create a new default blank sheet
 */
export function createEmptySheet(name: string): SheetData {
  return {
    id: `sheet-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name,
    cells: {},
    rowCount: 50,
    colCount: 26,
  };
}
