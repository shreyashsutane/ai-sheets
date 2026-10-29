import { CellCoords, SelectionRange, CellFormat, CellValue, FormulaTokenColor } from '../types/spreadsheet';

export const FORMULA_COLORS = [
  '#2563eb', // Blue
  '#ea580c', // Orange
  '#9333ea', // Purple
  '#16a34a', // Green
  '#db2777', // Pink
  '#0891b2', // Cyan
  '#d97706', // Amber
  '#4f46e5', // Indigo
];

/**
 * Convert 0-indexed column number to letters (0 -> 'A', 25 -> 'Z', 26 -> 'AA')
 */
export function colIndexToLetter(col: number): string {
  let temp = col;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Convert column letter to 0-indexed column number ('A' -> 0, 'Z' -> 25, 'AA' -> 26)
 */
export function colLetterToIndex(colStr: string): number {
  let col = 0;
  const upper = colStr.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    col = col * 26 + (upper.charCodeAt(i) - 64);
  }
  return col - 1;
}

/**
 * Convert 0-indexed (row, col) to standard cell key (e.g. 0, 0 -> "A1")
 */
export function coordsToCellKey(row: number, col: number): string {
  return `${colIndexToLetter(col)}${row + 1}`;
}

/**
 * Convert cell key (e.g. "A1", "BC123") to 0-indexed coords
 */
export function cellKeyToCoords(cellKey: string): CellCoords | null {
  const match = cellKey.trim().match(/^([A-Za-z]+)(\d+)$/);
  if (!match) return null;
  const colLetter = match[1];
  const rowNum = parseInt(match[2], 10);
  if (isNaN(rowNum) || rowNum <= 0) return null;
  return {
    col: colLetterToIndex(colLetter),
    row: rowNum - 1,
  };
}

/**
 * Normalize selection range so start is top-left and end is bottom-right
 */
export function normalizeRange(range: SelectionRange): SelectionRange {
  return {
    startRow: Math.min(range.startRow, range.endRow),
    startCol: Math.min(range.startCol, range.endCol),
    endRow: Math.max(range.startRow, range.endRow),
    endCol: Math.max(range.startCol, range.endCol),
  };
}

/**
 * Format range to string (e.g. "A1:B10" or "A1" if single cell)
 */
export function rangeToString(range: SelectionRange): string {
  const norm = normalizeRange(range);
  const startKey = coordsToCellKey(norm.startRow, norm.startCol);
  const endKey = coordsToCellKey(norm.endRow, norm.endCol);
  return startKey === endKey ? startKey : `${startKey}:${endKey}`;
}

/**
 * Parse range string (e.g. "A1:B10" or "A1") into SelectionRange
 */
export function parseRangeString(rangeStr: string): SelectionRange | null {
  const parts = rangeStr.trim().split(':');
  if (parts.length === 1) {
    const c = cellKeyToCoords(parts[0]);
    if (!c) return null;
    return { startRow: c.row, startCol: c.col, endRow: c.row, endCol: c.col };
  } else if (parts.length === 2) {
    const c1 = cellKeyToCoords(parts[0]);
    const c2 = cellKeyToCoords(parts[1]);
    if (!c1 || !c2) return null;
    return normalizeRange({
      startRow: c1.row,
      startCol: c1.col,
      endRow: c2.row,
      endCol: c2.col,
    });
  }
  return null;
}

/**
 * Expand a range into an array of cell keys (e.g. "A1:B2" -> ["A1", "A2", "B1", "B2"])
 */
export function expandRange(range: SelectionRange): string[] {
  const norm = normalizeRange(range);
  const keys: string[] = [];
  for (let r = norm.startRow; r <= norm.endRow; r++) {
    for (let c = norm.startCol; c <= norm.endCol; c++) {
      keys.push(coordsToCellKey(r, c));
    }
  }
  return keys;
}

/**
 * Extract all cell & range references from a formula string and assign distinct colors
 */
export function extractFormulaTokensWithColors(formula: string): FormulaTokenColor[] {
  if (!formula || !formula.startsWith('=')) return [];

  // Match ranges like A1:B10 or single cell refs like A1, $B$4
  const rangeRegex = /(\$?[A-Za-z]+\$?\d+:\$?[A-Za-z]+\$?\d+|\$?[A-Za-z]+\$?\d+)/g;
  const matches = formula.match(rangeRegex);
  if (!matches) return [];

  const uniqueMatches = Array.from(new Set(matches));
  const results: FormulaTokenColor[] = [];

  uniqueMatches.forEach((ref, idx) => {
    const cleanRef = ref.replace(/\$/g, '');
    const range = parseRangeString(cleanRef);
    if (range) {
      results.push({
        ref,
        color: FORMULA_COLORS[idx % FORMULA_COLORS.length],
        range,
      });
    }
  });

  return results;
}

/**
 * Shift formula cell references when dragged / filled
 */
