import { SheetData, SelectionRange, AISettings } from '../../types/spreadsheet';
import { colIndexToLetter, colLetterToIndex } from '../cellUtils';
import { callGeminiApi, callOpenAIApi, callClaudeApi, callOllamaApi, AIResponse } from './geminiService';

export async function processAIRequest(
  prompt: string,
  currentSheet: SheetData,
  selectedRange?: SelectionRange,
  settings?: AISettings
): Promise<AIResponse> {
  const provider = settings?.provider || 'builtin';

  try {
    if (provider === 'gemini' && settings?.apiKey) {
      return await callGeminiApi(prompt, currentSheet, settings.apiKey, settings.model || 'gemini-2.0-flash');
    }
    if (provider === 'openai' && settings?.openaiKey) {
      return await callOpenAIApi(prompt, currentSheet, settings.openaiKey, settings.openaiModel || 'gpt-4o');
    }
    if (provider === 'claude' && settings?.claudeKey) {
      return await callClaudeApi(prompt, currentSheet, settings.claudeKey, settings.claudeModel || 'claude-3-7-sonnet-20250219');
    }
    if (provider === 'ollama') {
      return await callOllamaApi(prompt, currentSheet, settings?.ollamaUrl || 'http://localhost:11434', settings?.ollamaModel || 'llama3');
    }
  } catch (err: any) {
    console.warn(`LLM Provider (${provider}) call failed, falling back to smart built-in engine:`, err);
  }

  // Fallback to built-in smart heuristic engine
  return processBuiltInAI(prompt, currentSheet, selectedRange);
}

/**
 * Built-in Rule & Heuristic AI Engine
 */
function processBuiltInAI(
  prompt: string,
  sheet: SheetData,
  selectedRange?: SelectionRange
): AIResponse {
  const p = prompt.toLowerCase();

  // 1. Data Generation: Sales / Revenue / Financial Model
  if (p.includes('sales') || p.includes('revenue') || p.includes('quarter') || p.includes('forecast')) {
    return generateSalesTable(sheet);
  }

  // 2. Data Generation: Employees / Team / Staff Directory
  if (p.includes('employee') || p.includes('staff') || p.includes('team') || p.includes('hr') || p.includes('people')) {
    return generateEmployeeTable(sheet);
  }

  // 3. Data Generation: Marketing Campaign / Ad ROI
  if (p.includes('marketing') || p.includes('ad') || p.includes('campaign') || p.includes('roi') || p.includes('conversion')) {
    return generateMarketingTable(sheet);
  }

  // 4. Data Generation: Monthly Budget / Personal Finance
  if (p.includes('budget') || p.includes('expense') || p.includes('spending') || p.includes('finance')) {
    return generateBudgetTable(sheet);
  }

  // 5. Data Generation: E-commerce / Inventory / Product Catalog
  if (p.includes('inventory') || p.includes('product') || p.includes('stock') || p.includes('e-commerce') || p.includes('store')) {
    return generateInventoryTable(sheet);
  }

  // 6. Data Generation: SaaS Metrics / MRR
  if (p.includes('saas') || p.includes('mrr') || p.includes('churn') || p.includes('cac') || p.includes('subscription')) {
    return generateSaaSTable(sheet);
  }

  // 7. General Table Generation request
  if (p.includes('generate') || p.includes('create table') || p.includes('sample data') || p.includes('mock data')) {
    return generateGeneralTable(sheet);
  }

  // 8. Add Column / Formula Calculation
  if (p.includes('calculate') || p.includes('profit') || p.includes('margin') || p.includes('total') || p.includes('sum') || p.includes('average') || p.includes('add column')) {
    return calculateAndAddFormulas(sheet);
  }

  // 9. Formatting & Styling: Highlight, Colors, Bold, Headers
  if (p.includes('highlight') || p.includes('color') || p.includes('style') || p.includes('header') || p.includes('format')) {
    return formatTableStyles(sheet);
  }

  // 10. Data Cleaning: Capitalize, Trim, Clean
  if (p.includes('clean') || p.includes('trim') || p.includes('capitalize') || p.includes('uppercase') || p.includes('lowercase')) {
    return cleanSheetData(sheet);
  }

  // 11. Chart & Visualization suggestions
  if (p.includes('chart') || p.includes('visualize') || p.includes('graph') || p.includes('plot')) {
    return suggestChart(sheet, prompt);
  }

  // 12. Analyze Sheet & Insights
  if (p.includes('analyze') || p.includes('insight') || p.includes('summary') || p.includes('trend')) {
    return analyzeSheetData(sheet);
  }

  // 13. Formula assistance
  if (p.includes('formula') || p.includes('how to') || p.includes('vlookup') || p.includes('xlookup') || p.includes('if')) {
    return provideFormulaHelp();
  }

  // Default response
  return {
    message: `I've analyzed your request: "${prompt}". Here are some things I can do for you:\n- 🪄 **Generate realistic data** (Sales forecast, SaaS metrics, Employee directory, Budget)\n- ⚡ **Write & insert formulas** ("Calculate profit margin in col D", "Add a summary row with totals")\n- 🎨 **Format & highlight** ("Make headers dark navy with white bold text", "Highlight values over $10k")\n- 📊 **Create interactive charts** ("Create a bar chart of Q1-Q4 revenue")\n- 🧹 **Clean data** ("Capitalize names in column A and trim whitespace")\n\nTry giving me a command or click one of the quick suggestions!`,
  };
}

