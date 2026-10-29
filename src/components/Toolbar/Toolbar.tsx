import React, { useState, useRef, useEffect } from 'react';
import {
  Undo2,
  Redo2,
  DollarSign,
  Percent,
  Minus,
  Plus,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Baseline,
  PaintBucket,
  Grid,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  WrapText,
  ChevronDown,
  Wand2,
  Filter,
  ListPlus,
  Palette,
  Table2,
  Lightbulb,
} from 'lucide-react';
import { CellFormat, NumberFormatType, BorderStyle } from '../../types/spreadsheet';

interface ToolbarProps {
  currentFormat?: CellFormat;
  onFormatChange: (formatUpdate: Partial<CellFormat>) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenChartModal: () => void;
  onSmartFill: () => void;
  isFilterActive?: boolean;
  onToggleFilter: () => void;
  onOpenValidationModal: () => void;
  onOpenConditionalFormatModal: () => void;
  onOpenPivotModal: () => void;
  onOpenFormulaExplainer: () => void;
}

const COLOR_PALETTE = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
  '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
  '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
  '#0f172a', '#1e293b', '#334155', '#1e3a8a', '#1e1b4b', '#064e3b', '#701a75', '#831843', '#713f12', '#7c2d12',
];

const FONT_FAMILIES = [
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'JetBrains Mono', value: 'JetBrains Mono, monospace' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: 'Courier New, monospace' },
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 30, 36];

