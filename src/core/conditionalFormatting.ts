import { CellValue, CellFormat, ConditionalFormatRule, SingleColorRule, ColorScaleRule, SheetData } from '../types/spreadsheet';
import { parseRangeString, expandRange, cellKeyToCoords, coordsToCellKey } from './cellUtils';

/**
 * Interpolate RGB color between two hex colors based on ratio (0 to 1)
 */
function interpolateColor(color1: string, color2: string, factor: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  if (!c1 || !c2) return color1;

  const r = Math.round(c1.r + factor * (c2.r - c1.r));
  const g = Math.round(c1.g + factor * (c2.g - c1.g));
  const b = Math.round(c1.b + factor * (c2.b - c1.b));

  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Evaluate single color rule against a cell value
 */
function testSingleRule(value: CellValue, rule: SingleColorRule): boolean {
  const strVal = String(value ?? '').trim();
  const numVal = typeof value === 'number' ? value : Number(value);
  const isNum = !isNaN(numVal) && strVal !== '';

  const target1 = rule.value1;
  const numTarget1 = Number(target1);
  const isTarget1Num = !isNaN(numTarget1) && String(target1).trim() !== '';

  switch (rule.operator) {
    case 'greaterThan':
      return isNum && isTarget1Num ? numVal > numTarget1 : false;
    case 'lessThan':
      return isNum && isTarget1Num ? numVal < numTarget1 : false;
    case 'equalTo':
      return isNum && isTarget1Num ? numVal === numTarget1 : strVal.toLowerCase() === String(target1).toLowerCase();
    case 'notEqualTo':
      return isNum && isTarget1Num ? numVal !== numTarget1 : strVal.toLowerCase() !== String(target1).toLowerCase();
    case 'between': {
      const numTarget2 = Number(rule.value2);
      if (isNum && isTarget1Num && !isNaN(numTarget2)) {
        const min = Math.min(numTarget1, numTarget2);
        const max = Math.max(numTarget1, numTarget2);
        return numVal >= min && numVal <= max;
      }
      return false;
    }
    case 'contains':
      return strVal.toLowerCase().includes(String(target1).toLowerCase());
    case 'notContains':
      return !strVal.toLowerCase().includes(String(target1).toLowerCase());
    case 'startsWith':
      return strVal.toLowerCase().startsWith(String(target1).toLowerCase());
    case 'isEmpty':
      return value === null || value === undefined || strVal === '';
    case 'isNotEmpty':
      return value !== null && value !== undefined && strVal !== '';
    default:
      return false;
  }
}

/**
 * Compute the conditional formatting style for a specific cell in a sheet
 */
export function getConditionalFormatStyle(
  cellKey: string,
  cellValue: CellValue,
  sheet: SheetData
): Partial<CellFormat> | null {
  if (!sheet.conditionalRules || sheet.conditionalRules.length === 0) return null;

  for (const condRule of sheet.conditionalRules) {
    const range = parseRangeString(condRule.range);
    if (!range) continue;

    const cellCoords = cellKeyToCoords(cellKey);
    if (!cellCoords) continue;

    const inRange =
      cellCoords.row >= range.startRow &&
      cellCoords.row <= range.endRow &&
      cellCoords.col >= range.startCol &&
      cellCoords.col <= range.endCol;

    if (!inRange) continue;

    if (condRule.rule.type === 'single') {
      if (testSingleRule(cellValue, condRule.rule)) {
        return {
          bgColor: condRule.rule.format.bgColor,
          textColor: condRule.rule.format.textColor,
          bold: condRule.rule.format.bold,
        };
      }
    } else if (condRule.rule.type === 'colorScale') {
      // Collect all numeric values in the rule's range to calculate min & max
      const allKeys = expandRange(range);
      const nums: number[] = [];

      for (const k of allKeys) {
        const c = sheet.cells[k];
        const v = c?.computedValue !== undefined ? c.computedValue : c?.value;
        const n = Number(v);
        if (v !== null && v !== '' && !isNaN(n)) {
          nums.push(n);
        }
      }

      if (nums.length < 2) continue;
      const min = Math.min(...nums);
      const max = Math.max(...nums);
      if (min === max) continue;

      const numVal = Number(cellValue);
      if (isNaN(numVal) || cellValue === null || cellValue === '') continue;

      const ratio = Math.max(0, Math.min(1, (numVal - min) / (max - min)));
      const minCol = condRule.rule.minColor || '#86efac'; // soft green
      const midCol = condRule.rule.midColor || '#fef08a'; // soft yellow
      const maxCol = condRule.rule.maxColor || '#fca5a5'; // soft red

      let computedBg = '';
      if (condRule.rule.midColor) {
        if (ratio < 0.5) {
          computedBg = interpolateColor(minCol, midCol, ratio * 2);
        } else {
          computedBg = interpolateColor(midCol, maxCol, (ratio - 0.5) * 2);
        }
      } else {
        computedBg = interpolateColor(minCol, maxCol, ratio);
      }

      return { bgColor: computedBg };
    }
  }

  return null;
}