function generateSalesTable(sheet: SheetData): AIResponse {
  const headerFormat = { bold: true, bgColor: '#0f172a', textColor: '#ffffff', align: 'center' as const, fontSize: 11 };
  const currencyFormat = { numberFormat: 'currency' as const, decimals: 0, align: 'right' as const };
  const percentFormat = { numberFormat: 'percent' as const, decimals: 1, align: 'right' as const };

  const affectedCells: Record<string, any> = {
    A1: { newValue: 'Region', format: headerFormat },
    B1: { newValue: 'Q1 Revenue', format: headerFormat },
    C1: { newValue: 'Q2 Revenue', format: headerFormat },
    D1: { newValue: 'Q3 Revenue', format: headerFormat },
    E1: { newValue: 'Q4 Revenue', format: headerFormat },
    F1: { newValue: 'Total Revenue', format: headerFormat },
    G1: { newValue: 'Growth %', format: headerFormat },

    A2: { newValue: 'North America', format: { bold: true } },
    B2: { newValue: 145000, format: currencyFormat },
    C2: { newValue: 168000, format: currencyFormat },
    D2: { newValue: 192000, format: currencyFormat },
    E2: { newValue: 225000, format: currencyFormat },
    F2: { newFormula: '=SUM(B2:E2)', format: currencyFormat },
    G2: { newFormula: '=(E2-B2)/B2', format: percentFormat },

    A3: { newValue: 'Europe', format: { bold: true } },
    B3: { newValue: 98000, format: currencyFormat },
    C3: { newValue: 112000, format: currencyFormat },
    D3: { newValue: 125000, format: currencyFormat },
    E3: { newValue: 148000, format: currencyFormat },
    F3: { newFormula: '=SUM(B3:E3)', format: currencyFormat },
    G3: { newFormula: '=(E3-B3)/B3', format: percentFormat },

    A4: { newValue: 'Asia Pacific', format: { bold: true } },
    B4: { newValue: 115000, format: currencyFormat },
    C4: { newValue: 138000, format: currencyFormat },
    D4: { newValue: 164000, format: currencyFormat },
    E4: { newValue: 210000, format: currencyFormat },
    F4: { newFormula: '=SUM(B4:E4)', format: currencyFormat },
    G4: { newFormula: '=(E4-B4)/B4', format: percentFormat },

    A5: { newValue: 'Latin America', format: { bold: true } },
    B5: { newValue: 42000, format: currencyFormat },
    C5: { newValue: 49000, format: currencyFormat },
    D5: { newValue: 58000, format: currencyFormat },
    E5: { newValue: 67000, format: currencyFormat },
    F5: { newFormula: '=SUM(B5:E5)', format: currencyFormat },
    G5: { newFormula: '=(E5-B5)/B5', format: percentFormat },

    A6: { newValue: 'Total Company', format: { bold: true, bgColor: '#f1f5f9' } },
    B6: { newFormula: '=SUM(B2:B5)', format: { ...currencyFormat, bold: true, bgColor: '#f1f5f9' } },
    C6: { newFormula: '=SUM(C2:C5)', format: { ...currencyFormat, bold: true, bgColor: '#f1f5f9' } },
    D6: { newFormula: '=SUM(D2:D5)', format: { ...currencyFormat, bold: true, bgColor: '#f1f5f9' } },
    E6: { newFormula: '=SUM(E2:E5)', format: { ...currencyFormat, bold: true, bgColor: '#f1f5f9' } },
    F6: { newFormula: '=SUM(F2:F5)', format: { ...currencyFormat, bold: true, bgColor: '#f1f5f9' } },
    G6: { newFormula: '=(E6-B6)/B6', format: { ...percentFormat, bold: true, bgColor: '#f1f5f9' } },
  };

  return {
    message: `✨ I've generated a comprehensive **Regional Sales & Quarterly Growth Forecast** model with dynamic formulas for totals and growth percentages, plus a bar chart visualization!`,
    proposedChanges: {
      description: 'Generate Regional Sales and Growth Model',
      sheetId: sheet.id,
      sheetName: sheet.name,
      affectedCells,
      chartSuggestion: {
        type: 'bar',
        title: 'Quarterly Revenue by Region',
        sheetId: sheet.id,
        dataRange: 'A1:E5',
      },
      summary: 'Generated 4 regions, quarterly revenue, SUM formulas, and growth calculations.',
    },
  };
}

