import { SheetData, CellValue, CellFormat, ChartConfig, AISettings } from '../../types/spreadsheet';
import { coordsToCellKey } from '../cellUtils';

export interface AIResponse {
  message: string;
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
}

function serializeSheet(sheet: SheetData): string {
  const gridSummary: Record<string, any> = {};
  for (let r = 0; r < Math.min(sheet.rowCount || 50, 30); r++) {
    for (let c = 0; c < Math.min(sheet.colCount || 26, 15); c++) {
      const key = coordsToCellKey(r, c);
      const cell = sheet.cells[key];
      if (cell && (cell.value !== '' || cell.formula)) {
        gridSummary[key] = {
          value: cell.value,
          formula: cell.formula,
          computed: cell.computedValue,
          format: cell.format,
        };
      }
    }
  }
  return JSON.stringify(gridSummary, null, 2);
}

const SYSTEM_PROMPT = (sheetId: string) => `You are SheetAI, an expert AI spreadsheet assistant embedded inside a Google Sheets-like web application.
Your goal is to help the user manipulate data, write formulas, clean tables, style cells, and generate charts.

When asked to modify the spreadsheet, respond in strictly valid JSON format with this structure:
{
  "message": "Conversational explanation of what you are doing",
  "proposedChanges": {
    "description": "Short summary of changes",
    "sheetId": "${sheetId}",
    "affectedCells": {
      "A1": { "newValue": "Header", "newFormula": "", "format": { "bold": true, "bgColor": "#1e293b", "textColor": "#ffffff" } },
      "B2": { "newValue": 100, "newFormula": "=SUM(A1:A10)", "format": { "numberFormat": "currency" } }
    },
    "chartSuggestion": {
      "type": "bar", // bar, line, pie, doughnut
      "title": "Sales Overview",
      "dataRange": "A1:B10",
      "sheetId": "${sheetId}"
    } // optional
  }
}
If no spreadsheet changes are needed, return:
{
  "message": "Your text answer or formula explanation here"
}`;

/**
 * Call live Google Gemini API
 */
export async function callGeminiApi(
  prompt: string,
  currentSheet: SheetData,
  apiKey: string,
  model = 'gemini-2.0-flash'
): Promise<AIResponse> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `${prompt}\n\nCurrent sheet content:\n${serializeSheet(currentSheet)}` }] }],
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT(currentSheet.id) }] },
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Empty response from Gemini API');

  try {
    return JSON.parse(rawText) as AIResponse;
  } catch {
    return { message: rawText };
  }
}

/**
 * Call OpenAI API (GPT-4o, GPT-4o-mini)
 */
export async function callOpenAIApi(
  prompt: string,
  currentSheet: SheetData,
  apiKey: string,
  model = 'gpt-4o'
): Promise<AIResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT(currentSheet.id) },
        { role: 'user', content: `${prompt}\n\nCurrent sheet content:\n${serializeSheet(currentSheet)}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content;
  if (!rawText) throw new Error('Empty response from OpenAI API');

  try {
    return JSON.parse(rawText) as AIResponse;
  } catch {
    return { message: rawText };
  }
}

/**
 * Call Anthropic Claude API
 */
export async function callClaudeApi(
  prompt: string,
  currentSheet: SheetData,
  apiKey: string,
  model = 'claude-3-7-sonnet-20250219'
): Promise<AIResponse> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'dangerously-allow-browser': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT(currentSheet.id),
      messages: [
        { role: 'user', content: `${prompt}\n\nCurrent sheet content:\n${serializeSheet(currentSheet)}` },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawText = data.content?.[0]?.text;
  if (!rawText) throw new Error('Empty response from Claude API');

  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]) as AIResponse;
    return { message: rawText };
  } catch {
    return { message: rawText };
  }
}

/**
 * Call Local Ollama API (e.g. llama3, mistral)
 */
export async function callOllamaApi(
  prompt: string,
  currentSheet: SheetData,
  ollamaUrl = 'http://localhost:11434',
  model = 'llama3'
): Promise<AIResponse> {
  const response = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      system: SYSTEM_PROMPT(currentSheet.id),
      prompt: `${prompt}\n\nCurrent sheet content:\n${serializeSheet(currentSheet)}`,
      format: 'json',
      stream: false,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Ollama Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawText = data.response;
  try {
    return JSON.parse(rawText) as AIResponse;
  } catch {
    return { message: rawText };
  }
}
