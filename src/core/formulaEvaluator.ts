import { CellValue, SheetData, Workbook } from '../types/spreadsheet';
import { cellKeyToCoords, coordsToCellKey, expandRange, parseRangeString } from './cellUtils';

export type FormulaResult = {
  value: CellValue;
  error?: string;
  referencedCells: string[]; // for dependency tracking
};

/**
 * Formula Function Definition
 */
type FormulaFunction = (args: any[], context: EvaluationContext) => CellValue;

export interface EvaluationContext {
  currentSheet: SheetData;
  workbook?: Workbook;
  evaluatingCellKey: string;
  depth?: number;
  aiCache?: Record<string, string>;
}

// Built-in intelligent offline NLP heuristic for AI functions
function smartOfflineAI(prompt: string, contextVal: string): string {
  const p = prompt.toLowerCase();
  const c = contextVal.trim();

  // Sentiment detection
  if (p.includes('sentiment') || p.includes('positive') || p.includes('negative')) {
    const posWords = ['good', 'great', 'love', 'excellent', 'happy', 'fast', 'amazing', 'super', 'best', 'awesome', 'profit', 'gain', 'growth', 'clean', 'perfect', 'satisfied', 'helpful'];
    const negWords = ['bad', 'poor', 'hate', 'terrible', 'sad', 'slow', 'worst', 'awful', 'loss', 'drop', 'decline', 'bug', 'broken', 'error', 'cancel', 'angry', 'complaint'];
    const lower = c.toLowerCase();
    const posCount = posWords.filter(w => lower.includes(w)).length;
    const negCount = negWords.filter(w => lower.includes(w)).length;
    if (posCount > negCount) return 'Positive';
    if (negCount > posCount) return 'Negative';
    return 'Neutral';
  }

  // Email extraction
  if (p.includes('email')) {
    const emailMatch = c.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    return emailMatch ? emailMatch[1] : 'N/A';
  }

  // Phone extraction
  if (p.includes('phone') || p.includes('number')) {
    const phoneMatch = c.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    return phoneMatch ? phoneMatch[0] : 'N/A';
  }

  // Translation mock/heuristic
  if (p.includes('spanish')) {
    if (c.toLowerCase() === 'hello') return 'Hola';
    if (c.toLowerCase() === 'thank you') return 'Gracias';
    if (c.toLowerCase() === 'yes') return 'Sí';
    if (c.toLowerCase() === 'no') return 'No';
    return `[ES] ${c}`;
  }
  if (p.includes('french')) {
    if (c.toLowerCase() === 'hello') return 'Bonjour';
    if (c.toLowerCase() === 'thank you') return 'Merci';
    if (c.toLowerCase() === 'yes') return 'Oui';
    return `[FR] ${c}`;
  }
  if (p.includes('german')) {
    if (c.toLowerCase() === 'hello') return 'Hallo';
    if (c.toLowerCase() === 'thank you') return 'Danke';
    return `[DE] ${c}`;
  }

  // Summary / capitalize
  if (p.includes('summary') || p.includes('summarize')) {
    const words = c.split(/\s+/);
    return words.length > 5 ? words.slice(0, 5).join(' ') + '...' : c;
  }

  if (p.includes('category') || p.includes('classify')) {
    return 'General';
  }

  return `AI: ${c ? `Processed "${c}"` : prompt}`;
}

/**
 * Standard Spreadsheet Functions Registry
 */