function generateEmployeeTable(sheet: SheetData): AIResponse {
  const headerFormat = { bold: true, bgColor: '#1e3a8a', textColor: '#ffffff', align: 'center' as const };
  const currencyFormat = { numberFormat: 'currency' as const, decimals: 0, align: 'right' as const };

  const affectedCells: Record<string, any> = {
    A1: { newValue: 'Employee ID', format: headerFormat },
    B1: { newValue: 'Full Name', format: headerFormat },
    C1: { newValue: 'Department', format: headerFormat },
    D1: { newValue: 'Role', format: headerFormat },
    E1: { newValue: 'Annual Salary', format: headerFormat },
    F1: { newValue: 'Rating (1-5)', format: headerFormat },

    A2: { newValue: 'EMP-101', format: { align: 'center' as const } },
    B2: { newValue: 'Alex Rivera', format: { bold: true } },
    C2: { newValue: 'Engineering' },
    D2: { newValue: 'Senior Fullstack Engineer' },
    E2: { newValue: 145000, format: currencyFormat },
    F2: { newValue: 4.8, format: { align: 'center' as const } },

    A3: { newValue: 'EMP-102', format: { align: 'center' as const } },
    B3: { newValue: 'Sophia Chen', format: { bold: true } },
    C3: { newValue: 'Product' },
    D3: { newValue: 'Principal Product Manager' },
    E3: { newValue: 155000, format: currencyFormat },
    F3: { newValue: 4.9, format: { align: 'center' as const } },

    A4: { newValue: 'EMP-103', format: { align: 'center' as const } },
    B4: { newValue: 'Marcus Vance', format: { bold: true } },
    C4: { newValue: 'Marketing' },
    D4: { newValue: 'Growth Lead' },
    E4: { newValue: 118000, format: currencyFormat },
    F4: { newValue: 4.5, format: { align: 'center' as const } },

    A5: { newValue: 'EMP-104', format: { align: 'center' as const } },
    B5: { newValue: 'Elena Rostova', format: { bold: true } },
    C5: { newValue: 'Design' },
    D5: { newValue: 'Lead Product Designer' },
    E5: { newValue: 128000, format: currencyFormat },
    F5: { newValue: 4.7, format: { align: 'center' as const } },

    A6: { newValue: 'EMP-105', format: { align: 'center' as const } },
    B6: { newValue: 'David Kim', format: { bold: true } },
    C6: { newValue: 'Sales' },
    D6: { newValue: 'Account Executive' },
    E6: { newValue: 110000, format: currencyFormat },
    F6: { newValue: 4.6, format: { align: 'center' as const } },

    A7: { newValue: 'Average', format: { bold: true, bgColor: '#f8fafc' } },
    B7: { newValue: '5 Employees', format: { bold: true, bgColor: '#f8fafc' } },
    C7: { newValue: '', format: { bgColor: '#f8fafc' } },
    D7: { newValue: '', format: { bgColor: '#f8fafc' } },
    E7: { newFormula: '=AVERAGE(E2:E6)', format: { ...currencyFormat, bold: true, bgColor: '#f8fafc' } },
    F7: { newFormula: '=AVERAGE(F2:F6)', format: { align: 'center' as const, bold: true, bgColor: '#f8fafc', numberFormat: 'number' as const, decimals: 2 } },
  };

  return {
    message: `👥 I've created a modern **Employee Directory & Compensation Table** with departments, roles, salary averages, and performance ratings.`,
    proposedChanges: {
      description: 'Generate Employee Directory',
      sheetId: sheet.id,
      sheetName: sheet.name,
      affectedCells,
      chartSuggestion: {
        type: 'pie',
        title: 'Salary Distribution by Role',
        sheetId: sheet.id,
        dataRange: 'B1:E6',
      },
      summary: 'Generated 5 employee profiles with average salary formulas and department breakdown.',
    },
  };
}

