import { SheetData, Workbook } from '../types/spreadsheet';
import { recalculateSheet } from './dependencyGraph';

export interface TemplateDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  generateSheet: () => SheetData;
}

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: 'saas-financial-model',
    name: 'SaaS Financial & MRR Model',
    category: 'Finance',
    description: 'Track Monthly Recurring Revenue (MRR), subscriber growth, churn rate, and annual ARR run-rate.',
    icon: 'TrendingUp',
    generateSheet: () => {
      const sheet: SheetData = {
        id: `template-saas-${Date.now()}`,
        name: 'SaaS Model',
        rowCount: 50,
        colCount: 26,
        cells: {
          A1: { value: 'Month', format: { bold: true, bgColor: '#1e1b4b', textColor: '#ffffff', align: 'center' } },
          B1: { value: 'Starting Customers', format: { bold: true, bgColor: '#1e1b4b', textColor: '#ffffff', align: 'center' } },
          C1: { value: 'New Adds', format: { bold: true, bgColor: '#1e1b4b', textColor: '#ffffff', align: 'center' } },
          D1: { value: 'Churned', format: { bold: true, bgColor: '#1e1b4b', textColor: '#ffffff', align: 'center' } },
          E1: { value: 'Ending Customers', format: { bold: true, bgColor: '#1e1b4b', textColor: '#ffffff', align: 'center' } },
          F1: { value: 'ARPU ($)', format: { bold: true, bgColor: '#1e1b4b', textColor: '#ffffff', align: 'center' } },
          G1: { value: 'MRR ($)', format: { bold: true, bgColor: '#1e1b4b', textColor: '#ffffff', align: 'center' } },
          H1: { value: 'ARR Run-Rate ($)', format: { bold: true, bgColor: '#1e1b4b', textColor: '#ffffff', align: 'center' } },
          I1: { value: 'Churn Rate', format: { bold: true, bgColor: '#1e1b4b', textColor: '#ffffff', align: 'center' } },

          A2: { value: 'Jan 2026', format: { bold: true } },
          B2: { value: 500, format: { numberFormat: 'number', decimals: 0 } },
          C2: { value: 85, format: { numberFormat: 'number', decimals: 0 } },
          D2: { value: 15, format: { numberFormat: 'number', decimals: 0 } },
          E2: { value: '', formula: '=B2+C2-D2', format: { numberFormat: 'number', decimals: 0 } },
          F2: { value: 120, format: { numberFormat: 'currency', decimals: 0 } },
          G2: { value: '', formula: '=E2*F2', format: { numberFormat: 'currency', decimals: 0 } },
          H2: { value: '', formula: '=G2*12', format: { numberFormat: 'currency', decimals: 0 } },
          I2: { value: '', formula: '=D2/B2', format: { numberFormat: 'percent', decimals: 1 } },

          A3: { value: 'Feb 2026', format: { bold: true } },
          B3: { value: '', formula: '=E2', format: { numberFormat: 'number', decimals: 0 } },
          C3: { value: 95, format: { numberFormat: 'number', decimals: 0 } },
          D3: { value: 18, format: { numberFormat: 'number', decimals: 0 } },
          E3: { value: '', formula: '=B3+C3-D3', format: { numberFormat: 'number', decimals: 0 } },
          F3: { value: 125, format: { numberFormat: 'currency', decimals: 0 } },
          G3: { value: '', formula: '=E3*F3', format: { numberFormat: 'currency', decimals: 0 } },
          H3: { value: '', formula: '=G3*12', format: { numberFormat: 'currency', decimals: 0 } },
          I3: { value: '', formula: '=D3/B3', format: { numberFormat: 'percent', decimals: 1 } },

          A4: { value: 'Mar 2026', format: { bold: true } },
          B4: { value: '', formula: '=E3', format: { numberFormat: 'number', decimals: 0 } },
          C4: { value: 110, format: { numberFormat: 'number', decimals: 0 } },
          D4: { value: 16, format: { numberFormat: 'number', decimals: 0 } },
          E4: { value: '', formula: '=B4+C4-D4', format: { numberFormat: 'number', decimals: 0 } },
          F4: { value: 128, format: { numberFormat: 'currency', decimals: 0 } },
          G4: { value: '', formula: '=E4*F4', format: { numberFormat: 'currency', decimals: 0 } },
          H4: { value: '', formula: '=G4*12', format: { numberFormat: 'currency', decimals: 0 } },
          I4: { value: '', formula: '=D4/B4', format: { numberFormat: 'percent', decimals: 1 } },

          A5: { value: 'Apr 2026', format: { bold: true } },
          B5: { value: '', formula: '=E4', format: { numberFormat: 'number', decimals: 0 } },
          C5: { value: 130, format: { numberFormat: 'number', decimals: 0 } },
          D5: { value: 20, format: { numberFormat: 'number', decimals: 0 } },
          E5: { value: '', formula: '=B5+C5-D5', format: { numberFormat: 'number', decimals: 0 } },
          F5: { value: 130, format: { numberFormat: 'currency', decimals: 0 } },
          G5: { value: '', formula: '=E5*F5', format: { numberFormat: 'currency', decimals: 0 } },
          H5: { value: '', formula: '=G5*12', format: { numberFormat: 'currency', decimals: 0 } },
          I5: { value: '', formula: '=D5/B5', format: { numberFormat: 'percent', decimals: 1 } },

          A6: { value: 'Q1+Q2 Total / Avg', format: { bold: true, bgColor: '#e0e7ff' } },
          B6: { value: '', format: { bgColor: '#e0e7ff' } },
          C6: { value: '', formula: '=SUM(C2:C5)', format: { bold: true, bgColor: '#e0e7ff', numberFormat: 'number' } },
          D6: { value: '', formula: '=SUM(D2:D5)', format: { bold: true, bgColor: '#e0e7ff', numberFormat: 'number' } },
          E6: { value: '', formula: '=E5', format: { bold: true, bgColor: '#e0e7ff', numberFormat: 'number' } },
          F6: { value: '', formula: '=AVERAGE(F2:F5)', format: { bold: true, bgColor: '#e0e7ff', numberFormat: 'currency' } },
          G6: { value: '', formula: '=AVERAGE(G2:G5)', format: { bold: true, bgColor: '#e0e7ff', numberFormat: 'currency' } },
          H6: { value: '', formula: '=G6*12', format: { bold: true, bgColor: '#e0e7ff', numberFormat: 'currency' } },
          I6: { value: '', formula: '=AVERAGE(I2:I5)', format: { bold: true, bgColor: '#e0e7ff', numberFormat: 'percent', decimals: 1 } },
        },
      };
      return recalculateSheet(sheet);
    },
  },
  {
    id: 'budget-planner',
    name: 'Personal Budget & Expense Tracker',
    category: 'Personal Finance',
    description: 'Manage monthly income, planned budget categories, actual expenses, and automated variance tracking.',
    icon: 'DollarSign',
    generateSheet: () => {
      const sheet: SheetData = {
        id: `template-budget-${Date.now()}`,
        name: 'Monthly Budget',
        rowCount: 50,
        colCount: 26,
        cells: {
          A1: { value: 'Category', format: { bold: true, bgColor: '#064e3b', textColor: '#ffffff', align: 'center' } },
          B1: { value: 'Planned ($)', format: { bold: true, bgColor: '#064e3b', textColor: '#ffffff', align: 'center' } },
          C1: { value: 'Actual ($)', format: { bold: true, bgColor: '#064e3b', textColor: '#ffffff', align: 'center' } },
          D1: { value: 'Variance ($)', format: { bold: true, bgColor: '#064e3b', textColor: '#ffffff', align: 'center' } },
          E1: { value: 'Health Status', format: { bold: true, bgColor: '#064e3b', textColor: '#ffffff', align: 'center' } },

          A2: { value: 'Rent / Mortgage', format: { bold: true } },
          B2: { value: 2400, format: { numberFormat: 'currency', decimals: 0 } },
          C2: { value: 2400, format: { numberFormat: 'currency', decimals: 0 } },
          D2: { value: '', formula: '=B2-C2', format: { numberFormat: 'currency', decimals: 0 } },
          E2: { value: '', formula: '=IF(D2>=0, "OK", "OVER")', format: { align: 'center', bold: true } },

          A3: { value: 'Food & Groceries', format: { bold: true } },
          B3: { value: 900, format: { numberFormat: 'currency', decimals: 0 } },
          C3: { value: 980, format: { numberFormat: 'currency', decimals: 0 } },
          D3: { value: '', formula: '=B3-C3', format: { numberFormat: 'currency', decimals: 0 } },
          E3: { value: '', formula: '=IF(D3>=0, "OK", "OVER")', format: { align: 'center', bold: true, textColor: '#dc2626' } },

          A4: { value: 'Utilities & WiFi', format: { bold: true } },
          B4: { value: 350, format: { numberFormat: 'currency', decimals: 0 } },
          C4: { value: 310, format: { numberFormat: 'currency', decimals: 0 } },
          D4: { value: '', formula: '=B4-C4', format: { numberFormat: 'currency', decimals: 0 } },
          E4: { value: '', formula: '=IF(D4>=0, "OK", "OVER")', format: { align: 'center', bold: true, textColor: '#16a34a' } },

          A5: { value: 'Transit & Gas', format: { bold: true } },
          B5: { value: 400, format: { numberFormat: 'currency', decimals: 0 } },
          C5: { value: 380, format: { numberFormat: 'currency', decimals: 0 } },
          D5: { value: '', formula: '=B5-C5', format: { numberFormat: 'currency', decimals: 0 } },
          E5: { value: '', formula: '=IF(D5>=0, "OK", "OVER")', format: { align: 'center', bold: true, textColor: '#16a34a' } },

          A6: { value: 'Entertainment & Subscriptions', format: { bold: true } },
          B6: { value: 300, format: { numberFormat: 'currency', decimals: 0 } },
          C6: { value: 420, format: { numberFormat: 'currency', decimals: 0 } },
          D6: { value: '', formula: '=B6-C6', format: { numberFormat: 'currency', decimals: 0 } },
          E6: { value: '', formula: '=IF(D6>=0, "OK", "OVER")', format: { align: 'center', bold: true, textColor: '#dc2626' } },

          A7: { value: 'Total Net Budget', format: { bold: true, bgColor: '#d1fae5' } },
          B7: { value: '', formula: '=SUM(B2:B6)', format: { bold: true, bgColor: '#d1fae5', numberFormat: 'currency' } },
          C7: { value: '', formula: '=SUM(C2:C6)', format: { bold: true, bgColor: '#d1fae5', numberFormat: 'currency' } },
          D7: { value: '', formula: '=SUM(D2:D6)', format: { bold: true, bgColor: '#d1fae5', numberFormat: 'currency' } },
          E7: { value: '', formula: '=IF(D7>=0, "Under Budget", "Over Budget")', format: { align: 'center', bold: true, bgColor: '#d1fae5' } },
        },
      };
      return recalculateSheet(sheet);
    },
  },
  {
    id: 'project-tracker',
    name: 'Project & Sprint Task Tracker',
    category: 'Productivity',
    description: 'Assign tasks, set priorities, track completion statuses, estimated vs actual hours.',
    icon: 'CheckSquare',
    generateSheet: () => {
      const sheet: SheetData = {
        id: `template-tasks-${Date.now()}`,
        name: 'Sprint Tracker',
        rowCount: 50,
        colCount: 26,
        cells: {
          A1: { value: 'Task ID', format: { bold: true, bgColor: '#1e293b', textColor: '#ffffff', align: 'center' } },
          B1: { value: 'Task Name', format: { bold: true, bgColor: '#1e293b', textColor: '#ffffff', align: 'center' } },
          C1: { value: 'Owner', format: { bold: true, bgColor: '#1e293b', textColor: '#ffffff', align: 'center' } },
          D1: { value: 'Priority', format: { bold: true, bgColor: '#1e293b', textColor: '#ffffff', align: 'center' } },
          E1: { value: 'Status', format: { bold: true, bgColor: '#1e293b', textColor: '#ffffff', align: 'center' } },
          F1: { value: 'Est Hours', format: { bold: true, bgColor: '#1e293b', textColor: '#ffffff', align: 'center' } },
          G1: { value: 'Actual Hours', format: { bold: true, bgColor: '#1e293b', textColor: '#ffffff', align: 'center' } },
          H1: { value: 'Hours Variance', format: { bold: true, bgColor: '#1e293b', textColor: '#ffffff', align: 'center' } },

          A2: { value: 'TASK-101', format: { align: 'center' } },
          B2: { value: 'Implement Formula Dependency DAG', format: { bold: true } },
          C2: { value: 'Alex R.' },
          D2: { value: 'P0 - Urgent', format: { textColor: '#dc2626', bold: true } },
          E2: { value: 'Completed', format: { textColor: '#16a34a', bold: true, align: 'center' } },
          F2: { value: 16, format: { numberFormat: 'number', decimals: 0 } },
          G2: { value: 14, format: { numberFormat: 'number', decimals: 0 } },
          H2: { value: '', formula: '=F2-G2', format: { numberFormat: 'number', decimals: 0, align: 'right' } },

          A3: { value: 'TASK-102', format: { align: 'center' } },
          B3: { value: 'Build AI Sheet Copilot Engine', format: { bold: true } },
          C3: { value: 'Sophia C.' },
          D3: { value: 'P0 - Urgent', format: { textColor: '#dc2626', bold: true } },
          E3: { value: 'In Progress', format: { textColor: '#ca8a04', bold: true, align: 'center' } },
          F3: { value: 20, format: { numberFormat: 'number', decimals: 0 } },
          G3: { value: 12, format: { numberFormat: 'number', decimals: 0 } },
          H3: { value: '', formula: '=F3-G3', format: { numberFormat: 'number', decimals: 0, align: 'right' } },

          A4: { value: 'TASK-103', format: { align: 'center' } },
          B4: { value: 'Add Multi-format Export (XLSX, CSV)', format: { bold: true } },
          C4: { value: 'Marcus V.' },
          D4: { value: 'P1 - High', format: { textColor: '#ea580c', bold: true } },
          E4: { value: 'Completed', format: { textColor: '#16a34a', bold: true, align: 'center' } },
          F4: { value: 8, format: { numberFormat: 'number', decimals: 0 } },
          G4: { value: 8, format: { numberFormat: 'number', decimals: 0 } },
          H4: { value: '', formula: '=F4-G4', format: { numberFormat: 'number', decimals: 0, align: 'right' } },

          A5: { value: 'Sprint Total Hours', format: { bold: true, bgColor: '#f1f5f9' } },
          B5: { value: '', format: { bgColor: '#f1f5f9' } },
          C5: { value: '', format: { bgColor: '#f1f5f9' } },
          D5: { value: '', format: { bgColor: '#f1f5f9' } },
          E5: { value: '', format: { bgColor: '#f1f5f9' } },
          F5: { value: '', formula: '=SUM(F2:F4)', format: { bold: true, bgColor: '#f1f5f9', numberFormat: 'number' } },
          G5: { value: '', formula: '=SUM(G2:G4)', format: { bold: true, bgColor: '#f1f5f9', numberFormat: 'number' } },
          H5: { value: '', formula: '=SUM(H2:H4)', format: { bold: true, bgColor: '#f1f5f9', numberFormat: 'number' } },
        },
      };
      return recalculateSheet(sheet);
    },
  },
];