export const FUNCTIONS: Record<string, FormulaFunction> = {
  // Math & Stats
  SUM: (args) => {
    let sum = 0;
    const flatten = flattenValues(args);
    for (const val of flatten) {
      if (val !== null && val !== '' && !isNaN(Number(val))) {
        sum += Number(val);
      }
    }
    return sum;
  },

  AVERAGE: (args) => {
    let sum = 0;
    let count = 0;
    const flatten = flattenValues(args);
    for (const val of flatten) {
      if (val !== null && val !== '' && !isNaN(Number(val))) {
        sum += Number(val);
        count++;
      }
    }
    return count === 0 ? '#DIV/0!' : sum / count;
  },

  COUNT: (args) => {
    let count = 0;
    const flatten = flattenValues(args);
    for (const val of flatten) {
      if (val !== null && val !== '' && !isNaN(Number(val))) {
        count++;
      }
    }
    return count;
  },

  COUNTA: (args) => {
    let count = 0;
    const flatten = flattenValues(args);
    for (const val of flatten) {
      if (val !== null && val !== undefined && String(val).trim() !== '') {
        count++;
      }
    }
    return count;
  },

  COUNTBLANK: (args) => {
    let count = 0;
    const flatten = flattenValues(args);
    for (const val of flatten) {
      if (val === null || val === undefined || String(val).trim() === '') {
        count++;
      }
    }
    return count;
  },

  MIN: (args) => {
    const nums: number[] = [];
    for (const val of flattenValues(args)) {
      if (val !== null && val !== '' && !isNaN(Number(val))) {
        nums.push(Number(val));
      }
    }
    return nums.length === 0 ? 0 : Math.min(...nums);
  },

  MAX: (args) => {
    const nums: number[] = [];
    for (const val of flattenValues(args)) {
      if (val !== null && val !== '' && !isNaN(Number(val))) {
        nums.push(Number(val));
      }
    }
    return nums.length === 0 ? 0 : Math.max(...nums);
  },

  PRODUCT: (args) => {
    let prod = 1;
    let hasVal = false;
    for (const val of flattenValues(args)) {
      if (val !== null && val !== '' && !isNaN(Number(val))) {
        prod *= Number(val);
        hasVal = true;
      }
    }
    return hasVal ? prod : 0;
  },

  MEDIAN: (args) => {
    const nums: number[] = [];
    for (const val of flattenValues(args)) {
      if (val !== null && val !== '' && !isNaN(Number(val))) {
        nums.push(Number(val));
      }
    }
    if (nums.length === 0) return '#NUM!';
    nums.sort((a, b) => a - b);
    const mid = Math.floor(nums.length / 2);
    return nums.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
  },

  ROUND: (args) => {
    const num = Number(args[0]);
    const decimals = args[1] !== undefined ? Number(args[1]) : 0;
    if (isNaN(num)) return '#VALUE!';
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  },

  ROUNDUP: (args) => {
    const num = Number(args[0]);
    const decimals = args[1] !== undefined ? Number(args[1]) : 0;
    if (isNaN(num)) return '#VALUE!';
    const factor = Math.pow(10, decimals);
    return Math.ceil(num * factor) / factor;
  },

  ROUNDDOWN: (args) => {
    const num = Number(args[0]);
    const decimals = args[1] !== undefined ? Number(args[1]) : 0;
    if (isNaN(num)) return '#VALUE!';
    const factor = Math.pow(10, decimals);
    return Math.floor(num * factor) / factor;
  },

  ABS: (args) => {
    const num = Number(args[0]);
    return isNaN(num) ? '#VALUE!' : Math.abs(num);
  },

  SQRT: (args) => {
    const num = Number(args[0]);
    if (isNaN(num) || num < 0) return '#NUM!';
    return Math.sqrt(num);
  },

  POWER: (args) => {
    const base = Number(args[0]);
    const exp = Number(args[1]);
    if (isNaN(base) || isNaN(exp)) return '#VALUE!';
    return Math.pow(base, exp);
  },

  MOD: (args) => {
    const n = Number(args[0]);
    const d = Number(args[1]);
    if (isNaN(n) || isNaN(d)) return '#VALUE!';
    if (d === 0) return '#DIV/0!';
    return n % d;
  },

  INT: (args) => {
    const num = Number(args[0]);
    return isNaN(num) ? '#VALUE!' : Math.floor(num);
  },

  RAND: () => Math.random(),

  RANDBETWEEN: (args) => {
    const min = Math.ceil(Number(args[0]));
    const max = Math.floor(Number(args[1]));
    if (isNaN(min) || isNaN(max)) return '#VALUE!';
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // Conditionals & Logic
  IF: (args) => {
    const condition = evaluateTruth(args[0]);
    if (condition) {
      return args[1] !== undefined ? args[1] : true;
    }
    return args[2] !== undefined ? args[2] : false;
  },

  IFS: (args) => {
    for (let i = 0; i < args.length; i += 2) {
      if (evaluateTruth(args[i])) {
        return args[i + 1] !== undefined ? args[i + 1] : true;
      }
    }
    return '#N/A';
  },

  AND: (args) => {
    const vals = flattenValues(args);
    if (vals.length === 0) return '#VALUE!';
    return vals.every(v => evaluateTruth(v));
  },

  OR: (args) => {
    const vals = flattenValues(args);
    if (vals.length === 0) return '#VALUE!';
    return vals.some(v => evaluateTruth(v));
  },

  NOT: (args) => {
    return !evaluateTruth(args[0]);
  },

  IFERROR: (args) => {
    const val = args[0];
    if (typeof val === 'string' && val.startsWith('#')) {
      return args[1] !== undefined ? args[1] : '';
    }
    return val;
  },

  IFNA: (args) => {
    const val = args[0];
    if (val === '#N/A') {
      return args[1] !== undefined ? args[1] : '';
    }
    return val;
  },

  ISBLANK: (args) => {
    return args[0] === null || args[0] === undefined || args[0] === '';
  },

  ISNUMBER: (args) => {
    return typeof args[0] === 'number' || (!isNaN(Number(args[0])) && args[0] !== '' && args[0] !== null);
  },

  ISTEXT: (args) => {
    return typeof args[0] === 'string' && isNaN(Number(args[0]));
  },

  COUNTIF: (args) => {
    const rangeVals = flattenValues([args[0]]);
    const criterion = args[1];
    let count = 0;
    for (const val of rangeVals) {
      if (matchesCriterion(val, criterion)) count++;
    }
    return count;
  },

  SUMIF: (args) => {
    const rangeVals = flattenValues([args[0]]);
    const criterion = args[1];
    const sumVals = args[2] ? flattenValues([args[2]]) : rangeVals;
    let sum = 0;
    for (let i = 0; i < rangeVals.length; i++) {
      if (matchesCriterion(rangeVals[i], criterion)) {
        const num = Number(sumVals[i]);
        if (!isNaN(num)) sum += num;
      }
    }
    return sum;
  },

  AVERAGEIF: (args) => {
    const rangeVals = flattenValues([args[0]]);
    const criterion = args[1];
    const avgVals = args[2] ? flattenValues([args[2]]) : rangeVals;
    let sum = 0;
    let count = 0;
    for (let i = 0; i < rangeVals.length; i++) {
      if (matchesCriterion(rangeVals[i], criterion)) {
        const num = Number(avgVals[i]);
        if (!isNaN(num)) {
          sum += num;
          count++;
        }
      }
    }
    return count === 0 ? '#DIV/0!' : sum / count;
  },

  // Lookup & Reference
  VLOOKUP: (args, ctx) => {
    const lookupVal = args[0];
    const tableRangeStr = args[1]; // Expected range string like "A1:D10"
    const colIndex = Number(args[2]); // 1-indexed
    const exactMatch = args[3] !== undefined ? !evaluateTruth(args[3]) : true;

    if (isNaN(colIndex) || colIndex < 1) return '#VALUE!';

    // Resolve range
    let range: any = typeof tableRangeStr === 'string' ? parseRangeString(tableRangeStr) : null;
    if (!range) return '#REF!';

    const sheet = ctx.currentSheet;
    const width = range.endCol - range.startCol + 1;
    if (colIndex > width) return '#REF!';

    for (let r = range.startRow; r <= range.endRow; r++) {
      const firstCellKey = coordsToCellKey(r, range.startCol);
      const cellData = sheet.cells[firstCellKey];
      const cellVal = cellData?.computedValue !== undefined ? cellData.computedValue : cellData?.value;

      if (isLookupMatch(cellVal, lookupVal, exactMatch)) {
        const targetKey = coordsToCellKey(r, range.startCol + colIndex - 1);
        const targetData = sheet.cells[targetKey];
        return targetData?.computedValue !== undefined ? targetData.computedValue : (targetData?.value ?? '');
      }
    }
    return '#N/A';
  },

  HLOOKUP: (args, ctx) => {
    const lookupVal = args[0];
    const tableRangeStr = args[1];
    const rowIndex = Number(args[2]); // 1-indexed
    const exactMatch = args[3] !== undefined ? !evaluateTruth(args[3]) : true;

    if (isNaN(rowIndex) || rowIndex < 1) return '#VALUE!';

    let range = typeof tableRangeStr === 'string' ? parseRangeString(tableRangeStr) : null;
    if (!range) return '#REF!';

    const sheet = ctx.currentSheet;
    const height = range.endRow - range.startRow + 1;
    if (rowIndex > height) return '#REF!';

    for (let c = range.startCol; c <= range.endCol; c++) {
      const topCellKey = coordsToCellKey(range.startRow, c);
      const cellData = sheet.cells[topCellKey];
      const cellVal = cellData?.computedValue !== undefined ? cellData.computedValue : cellData?.value;

      if (isLookupMatch(cellVal, lookupVal, exactMatch)) {
        const targetKey = coordsToCellKey(range.startRow + rowIndex - 1, c);
        const targetData = sheet.cells[targetKey];
        return targetData?.computedValue !== undefined ? targetData.computedValue : (targetData?.value ?? '');
      }
    }
    return '#N/A';
  },

  INDEX: (args, ctx) => {
    const rangeStr = args[0];
    const rowNum = Number(args[1]); // 1-indexed
    const colNum = args[2] !== undefined ? Number(args[2]) : 1; // 1-indexed

    let range = typeof rangeStr === 'string' ? parseRangeString(rangeStr) : null;
    if (!range) return '#REF!';

    const targetRow = range.startRow + rowNum - 1;
    const targetCol = range.startCol + colNum - 1;

    if (targetRow > range.endRow || targetCol > range.endCol) return '#REF!';

    const targetKey = coordsToCellKey(targetRow, targetCol);
    const cellData = ctx.currentSheet.cells[targetKey];
    return cellData?.computedValue !== undefined ? cellData.computedValue : (cellData?.value ?? '');
  },

  MATCH: (args) => {
    const lookupVal = args[0];
    const lookupArray = flattenValues([args[1]]);
    for (let i = 0; i < lookupArray.length; i++) {
      if (String(lookupArray[i]).toLowerCase() === String(lookupVal).toLowerCase()) {
        return i + 1; // 1-indexed position
      }
    }
    return '#N/A';
  },

  // Text Functions
  CONCATENATE: (args) => {
    return flattenValues(args).map(v => (v === null ? '' : String(v))).join('');
  },

  CONCAT: (args) => {
    return `${args[0] ?? ''}${args[1] ?? ''}`;
  },

  TEXTJOIN: (args) => {
    const delimiter = String(args[0] ?? '');
    const ignoreEmpty = evaluateTruth(args[1]);
    const vals = flattenValues(args.slice(2));
    const filtered = ignoreEmpty ? vals.filter(v => v !== null && v !== undefined && String(v).trim() !== '') : vals;
    return filtered.map(v => (v === null ? '' : String(v))).join(delimiter);
  },

  LEFT: (args) => {
    const str = String(args[0] ?? '');
    const count = args[1] !== undefined ? Number(args[1]) : 1;
    return str.substring(0, isNaN(count) ? 1 : count);
  },

  RIGHT: (args) => {
    const str = String(args[0] ?? '');
    const count = args[1] !== undefined ? Number(args[1]) : 1;
    const n = isNaN(count) ? 1 : count;
    return str.substring(Math.max(0, str.length - n));
  },

  MID: (args) => {
    const str = String(args[0] ?? '');
    const start = Number(args[1]); // 1-indexed
    const length = Number(args[2]);
    if (isNaN(start) || isNaN(length) || start < 1) return '#VALUE!';
    return str.substring(start - 1, start - 1 + length);
  },

  LEN: (args) => {
    return String(args[0] ?? '').length;
  },

  UPPER: (args) => {
    return String(args[0] ?? '').toUpperCase();
  },

  LOWER: (args) => {
    return String(args[0] ?? '').toLowerCase();
  },

  PROPER: (args) => {
    return String(args[0] ?? '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  },

  TRIM: (args) => {
    return String(args[0] ?? '').trim().replace(/\s+/g, ' ');
  },

  REPLACE: (args) => {
    const str = String(args[0] ?? '');
    const pos = Number(args[1]);
    const len = Number(args[2]);
    const newStr = String(args[3] ?? '');
    if (isNaN(pos) || isNaN(len) || pos < 1) return '#VALUE!';
    return str.substring(0, pos - 1) + newStr + str.substring(pos - 1 + len);
  },

  SUBSTITUTE: (args) => {
    const text = String(args[0] ?? '');
    const oldText = String(args[1] ?? '');
    const newText = String(args[2] ?? '');
    if (!oldText) return text;
    return text.split(oldText).join(newText);
  },

  REPT: (args) => {
    const str = String(args[0] ?? '');
    const count = Number(args[1]);
    if (isNaN(count) || count < 0) return '#VALUE!';
    return str.repeat(Math.min(1000, count));
  },

  // Date & Time Functions
  TODAY: () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  NOW: () => {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
  },

  DATE: (args) => {
    const year = Number(args[0]);
    const month = Number(args[1]);
    const day = Number(args[2]);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return '#VALUE!';
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  },

  YEAR: (args) => {
    const d = new Date(String(args[0]));
    return isNaN(d.getTime()) ? '#VALUE!' : d.getFullYear();
  },

  MONTH: (args) => {
    const d = new Date(String(args[0]));
    return isNaN(d.getTime()) ? '#VALUE!' : d.getMonth() + 1;
  },

  DAY: (args) => {
    const d = new Date(String(args[0]));
    return isNaN(d.getTime()) ? '#VALUE!' : d.getDate();
  },

  // AI-Powered Functions
  AI: (args) => {
    const prompt = String(args[0] ?? '');
    const context = args[1] !== undefined ? String(args[1]) : '';
    return smartOfflineAI(prompt, context);
  },

  AI_SENTIMENT: (args) => {
    const text = String(args[0] ?? '');
    return smartOfflineAI('sentiment', text);
  },

  AI_EXTRACT: (args) => {
    const text = String(args[0] ?? '');
    const entity = String(args[1] ?? 'email');
    return smartOfflineAI(`extract ${entity}`, text);
  },

  AI_TRANSLATE: (args) => {
    const text = String(args[0] ?? '');
    const targetLang = String(args[1] ?? 'Spanish');
    return smartOfflineAI(`translate to ${targetLang}`, text);
  },

  AI_CLASSIFY: (args) => {
    const text = String(args[0] ?? '');
    const options = String(args[1] ?? '');
    const optList = options.split(',').map(s => s.trim()).filter(Boolean);
    if (optList.length > 0) {
      const lower = text.toLowerCase();
      for (const opt of optList) {
        if (lower.includes(opt.toLowerCase())) return opt;
      }
      return optList[0];
    }
    return 'Standard';
  },
};

/**
 * Helpers
 */
function flattenValues(arr: any[]): any[] {
  const result: any[] = [];
  for (const item of arr) {
    if (Array.isArray(item)) {
      result.push(...flattenValues(item));
    } else {
      result.push(item);
    }
  }
  return result;
}

function evaluateTruth(val: any): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  if (typeof val === 'string') {
    const up = val.toUpperCase().trim();
    if (up === 'TRUE') return true;
    if (up === 'FALSE') return false;
    const num = Number(val);
    return !isNaN(num) ? num !== 0 : val.length > 0;
  }
  return !!val;
}

function matchesCriterion(val: any, criterion: any): boolean {
  if (criterion === undefined || criterion === null) return val === null || val === '';
  const critStr = String(criterion).trim();
  const valStr = String(val ?? '').trim();

  // Condition operator e.g. ">50", "<=10", "<>0"
  const opMatch = critStr.match(/^([><=!]+)(.*)$/);
  if (opMatch) {
    const op = opMatch[1];
    const targetNum = Number(opMatch[2].trim());
    const valNum = Number(valStr);
    if (!isNaN(targetNum) && !isNaN(valNum)) {
      switch (op) {
        case '>': return valNum > targetNum;
        case '>=': return valNum >= targetNum;
        case '<': return valNum < targetNum;
        case '<=': return valNum <= targetNum;
        case '=': case '==': return valNum === targetNum;
        case '<>': case '!=': return valNum !== targetNum;
      }
    }
  }

  // Exact or wildcard comparison
  return valStr.toLowerCase() === critStr.toLowerCase();
}

function isLookupMatch(cellVal: any, lookupVal: any, exact: boolean): boolean {
  if (exact) {
    return String(cellVal ?? '').toLowerCase() === String(lookupVal ?? '').toLowerCase();
  }
  return Number(cellVal) <= Number(lookupVal);
}

/**
 * Core Formula Parser and Evaluator
 */
export function evaluateFormula(
  formula: string,
  context: EvaluationContext
): FormulaResult {
  const referencedCells: string[] = [];

  if (!formula.startsWith('=')) {
    return { value: formula, referencedCells };
  }

  const expr = formula.substring(1).trim();
  if (!expr) {
    return { value: '', referencedCells };
  }

  try {
    const tokens = tokenize(expr);
    let index = 0;

    function parseExpression(): any {
      return parseLogicalOr();
    }

    function parseLogicalOr(): any {
      let left = parseLogicalAnd();
      while (index < tokens.length && tokens[index]?.type === 'OP_OR') {
        index++;
        const right = parseLogicalAnd();
        left = evaluateTruth(left) || evaluateTruth(right);
      }
      return left;
    }

    function parseLogicalAnd(): any {
      let left = parseComparison();
      while (index < tokens.length && tokens[index]?.type === 'OP_AND') {
        index++;
        const right = parseComparison();
        left = evaluateTruth(left) && evaluateTruth(right);
      }
      return left;
    }

    function parseComparison(): any {
      let left = parseConcat();
      while (index < tokens.length && tokens[index]?.type === 'COMPARE') {
        const op = tokens[index].value;
        index++;
        const right = parseConcat();
        left = applyComparison(left, op, right);
      }
      return left;
    }

    function parseConcat(): any {
      let left = parseAddSub();
      while (index < tokens.length && tokens[index]?.type === 'AMP') {
        index++;
        const right = parseAddSub();
        left = `${left ?? ''}${right ?? ''}`;
      }
      return left;
    }

    function parseAddSub(): any {
      let left = parseMulDiv();
      while (index < tokens.length && (tokens[index]?.type === 'PLUS' || tokens[index]?.type === 'MINUS')) {
        const op = tokens[index].type;
        index++;
        const right = parseMulDiv();
        const numL = Number(left);
        const numR = Number(right);
        if (isNaN(numL) || isNaN(numR)) {
          left = '#VALUE!';
        } else {
          left = op === 'PLUS' ? numL + numR : numL - numR;
        }
      }
      return left;
    }

    function parseMulDiv(): any {
      let left = parsePower();
      while (index < tokens.length && (tokens[index]?.type === 'STAR' || tokens[index]?.type === 'SLASH' || tokens[index]?.type === 'PERCENT_OP')) {
        const op = tokens[index].type;
        index++;
        const right = parsePower();
        const numL = Number(left);
        const numR = Number(right);
        if (isNaN(numL) || isNaN(numR)) {
          left = '#VALUE!';
        } else if (op === 'STAR') {
          left = numL * numR;
        } else if (op === 'SLASH') {
          left = numR === 0 ? '#DIV/0!' : numL / numR;
        } else if (op === 'PERCENT_OP') {
          left = numL % numR;
        }
      }
      return left;
    }

    function parsePower(): any {
      let left = parseUnary();
      while (index < tokens.length && tokens[index]?.type === 'CARET') {
        index++;
        const right = parseUnary();
        const numL = Number(left);
        const numR = Number(right);
        left = isNaN(numL) || isNaN(numR) ? '#VALUE!' : Math.pow(numL, numR);
      }
      return left;
    }

    function parseUnary(): any {
      if (tokens[index]?.type === 'PLUS') {
        index++;
        return Number(parseUnary());
      }
      if (tokens[index]?.type === 'MINUS') {
        index++;
        return -Number(parseUnary());
      }
      return parsePrimary();
    }

    function parsePrimary(): any {
      const token = tokens[index];
      if (!token) return '';

      // Number
      if (token.type === 'NUMBER') {
        index++;
        return Number(token.value);
      }

      // String literal
      if (token.type === 'STRING') {
        index++;
        return token.value;
      }

      // Boolean
      if (token.type === 'BOOLEAN') {
        index++;
        return token.value.toUpperCase() === 'TRUE';
      }

      // Parentheses
      if (token.type === 'LPAREN') {
        index++;
        const val = parseExpression();
        if (tokens[index]?.type === 'RPAREN') {
          index++;
        }
        return val;
      }

      // Function Call e.g. SUM(...)
      if (token.type === 'FUNCTION') {
        const fnName = token.value.toUpperCase();
        index++; // past fn
        if (tokens[index]?.type === 'LPAREN') {
          index++; // past (
        }
        const args: any[] = [];
        while (index < tokens.length && tokens[index]?.type !== 'RPAREN') {
          // Check if argument is a Range like A1:B10
          if (tokens[index]?.type === 'RANGE') {
            const rangeStr = tokens[index].value;
            index++;
            // Resolve range to array of values or pass range string for VLOOKUP/INDEX
            if (['VLOOKUP', 'HLOOKUP', 'INDEX'].includes(fnName) && args.length === 1) {
              args.push(rangeStr);
            } else {
              const range = parseRangeString(rangeStr);
              if (range) {
                const cellKeys = expandRange(range);
                referencedCells.push(...cellKeys);
                const values = cellKeys.map(k => {
                  const c = context.currentSheet.cells[k];
                  return c?.computedValue !== undefined ? c.computedValue : (c?.value ?? 0);
                });
                args.push(values);
              } else {
                args.push('#REF!');
              }
            }
          } else {
            args.push(parseExpression());
          }

          if (tokens[index]?.type === 'COMMA') {
            index++;
          }
        }
        if (tokens[index]?.type === 'RPAREN') {
          index++;
        }

        const fn = FUNCTIONS[fnName];
        if (fn) {
          return fn(args, context);
        } else {
          return '#NAME?';
        }
      }

      // Range outside of function (e.g. =A1:A5 in single cell)
      if (token.type === 'RANGE') {
        const rangeStr = token.value;
        index++;
        const range = parseRangeString(rangeStr);
        if (range) {
          const firstKey = coordsToCellKey(range.startRow, range.startCol);
          referencedCells.push(firstKey);
          const c = context.currentSheet.cells[firstKey];
          return c?.computedValue !== undefined ? c.computedValue : (c?.value ?? 0);
        }
        return '#REF!';
      }

      // Single Cell Reference e.g. A1, $B$4, Sheet2!C1
      if (token.type === 'CELL_REF') {
        const cellRef = token.value.replace(/\$/g, '').toUpperCase();
        index++;
        referencedCells.push(cellRef);

        // Check for circular reference
        if (cellRef === context.evaluatingCellKey) {
          return '#CYCLE!';
        }

        const c = context.currentSheet.cells[cellRef];
        return c?.computedValue !== undefined ? c.computedValue : (c?.value ?? 0);
      }

      index++;
      return token.value;
    }

    const evaluated = parseExpression();
    return {
      value: evaluated,
      referencedCells: Array.from(new Set(referencedCells)),
    };
  } catch (err: any) {
    return {
      value: '#ERROR!',
      error: err.message,
      referencedCells,
    };
  }
}

function applyComparison(left: any, op: string, right: any): boolean {
  const numL = Number(left);
  const numR = Number(right);
  const isNumeric = !isNaN(numL) && !isNaN(numR) && left !== '' && right !== '';

  switch (op) {
    case '=':
    case '==':
      return String(left).toLowerCase() === String(right).toLowerCase();
    case '<>':
    case '!=':
      return String(left).toLowerCase() !== String(right).toLowerCase();
    case '>':
      return isNumeric ? numL > numR : String(left) > String(right);
    case '>=':
      return isNumeric ? numL >= numR : String(left) >= String(right);
    case '<':
      return isNumeric ? numL < numR : String(left) < String(right);
    case '<=':
      return isNumeric ? numL <= numR : String(left) <= String(right);
    default:
      return false;
  }
}

/**
 * Formula Lexer / Tokenizer
 */
interface Token {
  type: 'NUMBER' | 'STRING' | 'BOOLEAN' | 'FUNCTION' | 'CELL_REF' | 'RANGE' | 'PLUS' | 'MINUS' | 'STAR' | 'SLASH' | 'CARET' | 'PERCENT_OP' | 'AMP' | 'COMPARE' | 'LPAREN' | 'RPAREN' | 'COMMA' | 'OP_AND' | 'OP_OR' | 'UNKNOWN';
  value: string;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Number literal
    if (/\d/.test(char) || (char === '.' && /\d/.test(input[i + 1] || ''))) {
      let numStr = '';
      while (i < input.length && (/[\d.]/.test(input[i]))) {
        numStr += input[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: numStr });
      continue;
    }

    // String literal
    if (char === '"' || char === "'") {
      const quote = char;
      i++;
      let str = '';
      while (i < input.length && input[i] !== quote) {
        if (input[i] === '\\' && i + 1 < input.length) {
          i++;
          str += input[i];
        } else {
          str += input[i];
        }
        i++;
      }
      i++; // skip closing quote
      tokens.push({ type: 'STRING', value: str });
      continue;
    }

    // Operators
    if (char === '+') { tokens.push({ type: 'PLUS', value: '+' }); i++; continue; }
    if (char === '-') { tokens.push({ type: 'MINUS', value: '-' }); i++; continue; }
    if (char === '*') { tokens.push({ type: 'STAR', value: '*' }); i++; continue; }
    if (char === '/') { tokens.push({ type: 'SLASH', value: '/' }); i++; continue; }
    if (char === '^') { tokens.push({ type: 'CARET', value: '^' }); i++; continue; }
    if (char === '%') { tokens.push({ type: 'PERCENT_OP', value: '%' }); i++; continue; }
    if (char === '&') { tokens.push({ type: 'AMP', value: '&' }); i++; continue; }
    if (char === '(') { tokens.push({ type: 'LPAREN', value: '(' }); i++; continue; }
    if (char === ')') { tokens.push({ type: 'RPAREN', value: ')' }); i++; continue; }
    if (char === ',') { tokens.push({ type: 'COMMA', value: ',' }); i++; continue; }

    // Comparison operators (<=, >=, <>, !=, ==, =, <, >)
    if (['<', '>', '=', '!'].includes(char)) {
      let op = char;
      if (['<=', '>=', '<>', '!=', '=='].includes(input.substring(i, i + 2))) {
        op = input.substring(i, i + 2);
        i += 2;
      } else {
        i += 1;
      }
      tokens.push({ type: 'COMPARE', value: op });
      continue;
    }

    // Identifier: Function name, Cell reference, Range, or Boolean
    if (/[a-zA-Z_$]/.test(char)) {
      let id = '';
      while (i < input.length && /[a-zA-Z0-9_$:]/.test(input[i])) {
        id += input[i];
        i++;
      }

      // Check if it's a range like A1:B10 or $A$1:$B$10
      if (id.includes(':')) {
        tokens.push({ type: 'RANGE', value: id.toUpperCase() });
        continue;
      }

      // Check if next char is '(' -> Function
      let lookahead = i;
      while (lookahead < input.length && /\s/.test(input[lookahead])) {
        lookahead++;
      }
      if (input[lookahead] === '(') {
        tokens.push({ type: 'FUNCTION', value: id.toUpperCase() });
        continue;
      }

      // Check if boolean
      if (id.toUpperCase() === 'TRUE' || id.toUpperCase() === 'FALSE') {
        tokens.push({ type: 'BOOLEAN', value: id.toUpperCase() });
        continue;
      }

      // Check if cell reference like A1, $A$1, BC12
      const cellClean = id.replace(/\$/g, '');
      if (cellKeyToCoords(cellClean)) {
        tokens.push({ type: 'CELL_REF', value: id.toUpperCase() });
        continue;
      }

      // Check if known function without parenthesis yet
      if (FUNCTIONS[id.toUpperCase()]) {
        tokens.push({ type: 'FUNCTION', value: id.toUpperCase() });
        continue;
      }

      tokens.push({ type: 'UNKNOWN', value: id });
      continue;
    }

    i++;
  }

  return tokens;
}