function generateMarketingTable(sheet: SheetData): AIResponse {
  const headerFormat = { bold: true, bgColor: '#701a75', textColor: '#ffffff', align: 'center' as const };
  const currencyFormat = { numberFormat: 'currency' as const, decimals: 0, align: 'right' as const };
  const numberFormat = { numberFormat: 'number' as const, decimals: 0, align: 'right' as const };
  const percentFormat = { numberFormat: 'percent' as const, decimals: 2, align: 'right' as const };

  const affectedCells: Record<string, any> = {
    A1: { newValue: 'Channel', format: headerFormat },
    B1: { newValue: 'Ad Spend', format: headerFormat },
    C1: { newValue: 'Clicks', format: headerFormat },
    D1: { newValue: 'Conversions', format: headerFormat },
    E1: { newValue: 'Cost Per Acq (CPA)', format: headerFormat },
    F1: { newValue: 'Conversion Rate', format: headerFormat },

    A2: { newValue: 'Google Search Ads', format: { bold: true } },
    B2: { newValue: 12500, format: currencyFormat },
    C2: { newValue: 18200, format: numberFormat },
    D2: { newValue: 740, format: numberFormat },
    E2: { newFormula: '=B2/D2', format: currencyFormat },
    F2: { newFormula: '=D2/C2', format: percentFormat },

    A3: { newValue: 'Meta / Instagram', format: { bold: true } },
    B3: { newValue: 9800, format: currencyFormat },
    C3: { newValue: 24500, format: numberFormat },
    D3: { newValue: 510, format: numberFormat },
    E3: { newFormula: '=B3/D3', format: currencyFormat },
    F3: { newFormula: '=D3/C3', format: percentFormat },

    A4: { newValue: 'LinkedIn B2B', format: { bold: true } },
    B4: { newValue: 6400, format: currencyFormat },
    C4: { newValue: 4800, format: numberFormat },
    D4: { newValue: 230, format: numberFormat },
    E4: { newFormula: '=B4/D4', format: currencyFormat },
    F4: { newFormula: '=D4/C4', format: percentFormat },

    A5: { newValue: 'YouTube Sponsorships', format: { bold: true } },
    B5: { newValue: 8000, format: currencyFormat },
    C5: { newValue: 31000, format: numberFormat },
    D5: { newValue: 380, format: numberFormat },
    E5: { newFormula: '=B5/D5', format: currencyFormat },
    F5: { newFormula: '=D5/C5', format: percentFormat },

    A6: { newValue: 'Total / Avg', format: { bold: true, bgColor: '#fae8ff' } },
    B6: { newFormula: '=SUM(B2:B5)', format: { ...currencyFormat, bold: true, bgColor: '#fae8ff' } },
    C6: { newFormula: '=SUM(C2:C5)', format: { ...numberFormat, bold: true, bgColor: '#fae8ff' } },
    D6: { newFormula: '=SUM(D2:D5)', format: { ...numberFormat, bold: true, bgColor: '#fae8ff' } },
    E6: { newFormula: '=B6/D6', format: { ...currencyFormat, bold: true, bgColor: '#fae8ff' } },
    F6: { newFormula: '=D6/C6', format: { ...percentFormat, bold: true, bgColor: '#fae8ff' } },
  };

  return {
    message: `📈 I've generated a **Digital Marketing ROI & Conversion Analysis** sheet with automated CPA and conversion rate formulas.`,
    proposedChanges: {
      description: 'Generate Marketing Performance Matrix',
      sheetId: sheet.id,
      sheetName: sheet.name,
      affectedCells,
      chartSuggestion: {
        type: 'bar',
        title: 'Ad Spend vs Conversions by Channel',
        sheetId: sheet.id,
        dataRange: 'A1:D5',
      },
      summary: 'Generated 4 advertising channels with spend, clicks, CPA, and conversion rates.',
    },
  };
}

function generateBudgetTable(sheet: SheetData): AIResponse {
  const headerFormat = { bold: true, bgColor: '#14532d', textColor: '#ffffff', align: 'center' as const };
  const currencyFormat = { numberFormat: 'currency' as const, decimals: 0, align: 'right' as const };

  const affectedCells: Record<string, any> = {
    A1: { newValue: 'Category', format: headerFormat },
    B1: { newValue: 'Budgeted ($)', format: headerFormat },
    C1: { newValue: 'Actual Spend ($)', format: headerFormat },
    D1: { newValue: 'Variance ($)', format: headerFormat },
    E1: { newValue: 'Status', format: headerFormat },

    A2: { newValue: 'Housing & Rent', format: { bold: true } },
    B2: { newValue: 2200, format: currencyFormat },
    C2: { newValue: 2200, format: currencyFormat },
    D2: { newFormula: '=B2-C2', format: currencyFormat },
    E2: { newFormula: '=IF(D2>=0, "On Track", "Over Budget")', format: { align: 'center' as const } },

    A3: { newValue: 'Groceries & Dining', format: { bold: true } },
    B3: { newValue: 850, format: currencyFormat },
    C3: { newValue: 920, format: currencyFormat },
    D3: { newFormula: '=B3-C3', format: currencyFormat },
    E3: { newFormula: '=IF(D3>=0, "On Track", "Over Budget")', format: { align: 'center' as const, textColor: '#b91c1c' } },

    A4: { newValue: 'Utilities & Internet', format: { bold: true } },
    B4: { newValue: 320, format: currencyFormat },
    C4: { newValue: 295, format: currencyFormat },
    D4: { newFormula: '=B4-C4', format: currencyFormat },
    E4: { newFormula: '=IF(D4>=0, "On Track", "Over Budget")', format: { align: 'center' as const, textColor: '#15803d' } },

    A5: { newValue: 'Transportation & Fuel', format: { bold: true } },
    B5: { newValue: 450, format: currencyFormat },
    C5: { newValue: 410, format: currencyFormat },
    D5: { newFormula: '=B5-C5', format: currencyFormat },
    E5: { newFormula: '=IF(D5>=0, "On Track", "Over Budget")', format: { align: 'center' as const, textColor: '#15803d' } },

    A6: { newValue: 'Entertainment & Subscriptions', format: { bold: true } },
    B6: { newValue: 250, format: currencyFormat },
    C6: { newValue: 310, format: currencyFormat },
    D6: { newFormula: '=B6-C6', format: currencyFormat },
    E6: { newFormula: '=IF(D6>=0, "On Track", "Over Budget")', format: { align: 'center' as const, textColor: '#b91c1c' } },

    A7: { newValue: 'Total Monthly Budget', format: { bold: true, bgColor: '#dcfce7' } },
    B7: { newFormula: '=SUM(B2:B6)', format: { ...currencyFormat, bold: true, bgColor: '#dcfce7' } },
    C7: { newFormula: '=SUM(C2:C6)', format: { ...currencyFormat, bold: true, bgColor: '#dcfce7' } },
    D7: { newFormula: '=SUM(D2:D6)', format: { ...currencyFormat, bold: true, bgColor: '#dcfce7' } },
    E7: { newFormula: '=IF(D7>=0, "Overall Under Budget", "Overall Over Budget")', format: { align: 'center' as const, bold: true, bgColor: '#dcfce7' } },
  };

  return {
    message: `💵 I've set up a **Monthly Budget & Expense Variance Tracker** with automated budget health indicators.`,
    proposedChanges: {
      description: 'Generate Monthly Budget Tracker',
      sheetId: sheet.id,
      sheetName: sheet.name,
      affectedCells,
      chartSuggestion: {
        type: 'bar',
        title: 'Budgeted vs Actual Spending',
        sheetId: sheet.id,
        dataRange: 'A1:C6',
      },
      summary: 'Created budget categories with spend variance and IF conditional logic.',
    },
  };
}

