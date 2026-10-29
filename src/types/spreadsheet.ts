export type CellValue = string | number | boolean | null;

export type AppTheme = 'light' | 'dark' | 'nord' | 'sepia' | 'dracula' | 'emerald' | 'cyberpunk';

export type BorderStyle = 'thin' | 'medium' | 'thick' | 'dashed' | 'double';

export interface CellBorders {
  top?: { style: BorderStyle; color: string };
  right?: { style: BorderStyle; color: string };
  bottom?: { style: BorderStyle; color: string };
  left?: { style: BorderStyle; color: string };
}

export type NumberFormatType = 'text' | 'number' | 'currency' | 'percent' | 'date' | 'scientific';

export interface DropdownOption {
  label: string;
  value: string;
  color?: string; // background color for badge
  textColor?: string;
}

export interface DataValidation {
  type: 'checkbox' | 'dropdown' | 'number' | 'text';
  options?: DropdownOption[]; // For dropdown lists
  min?: number;
  max?: number;
  allowInvalid?: boolean;
}

export interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  textColor?: string;
  bgColor?: string;
  fontSize?: number;
  fontFamily?: string;
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  wrapText?: 'overflow' | 'wrap' | 'clip';
  numberFormat?: NumberFormatType;
  decimals?: number;
  currencySymbol?: string;
  borders?: CellBorders;
  validation?: DataValidation;
}

export interface CellComment {
  id: string;
  author: string;
  text: string;
  timestamp: number;
  resolved?: boolean;
}

export interface CellData {
  value: CellValue;
  formula?: string;
  computedValue?: CellValue;
  error?: string;
  format?: CellFormat;
  comments?: CellComment[];
}

export type ConditionalRuleOperator =
  | 'greaterThan'
  | 'lessThan'
  | 'equalTo'
  | 'notEqualTo'
  | 'between'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'isEmpty'
  | 'isNotEmpty';

export interface SingleColorRule {
  type: 'single';
  operator: ConditionalRuleOperator;
  value1: string | number;
  value2?: string | number; // for 'between'
  format: {
    textColor?: string;
    bgColor?: string;
    bold?: boolean;
  };
}

export interface ColorScaleRule {
  type: 'colorScale';
  minColor: string;
  midColor?: string;
  maxColor: string;
}

export interface ConditionalFormatRule {
  id: string;
  range: string; // e.g. "A1:C20"
  rule: SingleColorRule | ColorScaleRule;
}

export interface SheetFilter {
  columnIndex: number;
  sortDirection?: 'asc' | 'desc';
  hiddenValues?: Set<string>;
}

export interface SheetData {
  id: string;
  name: string;
  cells: Record<string, CellData>; // Key is e.g. "A1", "B4"
  rowCount: number;
  colCount: number;
  rowHeights?: Record<number, number>;
  colWidths?: Record<number, number>;
  freezeRows?: number;
  freezeCols?: number;
  color?: string;
  conditionalRules?: ConditionalFormatRule[];
  filters?: Record<number, SheetFilter>; // Keyed by column index
  isFilterActive?: boolean;
}

export interface Workbook {
  id: string;
  title: string;
  sheets: SheetData[];
  activeSheetId: string;
}

export interface CellCoords {
  row: number; // 0-indexed
  col: number; // 0-indexed
}

export interface SelectionRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'radar';

export interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  sheetId: string;
  dataRange: string;
  labelColumnIndex?: number;
  valueColumnIndices?: number[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  proposedChanges?: {
    description: string;
    sheetId: string;
    sheetName?: string;
    affectedCells: Record<string, {
      oldValue?: CellValue;
      newValue?: CellValue;
      oldFormula?: string;
      newFormula?: string;
      format?: CellFormat;
    }>;
    chartSuggestion?: Omit<ChartConfig, 'id'>;
    summary?: string;
  };
  applied?: boolean;
}

export type AIProvider = 'builtin' | 'gemini' | 'openai' | 'claude' | 'ollama';

export interface AISettings {
  provider: AIProvider;
  apiKey: string;
  model: string;
  openaiKey?: string;
  openaiModel?: string;
  claudeKey?: string;
  claudeModel?: string;
  ollamaUrl?: string;
  ollamaModel?: string;
}

export interface PivotConfig {
  sourceRange: string; // e.g. "A1:E20"
  rowFieldCol: number;
  colFieldCol?: number;
  valueFieldCol: number;
  aggregation: 'SUM' | 'COUNT' | 'AVERAGE' | 'MIN' | 'MAX';
  destinationSheetName?: string;
}

export interface FormulaTokenColor {
  ref: string; // e.g. "A1" or "B2:C5"
  color: string;
  range: SelectionRange;
}
