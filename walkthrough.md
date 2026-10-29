# AI Sheets - Web Application Walkthrough

We have built a full-featured, Google Sheets web application with an integrated **AI Assistant ("SheetAI / Gemini Copilot")**.

---

## 🚀 Live Application
- **Local URL**: [http://localhost:5173/](http://localhost:5173/)
- **Directory**: `/Users/shreyashsutane/Desktop/ai-sheets`

---

## 🌟 Key Features & Capabilities

### 1. Spreadsheet Core & Formula Engine
- **Formula Engine (40+ Functions)**:
  - **Math & Stats**: `SUM`, `AVERAGE`, `COUNT`, `COUNTA`, `COUNTBLANK`, `MIN`, `MAX`, `PRODUCT`, `MEDIAN`, `ROUND`, `ROUNDUP`, `ROUNDDOWN`, `ABS`, `SQRT`, `POWER`, `MOD`, `INT`, `RAND`, `RANDBETWEEN`.
  - **Logic & Conditionals**: `IF`, `IFS`, `AND`, `OR`, `NOT`, `IFERROR`, `IFNA`, `ISBLANK`, `ISNUMBER`, `ISTEXT`, `COUNTIF`, `SUMIF`, `AVERAGEIF`.
  - **Lookup & References**: `VLOOKUP`, `HLOOKUP`, `INDEX`, `MATCH`.
  - **Text**: `CONCATENATE`, `CONCAT`, `TEXTJOIN`, `LEFT`, `RIGHT`, `MID`, `LEN`, `UPPER`, `LOWER`, `PROPER`, `TRIM`, `REPLACE`, `SUBSTITUTE`, `REPT`.
  - **Date & Time**: `TODAY`, `NOW`, `DATE`, `YEAR`, `MONTH`, `DAY`.
  - **In-Cell AI Functions**: `=AI("prompt", cell)`, `=AI_SENTIMENT(cell)`, `=AI_EXTRACT(cell, "email")`, `=AI_TRANSLATE(cell, "Spanish")`, `=AI_CLASSIFY(cell, "options")`.
- **Topological Recalculation & DAG**:
  - Automatically builds cell dependency graphs.
  - Recalculates all downstream dependent cells upon editing.
  - Detects circular references with `#CYCLE!`.
- **Interactive Drag-to-Fill**:
  - Drag the bottom-right blue handle of any cell or range to auto-fill formulas with adjusted cell references (e.g. `A1+B1` -> `A2+B2`), or automatically extrapolate sequences (numbers, quarters `Q1..Q4`, days of week, months, recurring patterns).
- **Cell Range Selection & Live Coordinate Bar**:
  - Click & drag multi-cell rectangular ranges.
  - Formula cell picker (typing `=SUM(` and clicking grid cells automatically inserts coordinates).
  - Quick coordinate jump input (`A1`, `C10`).

### 2. Built-in AI Copilot ("SheetAI")
- **Natural Language Sheet Generation & Edits**:
  - *"Create a regional sales forecast table for Q1-Q4 with revenue, growth % and totals"*
  - *"Calculate profit margin in column D as (Revenue - Cost)/Revenue"*
  - *"Apply professional dark headers and alternating zebra row striping"*
  - *"Clean all data: trim extra whitespace and capitalize names"*
  - *"Analyze this sheet and suggest key insights"*
- **Interactive Change Previews & 1-Click Apply**:
  - AI presents proposed changes with affected cell counts and explanations.
  - "Apply to Sheet" button with micro-confetti celebration.
- **Dual AI Engine Modes**:
  - **Smart Built-in Engine**: Works offline with zero configuration.
  - **Live Gemini API Engine**: Configure your Google Gemini API Key in Settings for real-time advanced reasoning with Gemini 2.0 Flash / Gemini 1.5 Pro.

### 3. Formatting, Visualizations & Multi-Sheet Workbooks
- **Formatting Toolbar**:
  - Font family, size, bold, italic, underline, strikethrough.
  - Custom text color & cell fill color palettes.
  - Cell border styles (all, outer, top, bottom, left, right, clear).
  - Horizontal alignment (Left, Center, Right) & Vertical alignment (Top, Middle, Bottom).
  - Number formatters: Plain Text, Currency `$`, Percentage `%`, Decimals `.0 / .00`, Scientific, Date.
- **Dynamic Interactive Charts**:
  - Bar Charts, Line Charts, Pie Charts, Doughnut Charts, and Radar Charts powered by Chart.js.
  - Live extraction of labels and data series from selected cell ranges.
- **Multi-Sheet Workbook**:
  - Add sheets `+`, rename, duplicate, delete, assign color badges.
  - Real-time **Selection Stats Bar** in bottom right (Sum, Avg, Min, Max, Count) just like Google Sheets.
- **Import / Export**:
  - Export to genuine Excel `.xlsx`, `.csv`, `.json`, and print-ready PDF.
  - Import `.xlsx` and `.csv` files.

---

## 🧪 Verification & Build Status

- **Build Check**: `npm run build` passed with zero errors (`dist` production bundle created).
- **Dev Server**: Running live at `http://localhost:5173/`.