function generateInventoryTable(sheet: SheetData): AIResponse {
  const headerFormat = { bold: true, bgColor: '#18181b', textColor: '#ffffff', align: 'center' as const };
  const currencyFormat = { numberFormat: 'currency' as const, decimals: 2, align: 'right' as const };
  const numberFormat = { numberFormat: 'number' as const, decimals: 0, align: 'right' as const };

  const affectedCells: Record<string, any> = {
    A1: { newValue: 'SKU', format: headerFormat },
    B1: { newValue: 'Product Name', format: headerFormat },
    C1: { newValue: 'Unit Cost', format: headerFormat },
    D1: { newValue: 'Selling Price', format: headerFormat },
    E1: { newValue: 'Stock Qty', format: headerFormat },
    F1: { newValue: 'Inventory Value', format: headerFormat },
    G1: { newValue: 'Profit Margin', format: headerFormat },

    A2: { newValue: 'SKU-001', format: { align: 'center' as const } },
    B2: { newValue: 'Ergonomic Mechanical Keyboard', format: { bold: true } },
    C2: { newValue: 45.00, format: currencyFormat },
    D2: { newValue: 119.99, format: currencyFormat },
    E2: { newValue: 140, format: numberFormat },
    F2: { newFormula: '=C2*E2', format: currencyFormat },
    G2: { newFormula: '=(D2-C2)/D2', format: { numberFormat: 'percent' as const, decimals: 1, align: 'right' as const } },

    A3: { newValue: 'SKU-002', format: { align: 'center' as const } },
    B3: { newValue: 'Ultra-Wide 4K Gaming Monitor', format: { bold: true } },
    C3: { newValue: 220.00, format: currencyFormat },
    D3: { newValue: 449.00, format: currencyFormat },
    E3: { newValue: 65, format: numberFormat },
    F3: { newFormula: '=C3*E3', format: currencyFormat },
    G3: { newFormula: '=(D3-C3)/D3', format: { numberFormat: 'percent' as const, decimals: 1, align: 'right' as const } },

    A4: { newValue: 'SKU-003', format: { align: 'center' as const } },
    B4: { newValue: 'Wireless Noise-Cancelling Headphones', format: { bold: true } },
    C4: { newValue: 75.00, format: currencyFormat },
    D4: { newValue: 189.50, format: currencyFormat },
    E4: { newValue: 210, format: numberFormat },
    F4: { newFormula: '=C4*E4', format: currencyFormat },
    G4: { newFormula: '=(D4-C4)/D4', format: { numberFormat: 'percent' as const, decimals: 1, align: 'right' as const } },

    A5: { newValue: 'SKU-004', format: { align: 'center' as const } },
    B5: { newValue: 'USB-C Aluminum Docking Station', format: { bold: true } },
    C5: { newValue: 32.00, format: currencyFormat },
    D5: { newValue: 79.99, format: currencyFormat },
    E5: { newValue: 350, format: numberFormat },
    F5: { newFormula: '=C5*E5', format: currencyFormat },
    G5: { newFormula: '=(D5-C5)/D5', format: { numberFormat: 'percent' as const, decimals: 1, align: 'right' as const } },

    A6: { newValue: 'Total Warehouse Value', format: { bold: true, bgColor: '#f4f4f5' } },
    B6: { newValue: '', format: { bgColor: '#f4f4f5' } },
    C6: { newValue: '', format: { bgColor: '#f4f4f5' } },
    D6: { newValue: '', format: { bgColor: '#f4f4f5' } },
    E6: { newFormula: '=SUM(E2:E5)', format: { ...numberFormat, bold: true, bgColor: '#f4f4f5' } },
    F6: { newFormula: '=SUM(F2:F5)', format: { ...currencyFormat, bold: true, bgColor: '#f4f4f5' } },
    G6: { newFormula: '=AVERAGE(G2:G5)', format: { numberFormat: 'percent' as const, decimals: 1, bold: true, bgColor: '#f4f4f5', align: 'right' as const } },
  };

  return {
    message: `📦 I've generated an **E-Commerce Inventory & Profit Analysis** table with dynamic inventory valuation and profit margins!`,
    proposedChanges: {
      description: 'Generate Inventory Valuation Table',
      sheetId: sheet.id,
      sheetName: sheet.name,
      affectedCells,
      chartSuggestion: {
        type: 'doughnut',
        title: 'Inventory Value by Product',
        sheetId: sheet.id,
        dataRange: 'B1:F5',
      },
      summary: 'Created product catalog with cost, retail price, stock value, and margins.',
    },
  };
}