export function shiftFormula(formula: string, rowDelta: number, colDelta: number): string {
  if (!formula.startsWith('=')) return formula;

  const cellRefRegex = /(\$?[A-Za-z]+)(\$?\d+)/g;

  return formula.replace(cellRefRegex, (match, colPart, rowPart) => {
    let colFixed = colPart.startsWith('$');
    let rowFixed = rowPart.startsWith('$');

    let pureCol = colFixed ? colPart.substring(1) : colPart;
    let pureRow = rowFixed ? rowPart.substring(1) : rowPart;

    let colIdx = colLetterToIndex(pureCol);
    let rowIdx = parseInt(pureRow, 10) - 1;

    if (isNaN(colIdx) || isNaN(rowIdx)) return match;

    let newColIdx = colFixed ? colIdx : Math.max(0, colIdx + colDelta);
    let newRowIdx = rowFixed ? rowIdx : Math.max(0, rowIdx + rowDelta);

    let newColPart = (colFixed ? '$' : '') + colIndexToLetter(newColIdx);
    let newRowPart = (rowFixed ? '$' : '') + (newRowIdx + 1);

    return `${newColPart}${newRowPart}`;
  });
}

/**
 * Intelligent Auto-fill sequence generator (Numbers, Dates, Days of week, Months, Text patterns)
 */
export function predictFillSequence(sourceValues: CellValue[], countNeeded: number): CellValue[] {
  if (sourceValues.length === 0) return Array(countNeeded).fill('');
  
  if (sourceValues.length === 1) {
    const val = sourceValues[0];
    if (typeof val === 'number' || (!isNaN(Number(val)) && val !== '' && val !== null)) {
      const num = Number(val);
      return Array.from({ length: countNeeded }, (_, i) => num + i + 1);
    }
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const strVal = String(val).trim();
    const dayIdx = days.findIndex(d => d.toLowerCase() === strVal.toLowerCase());
    if (dayIdx !== -1) {
      return Array.from({ length: countNeeded }, (_, i) => days[(dayIdx + i + 1) % 7]);
    }
    const shortDayIdx = shortDays.findIndex(d => d.toLowerCase() === strVal.toLowerCase());
    if (shortDayIdx !== -1) {
      return Array.from({ length: countNeeded }, (_, i) => shortDays[(shortDayIdx + i + 1) % 7]);
    }
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIdx = months.findIndex(m => m.toLowerCase() === strVal.toLowerCase());
    if (monthIdx !== -1) {
      return Array.from({ length: countNeeded }, (_, i) => months[(monthIdx + i + 1) % 12]);
    }
    const shortMonthIdx = shortMonths.findIndex(m => m.toLowerCase() === strVal.toLowerCase());
    if (shortMonthIdx !== -1) {
      return Array.from({ length: countNeeded }, (_, i) => shortMonths[(shortMonthIdx + i + 1) % 12]);
    }
    const qMatch = strVal.match(/^Q([1-4])$/i);
    if (qMatch) {
      const qNum = parseInt(qMatch[1], 10);
      return Array.from({ length: countNeeded }, (_, i) => `Q${((qNum - 1 + i + 1) % 4) + 1}`);
    }
    const trailingNumMatch = strVal.match(/^(.*?)(\d+)$/);
    if (trailingNumMatch) {
      const prefix = trailingNumMatch[1];
      const startNum = parseInt(trailingNumMatch[2], 10);
      return Array.from({ length: countNeeded }, (_, i) => `${prefix}${startNum + i + 1}`);
    }
    return Array.from({ length: countNeeded }, () => val);
  }

  const nums = sourceValues.map(v => (v !== null && v !== '' && !isNaN(Number(v)) ? Number(v) : null));
  if (nums.every(n => n !== null)) {
    const validNums = nums as number[];
    const diff = (validNums[validNums.length - 1] - validNums[0]) / (validNums.length - 1);
    const lastNum = validNums[validNums.length - 1];
    return Array.from({ length: countNeeded }, (_, i) => {
      const next = lastNum + diff * (i + 1);
      return Number.isInteger(diff) && Number.isInteger(lastNum) ? Math.round(next) : parseFloat(next.toFixed(4));
    });
  }

  return Array.from({ length: countNeeded }, (_, i) => sourceValues[i % sourceValues.length]);
}

/**
 * Format a cell value according to its format specification
 */
export function formatCellValue(value: CellValue, format?: CellFormat): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';

  const numVal = typeof value === 'number' ? value : Number(value);
  const isNumeric = !isNaN(numVal) && String(value).trim() !== '';

  if (!format || !format.numberFormat || format.numberFormat === 'text') {
    return String(value);
  }

  const decimals = format.decimals !== undefined ? format.decimals : 2;

  switch (format.numberFormat) {
    case 'number':
      if (isNumeric) {
        return numVal.toLocaleString('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
      }
      return String(value);

    case 'currency':
      if (isNumeric) {
        const symbol = format.currencySymbol || '$';
        const formatted = Math.abs(numVal).toLocaleString('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
        return numVal < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
      }
      return String(value);

    case 'percent':
      if (isNumeric) {
        const pctVal = numVal * 100;
        return `${pctVal.toFixed(decimals)}%`;
      }
      return String(value);

    case 'scientific':
      if (isNumeric) {
        return numVal.toExponential(decimals);
      }
      return String(value);

    case 'date':
      try {
        const d = new Date(String(value));
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
        }
      } catch {
        // fallback
      }
      return String(value);

    default:
      return String(value);
  }
}
