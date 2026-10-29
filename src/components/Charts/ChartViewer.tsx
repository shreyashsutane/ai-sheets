import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Pie, Doughnut, Radar } from 'react-chartjs-2';
import { X, Download, BarChart3, LineChart, PieChart, Sparkles } from 'lucide-react';
import { SheetData, SelectionRange, ChartType } from '../../types/spreadsheet';
import { expandRange, cellKeyToCoords, coordsToCellKey, normalizeRange, rangeToString } from '../../core/cellUtils';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend
);

interface ChartViewerProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: SheetData;
  selection: SelectionRange;
  initialChartType?: ChartType;
  initialTitle?: string;
  initialRange?: string;
}

const PALETTE = [
  'rgba(59, 130, 246, 0.8)',
  'rgba(16, 185, 129, 0.8)',
  'rgba(249, 115, 22, 0.8)',
  'rgba(236, 72, 153, 0.8)',
  'rgba(139, 92, 246, 0.8)',
  'rgba(234, 179, 8, 0.8)',
  'rgba(6, 182, 212, 0.8)',
];

export const ChartViewer: React.FC<ChartViewerProps> = ({
  isOpen,
  onClose,
  sheet,
  selection,
  initialChartType = 'bar',
  initialTitle,
  initialRange,
}) => {
  const [chartType, setChartType] = useState<ChartType>(initialChartType);
  const [chartTitle, setChartTitle] = useState(initialTitle || 'Sheet Data Chart');
  const [dataRangeStr, setDataRangeStr] = useState(initialRange || rangeToString(selection));

  // Extract labels and datasets from the selected range
  const chartData = useMemo(() => {
    const norm = normalizeRange(selection);
    const labels: string[] = [];
    const datasets: { label: string; data: number[]; backgroundColor: string | string[]; borderColor?: string; borderWidth?: number }[] = [];

    const hasHeaderRow = norm.endRow > norm.startRow;
    const startRow = hasHeaderRow ? norm.startRow + 1 : norm.startRow;

    // First column is used as label
    for (let r = startRow; r <= norm.endRow; r++) {
      const labelKey = coordsToCellKey(r, norm.startCol);
      const cell = sheet.cells[labelKey];
      const val = cell?.computedValue !== undefined ? cell.computedValue : (cell?.value ?? `Row ${r + 1}`);
      labels.push(String(val));
    }

    // Remaining columns (or same if only 1 col) are data series
    const startCol = norm.endCol > norm.startCol ? norm.startCol + 1 : norm.startCol;

    for (let c = startCol; c <= norm.endCol; c++) {
      const seriesHeaderKey = coordsToCellKey(norm.startRow, c);
      const headerCell = sheet.cells[seriesHeaderKey];
      const seriesName = (hasHeaderRow && headerCell?.value) ? String(headerCell.value) : `Series ${c - norm.startCol + 1}`;

      const seriesData: number[] = [];
      for (let r = startRow; r <= norm.endRow; r++) {
        const cellKey = coordsToCellKey(r, c);
        const cell = sheet.cells[cellKey];
        const val = cell?.computedValue !== undefined ? cell.computedValue : cell?.value;
        const num = Number(val);
        seriesData.push(isNaN(num) ? 0 : num);
      }

      const colorIdx = (c - startCol) % PALETTE.length;
      datasets.push({
        label: seriesName,
        data: seriesData,
        backgroundColor: chartType === 'pie' || chartType === 'doughnut' ? PALETTE : PALETTE[colorIdx],
        borderColor: chartType === 'line' ? PALETTE[colorIdx].replace('0.8', '1') : undefined,
        borderWidth: 1,
      });
    }

    // Fallback if labels are empty
    if (labels.length === 0) {
      labels.push('Data Point 1', 'Data Point 2', 'Data Point 3');
      datasets.push({
        label: 'Values',
        data: [10, 25, 45],
        backgroundColor: PALETTE[0],
      });
    }

    return { labels, datasets };
  }, [sheet, selection, chartType]);

  if (!isOpen) return null;

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: { family: 'Inter', size: 12 },
          color: '#64748b',
        },
      },
      title: {
        display: !!chartTitle,
        text: chartTitle,
        font: { family: 'Inter', size: 16, weight: 'bold' },
        color: '#0f172a',
      },
    },
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ width: '700px', height: '550px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={18} color="var(--accent-blue)" />
            <span style={{ fontSize: '15px', fontWeight: 600 }}>Chart Visualizer</span>
          </div>

          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Controls Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 18px',
            backgroundColor: 'var(--bg-surface-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
            gap: '12px',
          }}
        >
          {/* Chart Type Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              className={`btn-icon ${chartType === 'bar' ? 'active' : ''}`}
              onClick={() => setChartType('bar')}
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              Bar
            </button>
            <button
              className={`btn-icon ${chartType === 'line' ? 'active' : ''}`}
              onClick={() => setChartType('line')}
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              Line
            </button>
            <button
              className={`btn-icon ${chartType === 'pie' ? 'active' : ''}`}
              onClick={() => setChartType('pie')}
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              Pie
            </button>
            <button
              className={`btn-icon ${chartType === 'doughnut' ? 'active' : ''}`}
              onClick={() => setChartType('doughnut')}
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              Doughnut
            </button>
          </div>

          {/* Chart Title Input */}
          <input
            type="text"
            value={chartTitle}
            onChange={(e) => setChartTitle(e.target.value)}
            placeholder="Chart title"
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              border: '1px solid var(--border-strong)',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              outline: 'none',
              width: '200px',
            }}
          />
        </div>

        {/* Chart Canvas Area */}
        <div style={{ flex: 1, padding: '20px', position: 'relative' }}>
          {chartType === 'bar' && <Bar data={chartData} options={chartOptions} />}
          {chartType === 'line' && <Line data={chartData} options={chartOptions} />}
          {chartType === 'pie' && <Pie data={chartData} options={chartOptions} />}
          {chartType === 'doughnut' && <Doughnut data={chartData} options={chartOptions} />}
          {chartType === 'radar' && <Radar data={chartData} options={chartOptions} />}
        </div>
      </div>
    </div>
  );
};