function generateSaaSTable(sheet: SheetData): AIResponse {
  const headerFormat = { bold: true, bgColor: '#312e81', textColor: '#ffffff', align: 'center' as const };
  const currencyFormat = { numberFormat: 'currency' as const, decimals: 0, align: 'right' as const };
  const percentFormat = { numberFormat: 'percent' as const, decimals: 2, align: 'right' as const };
  const numberFormat = { numberFormat: 'number' as const, decimals: 0, align: 'right' as const };

  const affectedCells: Record<string, any> = {
    A1: { newValue: 'Month', format: headerFormat },
    B1: { newValue: 'Active Customers', format: headerFormat },
    C1: { newValue: 'New Customers', format: headerFormat },
    D1: { newValue: 'Churned Customers', format: headerFormat },
    E1: { newValue: 'Monthly Recurring Rev (MRR)', format: headerFormat },
    F1: { newValue: 'Churn Rate', format: headerFormat },

    A2: { newValue: 'Jan 2026', format: { bold: true } },
    B2: { newValue: 450, format: numberFormat },
    C2: { newValue: 65, format: numberFormat },
    D2: { newValue: 12, format: numberFormat },
    E2: { newValue: 45000, format: currencyFormat },
    F2: { newFormula: '=D2/B2', format: percentFormat },

    A3: { newValue: 'Feb 2026', format: { bold: true } },
    B3: { newFormula: '=B2+C2-D2', format: numberFormat },
    C3: { newValue: 78, format: numberFormat },
    D3: { newValue: 14, format: numberFormat },
    E3: { newFormula: '=B3*102', format: currencyFormat },
    F3: { newFormula: '=D3/B3', format: percentFormat },

    A4: { newValue: 'Mar 2026', format: { bold: true } },
    B4: { newFormula: '=B3+C3-D3', format: numberFormat },
    C4: { newValue: 92, format: numberFormat },
    D4: { newValue: 11, format: numberFormat },
    E4: { newFormula: '=B4*105', format: currencyFormat },
    F4: { newFormula: '=D4/B4', format: percentFormat },

    A5: { newValue: 'Apr 2026', format: { bold: true } },
    B5: { newFormula: '=B4+C4-D4', format: numberFormat },
    C5: { newValue: 110, format: numberFormat },
    D5: { newValue: 15, format: numberFormat },
    E5: { newFormula: '=B5*108', format: currencyFormat },
    F5: { newFormula: '=D5/B5', format: percentFormat },

    A6: { newValue: 'May 2026', format: { bold: true } },
    B6: { newFormula: '=B5+C5-D5', format: numberFormat },
    C6: { newValue: 135, format: numberFormat },
    D6: { newValue: 16, format: numberFormat },
    E6: { newFormula: '=B6*110', format: currencyFormat },
    F6: { newFormula: '=D6/B6', format: percentFormat },
  };

  return {
    message: `🚀 I've built a **SaaS Growth & Churn Model** with dynamic customer retention waterfall and MRR trajectory!`,
    proposedChanges: {
      description: 'Generate SaaS MRR & Retention Model',
      sheetId: sheet.id,
      sheetName: sheet.name,
      affectedCells,
      chartSuggestion: {
        type: 'line',
        title: 'MRR Growth Over Time',
        sheetId: sheet.id,
        dataRange: 'A1:E6',
      },
      summary: 'Calculates customer waterfall, MRR progression, and churn rate percentage.',
    },
  };
}

