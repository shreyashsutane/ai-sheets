import { SheetData, PivotConfig, CellData, CellFormat } from '../types/spreadsheet';
import { parseRangeString, coordsToCellKey, colIndexToLetter } from './cellUtils';
import { recalculateSheet } from './dependencyGraph';

export function generatePivotSheet(sourceSheet: SheetData, config: PivotConfig): SheetData {
  const range = parseRangeString(config.sourceRange);
  if (!range) throw new Error('Invalid source range for pivot table.');

  // 1. Extract headers and data rows from source range
  const headers: string[] = [];
  for (let c = range.startCol; c <= range.endCol; c++) {
    const key = coordsToCellKey(range.startRow, c);
    const cell = sourceSheet.cells[key];
    headers.push(String(cell?.value || `Col ${c + 1}`));
  }

  const rowsData: any[][] = [];
  for (let r = range.startRow + 1; r <= range.endRow; r++) {
    const rowVals: any[] = [];
    for (let c = range.startCol; c <= range.endCol; c++) {
      const key = coordsToCellKey(r, c);
      const cell = sourceSheet.cells[key];
      const val = cell?.computedValue !== undefined ? cell.computedValue : (cell?.value ?? '');
      rowVals.push(val);
    }
    rowsData.push(rowVals);
  }

  const rowColRelative = config.rowFieldCol - range.startCol;
  const valColRelative = config.valueFieldCol - range.startCol;
  const colColRelative = config.colFieldCol !== undefined ? config.colFieldCol - range.startCol : null;

  // 2. Perform Grouping & Aggregations
  // Structure: Map<RowGroupValue, Map<ColGroupValue, number[]>>
  const groupedData: Map<string, Map<string, number[]>> = new Map();
  const allColGroups = new Set<string>();

  for (const row of rowsData) {
    const rowVal = String(row[rowColRelative] ?? 'Unknown').trim() || 'Blank';
    const colVal = colColRelative !== null ? String(row[colColRelative] ?? 'Total').trim() || 'Total' : 'Total';
    const numVal = Number(row[valColRelative]);
    const validNum = !isNaN(numVal) ? numVal : 0;

    if (!groupedData.has(rowVal)) {
      groupedData.set(rowVal, new Map());
    }
    const colMap = groupedData.get(rowVal)!;
    if (!colMap.has(colVal)) {
      colMap.set(colVal, []);
    }
    colMap.get(colVal)!.push(validNum);
    allColGroups.add(colVal);
  }

  const sortedColGroups = Array.from(allColGroups).sort();
  const sortedRowGroups = Array.from(groupedData.keys()).sort();

  // 3. Build Destination Sheet Grid
  const cells: Record<string, CellData> = {};
  const headerFormat: CellFormat = {
    bold: true,
    bgColor: '#1e293b',
    textColor: '#ffffff',
    align: 'center',
  };
  const summaryFormat: CellFormat = {
    bold: true,
    bgColor: '#f1f5f9',
    numberFormat: 'number',
    decimals: 1,
    align: 'right',
  };
  const cellNumberFormat: CellFormat = {
    numberFormat: 'number',
    decimals: 1,
    align: 'right',
  };

  // Title & Headers
  const rowHeaderName = headers[rowColRelative] || 'Row Group';
  const valHeaderName = headers[valColRelative] || 'Value';

  cells['A1'] = { value: rowHeaderName, format: headerFormat };
  sortedColGroups.forEach((colGroup, idx) => {
    const key = coordsToCellKey(0, idx + 1);
    cells[key] = {
      value: colColRelative !== null ? `${colGroup} (${config.aggregation} of ${valHeaderName})` : `${config.aggregation} of ${valHeaderName}`,
      format: headerFormat,
    };
  });
  if (sortedColGroups.length > 1) {
    const grandTotalHeaderKey = coordsToCellKey(0, sortedColGroups.length + 1);
    cells[grandTotalHeaderKey] = { value: `Grand Total (${config.aggregation})`, format: headerFormat };
  }

  // Populate aggregated rows
  const colTotals: number[][] = Array.from({ length: sortedColGroups.length }, () => []);

  sortedRowGroups.forEach((rowKey, rIdx) => {
    const currRow = rIdx + 1;
    cells[coordsToCellKey(currRow, 0)] = {
      value: rowKey,
      format: { bold: true },
    };

    const rowAllNums: number[] = [];

    sortedColGroups.forEach((colGroup, cIdx) => {
      const colMap = groupedData.get(rowKey);
      const nums = colMap?.get(colGroup) || [];
      const aggregatedVal = computeAggregation(nums, config.aggregation);

      cells[coordsToCellKey(currRow, cIdx + 1)] = {
        value: aggregatedVal,
        format: cellNumberFormat,
      };

      rowAllNums.push(...nums);
      colTotals[cIdx].push(...nums);
    });

    if (sortedColGroups.length > 1) {
      cells[coordsToCellKey(currRow, sortedColGroups.length + 1)] = {
        value: computeAggregation(rowAllNums, config.aggregation),
        format: { ...cellNumberFormat, bold: true },
      };
    }
  });

  // Grand Total Summary Row
  const totalRowIdx = sortedRowGroups.length + 1;
  cells[coordsToCellKey(totalRowIdx, 0)] = { value: 'Grand Total', format: summaryFormat };
  const allGrandNums: number[] = [];

  sortedColGroups.forEach((_, cIdx) => {
    const totalVal = computeAggregation(colTotals[cIdx], config.aggregation);
    cells[coordsToCellKey(totalRowIdx, cIdx + 1)] = {
      value: totalVal,
      format: summaryFormat,
    };
    allGrandNums.push(...colTotals[cIdx]);
  });

  if (sortedColGroups.length > 1) {
    cells[coordsToCellKey(totalRowIdx, sortedColGroups.length + 1)] = {
      value: computeAggregation(allGrandNums, config.aggregation),
      format: summaryFormat,
    };
  }

  const pivotSheet: SheetData = {
    id: `pivot-${Date.now()}`,
    name: config.destinationSheetName || `Pivot - ${rowHeaderName}`,
    cells,
    rowCount: Math.max(50, totalRowIdx + 10),
    colCount: Math.max(26, sortedColGroups.length + 4),
  };

  return recalculateSheet(pivotSheet);
}

function computeAggregation(nums: number[], type: PivotConfig['aggregation']): number {
  if (nums.length === 0) return 0;
  switch (type) {
    case 'SUM':
      return nums.reduce((a, b) => a + b, 0);
    case 'COUNT':
      return nums.length;
    case 'AVERAGE':
      return nums.reduce((a, b) => a + b, 0) / nums.length;
    case 'MIN':
      return Math.min(...nums);
    case 'MAX':
      return Math.max(...nums);
    default:
      return nums.reduce((a, b) => a + b, 0);
  }
}