export const Toolbar: React.FC<ToolbarProps> = ({
  currentFormat = {},
  onFormatChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenChartModal,
  onSmartFill,
  isFilterActive = false,
  onToggleFilter,
  onOpenValidationModal,
  onOpenConditionalFormatModal,
  onOpenPivotModal,
  onOpenFormulaExplainer,
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const handleBorders = (type: 'all' | 'outer' | 'inner' | 'none' | 'top' | 'bottom' | 'left' | 'right') => {
    const borderStyle: { style: BorderStyle; color: string } = { style: 'thin', color: '#cbd5e1' };
    switch (type) {
      case 'all':
      case 'outer':
        onFormatChange({
          borders: { top: borderStyle, right: borderStyle, bottom: borderStyle, left: borderStyle },
        });
        break;
      case 'top':
        onFormatChange({ borders: { ...currentFormat.borders, top: borderStyle } });
        break;
      case 'bottom':
        onFormatChange({ borders: { ...currentFormat.borders, bottom: borderStyle } });
        break;
      case 'left':
        onFormatChange({ borders: { ...currentFormat.borders, left: borderStyle } });
        break;
      case 'right':
        onFormatChange({ borders: { ...currentFormat.borders, right: borderStyle } });
        break;
      case 'none':
        onFormatChange({ borders: undefined });
        break;
    }
    setOpenDropdown(null);
  };

  return (
    <div
      ref={toolbarRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '6px 12px',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        overflowX: 'auto',
        position: 'relative',
        zIndex: 40,
      }}
    >
      {/* Undo / Redo */}
      <button className="btn-icon" onClick={onUndo} disabled={!canUndo} style={{ opacity: canUndo ? 1 : 0.4 }} title="Undo (Ctrl+Z)">
        <Undo2 size={16} />
      </button>
      <button className="btn-icon" onClick={onRedo} disabled={!canRedo} style={{ opacity: canRedo ? 1 : 0.4 }} title="Redo (Ctrl+Y)">
        <Redo2 size={16} />
      </button>

      <div style={separatorStyle} />

      {/* Number Formatting Shortcuts */}
      <button
        className={`btn-icon ${currentFormat.numberFormat === 'currency' ? 'active' : ''}`}
        onClick={() =>
          onFormatChange({
            numberFormat: currentFormat.numberFormat === 'currency' ? 'text' : 'currency',
            currencySymbol: '$',
            decimals: currentFormat.decimals ?? 2,
          })
        }
        title="Format as Currency ($)"
      >
        <DollarSign size={16} />
      </button>

      <button
        className={`btn-icon ${currentFormat.numberFormat === 'percent' ? 'active' : ''}`}
        onClick={() =>
          onFormatChange({
            numberFormat: currentFormat.numberFormat === 'percent' ? 'text' : 'percent',
            decimals: currentFormat.decimals ?? 1,
          })
        }
        title="Format as Percentage (%)"
      >
        <Percent size={16} />
      </button>

      <button
        className="btn-icon"
        onClick={() => {
          const currentDec = currentFormat.decimals ?? 2;
          onFormatChange({ numberFormat: currentFormat.numberFormat || 'number', decimals: Math.max(0, currentDec - 1) });
        }}
        title="Decrease decimal places (.0)"
      >
        <Minus size={14} />
      </button>

      <button
        className="btn-icon"
        onClick={() => {
          const currentDec = currentFormat.decimals ?? 2;
          onFormatChange({ numberFormat: currentFormat.numberFormat || 'number', decimals: Math.min(8, currentDec + 1) });
        }}
        title="Increase decimal places (.00)"
      >
        <Plus size={14} />
      </button>

      {/* Number format dropdown */}
      <div style={{ position: 'relative' }}>
        <button className="btn-icon" onClick={() => toggleDropdown('numberFormat')} style={{ fontSize: '12px', padding: '4px 6px' }}>
          <span>{currentFormat.numberFormat ? currentFormat.numberFormat.toUpperCase() : '123'}</span>
          <ChevronDown size={12} style={{ marginLeft: '2px' }} />
        </button>
        {openDropdown === 'numberFormat' && (
          <div style={dropdownMenu}>
            {(['text', 'number', 'currency', 'percent', 'date', 'scientific'] as NumberFormatType[]).map((fmt) => (
              <div
                key={fmt}
                style={menuOption}
                onClick={() => {
                  onFormatChange({ numberFormat: fmt });
                  setOpenDropdown(null);
                }}
              >
                {fmt.charAt(0).toUpperCase() + fmt.slice(1)}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={separatorStyle} />

      {/* Font Family */}
      <div style={{ position: 'relative' }}>
        <button
          className="btn-icon"
          onClick={() => toggleDropdown('fontFamily')}
          style={{ fontSize: '13px', minWidth: '90px', justifyContent: 'space-between', padding: '4px 8px' }}
        >
          <span>{FONT_FAMILIES.find((f) => f.value === currentFormat.fontFamily)?.label || 'Inter'}</span>
          <ChevronDown size={12} />
        </button>
        {openDropdown === 'fontFamily' && (
          <div style={dropdownMenu}>
            {FONT_FAMILIES.map((font) => (
              <div
                key={font.value}
                style={{ ...menuOption, fontFamily: font.value }}
                onClick={() => {
                  onFormatChange({ fontFamily: font.value });
                  setOpenDropdown(null);
                }}
              >
                {font.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Font Size */}
      <div style={{ position: 'relative' }}>
        <button
          className="btn-icon"
          onClick={() => toggleDropdown('fontSize')}
          style={{ fontSize: '13px', minWidth: '46px', justifyContent: 'space-between', padding: '4px 6px' }}
        >
          <span>{currentFormat.fontSize || 11}</span>
          <ChevronDown size={12} />
        </button>
        {openDropdown === 'fontSize' && (
          <div style={{ ...dropdownMenu, maxHeight: '200px', overflowY: 'auto' }}>
            {FONT_SIZES.map((sz) => (
              <div
                key={sz}
                style={menuOption}
                onClick={() => {
                  onFormatChange({ fontSize: sz });
                  setOpenDropdown(null);
                }}
              >
                {sz}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={separatorStyle} />

      {/* Bold, Italic, Underline, Strikethrough */}
      <button className={`btn-icon ${currentFormat.bold ? 'active' : ''}`} onClick={() => onFormatChange({ bold: !currentFormat.bold })} title="Bold (Ctrl+B)">
        <Bold size={16} />
      </button>
      <button className={`btn-icon ${currentFormat.italic ? 'active' : ''}`} onClick={() => onFormatChange({ italic: !currentFormat.italic })} title="Italic (Ctrl+I)">
        <Italic size={16} />
      </button>
      <button className={`btn-icon ${currentFormat.underline ? 'active' : ''}`} onClick={() => onFormatChange({ underline: !currentFormat.underline })} title="Underline (Ctrl+U)">
        <Underline size={16} />
      </button>
      <button className={`btn-icon ${currentFormat.strikethrough ? 'active' : ''}`} onClick={() => onFormatChange({ strikethrough: !currentFormat.strikethrough })} title="Strikethrough">
        <Strikethrough size={16} />
      </button>

      <div style={separatorStyle} />

      {/* Text & Fill Colors */}
      <div style={{ position: 'relative' }}>
        <button className="btn-icon" onClick={() => toggleDropdown('textColor')} title="Text Color" style={{ position: 'relative' }}>
          <Baseline size={16} />
          <div style={{ position: 'absolute', bottom: '3px', left: '6px', right: '6px', height: '3px', backgroundColor: currentFormat.textColor || '#000000', borderRadius: '2px' }} />
        </button>
        {openDropdown === 'textColor' && (
          <div style={colorPaletteDropdown}>
            <div style={paletteGrid}>
              {COLOR_PALETTE.map((color) => (
                <div
                  key={color}
                  onClick={() => { onFormatChange({ textColor: color }); setOpenDropdown(null); }}
                  style={{ width: '18px', height: '18px', backgroundColor: color, borderRadius: '3px', border: '1px solid rgba(0,0,0,0.15)', cursor: 'pointer' }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        <button className="btn-icon" onClick={() => toggleDropdown('fillColor')} title="Fill Color" style={{ position: 'relative' }}>
          <PaintBucket size={16} />
          <div style={{ position: 'absolute', bottom: '3px', left: '6px', right: '6px', height: '3px', backgroundColor: currentFormat.bgColor || 'transparent', border: currentFormat.bgColor ? 'none' : '1px dashed #94a3b8', borderRadius: '2px' }} />
        </button>
        {openDropdown === 'fillColor' && (
          <div style={colorPaletteDropdown}>
            <div style={{ padding: '6px 8px', fontSize: '12px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)' }} onClick={() => { onFormatChange({ bgColor: undefined }); setOpenDropdown(null); }}>
              Reset / Transparent
            </div>
            <div style={paletteGrid}>
              {COLOR_PALETTE.map((color) => (
                <div
                  key={color}
                  onClick={() => { onFormatChange({ bgColor: color }); setOpenDropdown(null); }}
                  style={{ width: '18px', height: '18px', backgroundColor: color, borderRadius: '3px', border: '1px solid rgba(0,0,0,0.15)', cursor: 'pointer' }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cell Borders */}
      <div style={{ position: 'relative' }}>
        <button className="btn-icon" onClick={() => toggleDropdown('borders')} title="Cell Borders">
          <Grid size={16} />
        </button>
        {openDropdown === 'borders' && (
          <div style={dropdownMenu}>
            <div style={menuOption} onClick={() => handleBorders('all')}>All Borders</div>
            <div style={menuOption} onClick={() => handleBorders('outer')}>Outer Borders</div>
            <div style={menuOption} onClick={() => handleBorders('top')}>Top Border</div>
            <div style={menuOption} onClick={() => handleBorders('bottom')}>Bottom Border</div>
            <div style={menuOption} onClick={() => handleBorders('left')}>Left Border</div>
            <div style={menuOption} onClick={() => handleBorders('right')}>Right Border</div>
            <div style={menuOption} onClick={() => handleBorders('none')}>Clear Borders</div>
          </div>
        )}
      </div>

      <div style={separatorStyle} />

      {/* Alignment */}
      <button className={`btn-icon ${currentFormat.align === 'left' || !currentFormat.align ? 'active' : ''}`} onClick={() => onFormatChange({ align: 'left' })} title="Align Left">
        <AlignLeft size={16} />
      </button>
      <button className={`btn-icon ${currentFormat.align === 'center' ? 'active' : ''}`} onClick={() => onFormatChange({ align: 'center' })} title="Align Center">
        <AlignCenter size={16} />
      </button>
      <button className={`btn-icon ${currentFormat.align === 'right' ? 'active' : ''}`} onClick={() => onFormatChange({ align: 'right' })} title="Align Right">
        <AlignRight size={16} />
      </button>

      <div style={separatorStyle} />

      {/* NEW FEATURES: Filter, Data Validation, Conditional Formatting, Pivot, Explainer */}
      <button
        className={`btn-icon ${isFilterActive ? 'active' : ''}`}
        onClick={onToggleFilter}
        title="Toggle Column Filter Menus"
        style={{ color: isFilterActive ? 'var(--accent-blue)' : undefined }}
      >
        <Filter size={15} />
      </button>

      <button className="btn-icon" onClick={onOpenValidationModal} title="Data Validation & Dropdowns">
        <ListPlus size={15} />
      </button>

      <button className="btn-icon" onClick={onOpenConditionalFormatModal} title="Conditional Formatting & Heatmaps">
        <Palette size={15} />
      </button>

      <button className="btn-icon" onClick={onOpenPivotModal} title="Create Pivot Table">
        <Table2 size={15} />
      </button>

      <button className="btn-icon" onClick={onOpenFormulaExplainer} title="Explain Formula / Auto-Fix Error">
        <Lightbulb size={15} color="var(--accent-blue)" />
      </button>

      <div style={separatorStyle} />

      {/* AI Smart Fill Button */}
      <button
        className="btn-icon"
        onClick={onSmartFill}
        title="AI Smart Fill: Detects pattern and extrapolates range"
        style={{
          color: 'var(--accent-blue)',
          backgroundColor: 'var(--accent-blue-subtle)',
          padding: '4px 10px',
          fontSize: '12px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <Wand2 size={14} />
        <span>AI Smart Fill</span>
      </button>
    </div>
  );
};

const separatorStyle: React.CSSProperties = {
  width: '1px',
  height: '20px',
  backgroundColor: 'var(--border-subtle)',
  margin: '0 4px',
};

const dropdownMenu: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: '4px',
  backgroundColor: 'var(--bg-surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '8px',
  boxShadow: 'var(--shadow-lg)',
  padding: '4px 0',
  minWidth: '140px',
  zIndex: 100,
};

const menuOption: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: '13px',
  color: 'var(--text-primary)',
  cursor: 'pointer',
};

const colorPaletteDropdown: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: '4px',
  backgroundColor: 'var(--bg-surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '8px',
  boxShadow: 'var(--shadow-lg)',
  padding: '8px',
  width: '210px',
  zIndex: 100,
};

const paletteGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(10, 1fr)',
  gap: '4px',
  marginTop: '4px',
};