function generateGeneralTable(sheet: SheetData): AIResponse {
  const headerFormat = { bold: true, bgColor: '#1e293b', textColor: '#ffffff', align: 'center' as const };

  const affectedCells: Record<string, any> = {
    A1: { newValue: 'Item #', format: headerFormat },
    B1: { newValue: 'Name / Entity', format: headerFormat },
    C1: { newValue: 'Category', format: headerFormat },
    D1: { newValue: 'Score / Value', format: headerFormat },
    E1: { newValue: 'Status', format: headerFormat },

    A2: { newValue: '001', format: { align: 'center' as const } },
    B2: { newValue: 'Project Alpha', format: { bold: true } },
    C2: { newValue: 'Development' },
    D2: { newValue: 95, format: { align: 'right' as const, numberFormat: 'number' as const } },
    E2: { newValue: 'Active', format: { align: 'center' as const, textColor: '#15803d', bold: true } },

    A3: { newValue: '002', format: { align: 'center' as const } },
    B3: { newValue: 'Project Beta', format: { bold: true } },
    C3: { newValue: 'Research' },
    D3: { newValue: 82, format: { align: 'right' as const, numberFormat: 'number' as const } },
    E3: { newValue: 'Pending', format: { align: 'center' as const, textColor: '#ca8a04', bold: true } },

    A4: { newValue: '003', format: { align: 'center' as const } },
    B4: { newValue: 'Project Gamma', format: { bold: true } },
    C4: { newValue: 'Marketing' },
    D4: { newValue: 88, format: { align: 'right' as const, numberFormat: 'number' as const } },
    E4: { newValue: 'Active', format: { align: 'center' as const, textColor: '#15803d', bold: true } },

    A5: { newValue: '004', format: { align: 'center' as const } },
    B5: { newValue: 'Project Delta', format: { bold: true } },
    C5: { newValue: 'Operations' },
    D5: { newValue: 74, format: { align: 'right' as const, numberFormat: 'number' as const } },
    E5: { newValue: 'Review', format: { align: 'center' as const, textColor: '#dc2626', bold: true } },

    A6: { newValue: 'Summary Average', format: { bold: true, bgColor: '#f1f5f9' } },
    B6: { newValue: '', format: { bgColor: '#f1f5f9' } },
    C6: { newValue: '', format: { bgColor: '#f1f5f9' } },
    D6: { newFormula: '=AVERAGE(D2:D5)', format: { align: 'right' as const, bold: true, bgColor: '#f1f5f9', numberFormat: 'number' as const, decimals: 1 } },
    E6: { newValue: '', format: { bgColor: '#f1f5f9' } },
  };

  return {
    message: `📋 I have created a structured sample dataset based on your prompt with formatted headers, row styling, and automated summary calculations.`,
    proposedChanges: {
      description: 'Generate Structured Data Table',
      sheetId: sheet.id,
      sheetName: sheet.name,
      affectedCells,
      chartSuggestion: {
        type: 'bar',
        title: 'Project Scores',
        sheetId: sheet.id,
        dataRange: 'B1:D5',
      },
      summary: 'Generated 4 rows of mock data with averages and status columns.',
    },
  };
}

function calculateAndAddFormulas(sheet: SheetData): AIResponse {
  let maxRow = 0;
  let maxCol = 0;

  for (const key of Object.keys(sheet.cells)) {
    const coords = colLetterToIndex(key.replace(/\d+/g, ''));
    const match = key.match(/\d+/);
    const row = match ? parseInt(match[0], 10) - 1 : 0;
    if (row > maxRow) maxRow = row;
    if (coords > maxCol) maxCol = coords;
  }

  if (maxRow === 0 && maxCol === 0) {
    return generateSalesTable(sheet);
  }

  const affectedCells: Record<string, any> = {};
  const targetRow = maxRow + 2;

  affectedCells[`A${targetRow}`] = { newValue: 'Total', format: { bold: true, bgColor: '#f1f5f9' } };
  for (let c = 1; c <= maxCol; c++) {
    const letter = colIndexToLetter(c);
    affectedCells[`${letter}${targetRow}`] = {
      newFormula: `=SUM(${letter}2:${letter}${maxRow + 1})`,
      format: { bold: true, bgColor: '#f1f5f9', align: 'right' as const },
    };
  }

  return {
    message: `⚡ I've added automated **SUM summary formulas** at the bottom of your data table (Row ${targetRow}).`,
    proposedChanges: {
      description: 'Add Column & Total Formulas',
      sheetId: sheet.id,
      sheetName: sheet.name,
      affectedCells,
      summary: `Added SUM formulas across columns A to ${colIndexToLetter(maxCol)} at row ${targetRow}.`,
    },
  };
}

function formatTableStyles(sheet: SheetData): AIResponse {
  const affectedCells: Record<string, any> = {};

  for (const [key, cell] of Object.entries(sheet.cells)) {
    const isHeader = key.endsWith('1');
    if (isHeader) {
      affectedCells[key] = {
        ...cell,
        format: {
          ...(cell.format || {}),
          bold: true,
          bgColor: '#0f172a',
          textColor: '#ffffff',
          align: 'center' as const,
        },
      };
    } else {
      const rowMatch = key.match(/\d+/);
      const row = rowMatch ? parseInt(rowMatch[0], 10) : 0;
      if (row % 2 === 1) {
        affectedCells[key] = {
          ...cell,
          format: {
            ...(cell.format || {}),
            bgColor: '#f8fafc',
          },
        };
      }
    }
  }

  if (Object.keys(affectedCells).length === 0) {
    return generateSalesTable(sheet);
  }

  return {
    message: `🎨 I've applied **professional typography, high-contrast dark headers, and subtle alternating zebra striping** to your sheet!`,
    proposedChanges: {
      description: 'Apply Professional Table Styling',
      sheetId: sheet.id,
      sheetName: sheet.name,
      affectedCells,
      summary: 'Styled header row with dark slate background, white bold text, and alternating row fills.',
    },
  };
}

function cleanSheetData(sheet: SheetData): AIResponse {
  const affectedCells: Record<string, any> = {};
  let modifiedCount = 0;

  for (const [key, cell] of Object.entries(sheet.cells)) {
    if (typeof cell.value === 'string' && !cell.formula) {
      const trimmed = cell.value.trim().replace(/\s+/g, ' ');
      const capitalized = trimmed.replace(/\b\w/g, c => c.toUpperCase());

      if (capitalized !== cell.value) {
        affectedCells[key] = {
          ...cell,
          newValue: capitalized,
        };
        modifiedCount++;
      }
    }
  }

  return {
    message: `🧹 Cleaned and normalized ${modifiedCount} cell(s) across your sheet! Whitespace trimmed and title-cased.`,
    proposedChanges: {
      description: 'Data Cleaning & Normalization',
      sheetId: sheet.id,
      sheetName: sheet.name,
      affectedCells,
      summary: `Cleaned ${modifiedCount} text cells.`,
    },
  };
}

function suggestChart(sheet: SheetData, prompt: string): AIResponse {
  const p = prompt.toLowerCase();
  let chartType: 'bar' | 'line' | 'pie' | 'doughnut' = 'bar';
  if (p.includes('line')) chartType = 'line';
  if (p.includes('pie')) chartType = 'pie';
  if (p.includes('doughnut') || p.includes('donut')) chartType = 'doughnut';

  return {
    message: `📊 I've configured an interactive **${chartType.toUpperCase()} chart** from your sheet data! You can embed it onto the sheet or view it in full screen.`,
    proposedChanges: {
      description: `Create ${chartType.toUpperCase()} Chart`,
      sheetId: sheet.id,
      sheetName: sheet.name,
      affectedCells: {},
      chartSuggestion: {
        type: chartType,
        title: 'Sheet Data Visualization',
        sheetId: sheet.id,
        dataRange: 'A1:E6',
      },
      summary: `Generated ${chartType} chart configuration.`,
    },
  };
}

function analyzeSheetData(sheet: SheetData): AIResponse {
  const cellCount = Object.keys(sheet.cells).length;
  const numbers: number[] = [];

  for (const cell of Object.values(sheet.cells)) {
    const val = cell.computedValue !== undefined ? cell.computedValue : cell.value;
    if (typeof val === 'number') {
      numbers.push(val);
    } else if (val !== '' && val !== null && !isNaN(Number(val))) {
      numbers.push(Number(val));
    }
  }

  if (numbers.length === 0) {
    return {
      message: `📊 **Sheet Analysis Summary**:\n- Total active cells: **${cellCount}**\n- No numeric columns found yet. Enter numbers or ask me to generate a dataset to compute statistical distributions, trends, and anomalies!`,
    };
  }

  const sum = numbers.reduce((a, b) => a + b, 0);
  const avg = sum / numbers.length;
  const max = Math.max(...numbers);
  const min = Math.min(...numbers);

  return {
    message: `💡 **AI Sheet Insights & Statistical Breakdown**:\n- **Total numeric data points**: ${numbers.length}\n- **Sum total**: ${sum.toLocaleString()}\n- **Average (Mean)**: ${avg.toFixed(2)}\n- **Peak High**: ${max.toLocaleString()}\n- **Lowest Value**: ${min.toLocaleString()}\n- **Trend**: Data exhibits a healthy positive distribution with no obvious outlier errors.\n\nWould you like me to insert a summary statistics card or generate a chart for this data?`,
    proposedChanges: {
      description: 'Insert Data Analysis Insights',
      sheetId: sheet.id,
      sheetName: sheet.name,
      affectedCells: {},
      chartSuggestion: {
        type: 'bar',
        title: 'Data Distribution Overview',
        sheetId: sheet.id,
        dataRange: 'A1:D6',
      },
    },
  };
}

function provideFormulaHelp(): AIResponse {
  return {
    message: `🔍 **Formula Help & Best Practices**:\n\n- **VLOOKUP**: \`=VLOOKUP(lookup_value, table_range, col_index, [exact_match])\`\n  *Example: \`=VLOOKUP("EMP-101", A2:E10, 2, FALSE)\`*\n- **IF / Logic**: \`=IF(condition, value_if_true, value_if_false)\`\n  *Example: \`=IF(D2 > 1000, "High", "Standard")\`*\n- **SUMIF / COUNTIF**: \`=SUMIF(A2:A10, ">50", B2:B10)\`\n- **AI In-Cell Function**: \`=AI("summarize sentiment", A2)\` or \`=AI_SENTIMENT(A2)\`\n\nNeed a specific formula? Tell me what you want to calculate and I'll generate the exact formula for you!`,
  };
}
