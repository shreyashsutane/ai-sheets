import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  FileSpreadsheet,
  FileDown,
  Upload,
  Plus,
  BarChart3,
  Moon,
  Sun,
  Settings,
  HelpCircle,
  FolderOpen,
  Copy,
  Printer,
  Undo2,
  Redo2,
  Scissors,
  Search,
  Trash2,
  Grid,
  Check,
  ChevronDown,
  LayoutTemplate,
  Layers,
  Wand2,
  BrainCircuit,
  Palette,
  Cloud,
} from 'lucide-react';
import { Workbook, SheetData, AppTheme } from '../../types/spreadsheet';
import { exportToXLSX, exportToCSV, exportToJSON } from '../../core/ioUtils';

interface HeaderProps {
  workbook: Workbook;
  activeSheet: SheetData;
  theme: AppTheme;
  onThemeSelect: (theme: AppTheme) => void;
  onTitleChange: (newTitle: string) => void;
  onOpenTemplates: () => void;
  onOpenChartModal: () => void;
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
  onOpenFindReplace: () => void;
  onOpenGCSModal: () => void;
  onToggleAICopilot: () => void;
  isAICopilotOpen: boolean;
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNewWorkbook: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onInsertRow: (above: boolean) => void;
  onInsertCol: (left: boolean) => void;
  onDeleteRow: () => void;
  onDeleteCol: () => void;
  onCleanData: () => void;
  onAutoAnalyze: () => void;
}

const THEME_OPTIONS: { id: AppTheme; name: string; subtitle: string; bg: string; accent: string; text: string }[] = [
  { id: 'light', name: 'Google Workspace', subtitle: 'Clean Light', bg: '#ffffff', accent: '#2563eb', text: '#0f172a' },
  { id: 'dark', name: 'Obsidian Dark', subtitle: 'Linear Matte Slate', bg: '#0f172a', accent: '#60a5fa', text: '#f8fafc' },
  { id: 'nord', name: 'Nordic Frost', subtitle: 'Arctic Cyan & Navy', bg: '#2e3440', accent: '#88c0d0', text: '#eceff4' },
  { id: 'sepia', name: 'Warm Sepia', subtitle: 'Solarized Low Eye-Strain', bg: '#fdf6e2', accent: '#b58900', text: '#433422' },
  { id: 'dracula', name: 'Dracula Dark', subtitle: 'Vibrant Violet & Pink', bg: '#282a36', accent: '#ff79c6', text: '#f8f8f2' },
  { id: 'emerald', name: 'Emerald Luxury', subtitle: 'Finance & Banking Pro', bg: '#0a261c', accent: '#10b981', text: '#ecfdf5' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', subtitle: 'Electric Magenta & Cyan', bg: '#0c0d14', accent: '#00f0ff', text: '#f3f4f6' },
];

export const Header: React.FC<HeaderProps> = ({
  workbook,
  activeSheet,
  theme,
  onThemeSelect,
  onTitleChange,
  onOpenTemplates,
  onOpenChartModal,
  onOpenSettings,
  onOpenShortcuts,
  onOpenFindReplace,
  onOpenGCSModal,
  onToggleAICopilot,
  isAICopilotOpen,
  onImportFile,
  onNewWorkbook,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onInsertRow,
  onInsertCol,
  onDeleteRow,
  onDeleteCol,
  onCleanData,
  onAutoAnalyze,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(workbook.title);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitleInput(workbook.title);
  }, [workbook.title]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
        setExportOpen(false);
        setThemeMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim()) {
      onTitleChange(titleInput.trim());
    } else {
      setTitleInput(workbook.title);
    }
  };

  const activeThemeObj = THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[0];

  return (
    <header
      ref={menuRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        backgroundColor: 'var(--bg-header)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'relative',
        zIndex: 50,
      }}
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onImportFile}
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
      />

      {/* Left Section: Logo, Title, Menu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* App Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#ffffff',
            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
          }}
        >
          <FileSpreadsheet size={22} />
        </div>

        <div>
          {/* Document Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isEditingTitle ? (
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                autoFocus
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid var(--accent-blue)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            ) : (
              <span
                onClick={() => setIsEditingTitle(true)}
                title="Click to rename"
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-secondary)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                {workbook.title || 'Untitled spreadsheet'}
              </span>
            )}
            <span
              style={{
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: 'var(--accent-primary-subtle)',
                color: 'var(--accent-primary)',
                fontWeight: 600,
                letterSpacing: '0.3px',
              }}
            >
              SHEET AI
            </span>
          </div>

          {/* Menu Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginTop: '2px' }}>
            {/* File Menu */}
            <div style={{ position: 'relative' }}>
              <button
                className={`btn-icon ${activeMenu === 'file' ? 'active' : ''}`}
                onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
                style={{ fontSize: '13px', padding: '3px 8px', borderRadius: '4px' }}
              >
                File
              </button>
              {activeMenu === 'file' && (
                <div style={dropdownStyle}>
                  <div style={menuItemStyle} onClick={() => { onNewWorkbook(); setActiveMenu(null); }}>
                    <Plus size={14} /> New Spreadsheet
                  </div>
                  <div style={menuItemStyle} onClick={() => { fileInputRef.current?.click(); setActiveMenu(null); }}>
                    <Upload size={14} /> Import File (.xlsx, .csv)
                  </div>
                  <div style={menuItemStyle} onClick={() => { onOpenGCSModal(); setActiveMenu(null); }}>
                    <Cloud size={14} color="#2563eb" /> Google Cloud Storage (GCS)...
                  </div>
                  <div style={menuDividerStyle} />
                  <div style={menuItemStyle} onClick={() => { exportToXLSX(workbook); setActiveMenu(null); }}>
                    <FileDown size={14} /> Export to Excel (.xlsx)
                  </div>
                  <div style={menuItemStyle} onClick={() => { exportToCSV(activeSheet); setActiveMenu(null); }}>
                    <FileDown size={14} /> Export active sheet to CSV (.csv)
                  </div>
                  <div style={menuItemStyle} onClick={() => { exportToJSON(workbook); setActiveMenu(null); }}>
                    <FileDown size={14} /> Export workbook (.json)
                  </div>
                  <div style={menuDividerStyle} />
                  <div style={menuItemStyle} onClick={() => { window.print(); setActiveMenu(null); }}>
                    <Printer size={14} /> Print / Save as PDF
                  </div>
                </div>
              )}
            </div>

            {/* Edit Menu */}
            <div style={{ position: 'relative' }}>
              <button
                className={`btn-icon ${activeMenu === 'edit' ? 'active' : ''}`}
                onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}
                style={{ fontSize: '13px', padding: '3px 8px', borderRadius: '4px' }}
              >
                Edit
              </button>
              {activeMenu === 'edit' && (
                <div style={dropdownStyle}>
                  <div
                    style={{ ...menuItemStyle, opacity: canUndo ? 1 : 0.5 }}
                    onClick={() => { if (canUndo) { onUndo(); setActiveMenu(null); } }}
                  >
                    <Undo2 size={14} /> Undo (Ctrl+Z)
                  </div>
                  <div
                    style={{ ...menuItemStyle, opacity: canRedo ? 1 : 0.5 }}
                    onClick={() => { if (canRedo) { onRedo(); setActiveMenu(null); } }}
                  >
                    <Redo2 size={14} /> Redo (Ctrl+Y)
                  </div>
                  <div style={menuDividerStyle} />
                  <div style={menuItemStyle} onClick={() => { onOpenFindReplace(); setActiveMenu(null); }}>
                    <Search size={14} /> Find & Replace (Ctrl+H)
                  </div>
                  <div style={menuDividerStyle} />
                  <div style={menuItemStyle} onClick={() => { onDeleteRow(); setActiveMenu(null); }}>
                    <Trash2 size={14} /> Delete Selected Row
                  </div>
                  <div style={menuItemStyle} onClick={() => { onDeleteCol(); setActiveMenu(null); }}>
                    <Trash2 size={14} /> Delete Selected Column
                  </div>
                </div>
              )}
            </div>

            {/* Insert Menu */}
            <div style={{ position: 'relative' }}>
              <button
                className={`btn-icon ${activeMenu === 'insert' ? 'active' : ''}`}
                onClick={() => setActiveMenu(activeMenu === 'insert' ? null : 'insert')}
                style={{ fontSize: '13px', padding: '3px 8px', borderRadius: '4px' }}
              >
                Insert
              </button>
              {activeMenu === 'insert' && (
                <div style={dropdownStyle}>
                  <div style={menuItemStyle} onClick={() => { onInsertRow(true); setActiveMenu(null); }}>
                    Row Above
                  </div>
                  <div style={menuItemStyle} onClick={() => { onInsertRow(false); setActiveMenu(null); }}>
                    Row Below
                  </div>
                  <div style={menuDividerStyle} />
                  <div style={menuItemStyle} onClick={() => { onInsertCol(true); setActiveMenu(null); }}>
                    Column Left
                  </div>
                  <div style={menuItemStyle} onClick={() => { onInsertCol(false); setActiveMenu(null); }}>
                    Column Right
                  </div>
                  <div style={menuDividerStyle} />
                  <div style={menuItemStyle} onClick={() => { onOpenChartModal(); setActiveMenu(null); }}>
                    <BarChart3 size={14} /> Insert Chart
                  </div>
                </div>
              )}
            </div>

            {/* AI Tools Menu */}
            <div style={{ position: 'relative' }}>
              <button
                className={`btn-icon ${activeMenu === 'ai' ? 'active' : ''}`}
                onClick={() => setActiveMenu(activeMenu === 'ai' ? null : 'ai')}
                style={{
                  fontSize: '13px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  color: 'var(--accent-blue)',
                  fontWeight: 600,
                }}
              >
                <Sparkles size={13} style={{ marginRight: '4px', display: 'inline' }} />
                AI Tools
              </button>
              {activeMenu === 'ai' && (
                <div style={dropdownStyle}>
                  <div style={menuItemStyle} onClick={() => { onToggleAICopilot(); setActiveMenu(null); }}>
                    <BrainCircuit size={14} color="#8b5cf6" /> Open AI Copilot Sidebar
                  </div>
                  <div style={menuItemStyle} onClick={() => { onAutoAnalyze(); setActiveMenu(null); }}>
                    <Wand2 size={14} color="#2563eb" /> Auto-Analyze & Detect Insights
                  </div>
                  <div style={menuItemStyle} onClick={() => { onCleanData(); setActiveMenu(null); }}>
                    <Wand2 size={14} color="#10b981" /> AI Clean & Format Data
                  </div>
                  <div style={menuDividerStyle} />
                  <div style={menuItemStyle} onClick={() => { onOpenSettings(); setActiveMenu(null); }}>
                    <Settings size={14} /> AI Model & API Key Settings
                  </div>
                </div>
              )}
            </div>

            {/* Help Menu */}
            <div style={{ position: 'relative' }}>
              <button
                className={`btn-icon ${activeMenu === 'help' ? 'active' : ''}`}
                onClick={() => setActiveMenu(activeMenu === 'help' ? null : 'help')}
                style={{ fontSize: '13px', padding: '3px 8px', borderRadius: '4px' }}
              >
                Help
              </button>
              {activeMenu === 'help' && (
                <div style={dropdownStyle}>
                  <div style={menuItemStyle} onClick={() => { onOpenShortcuts(); setActiveMenu(null); }}>
                    <HelpCircle size={14} /> Keyboard Shortcuts (?)
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Section: Templates, Chart, Export, 7-Theme Selector, AI Copilot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Templates Button */}
        <button
          className="btn-icon"
          onClick={onOpenTemplates}
          title="Browse Templates"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '13px', fontWeight: 500 }}
        >
          <LayoutTemplate size={16} />
          <span>Templates</span>
        </button>

        {/* GCS Cloud Storage Button */}
        <button
          className="btn-icon"
          onClick={onOpenGCSModal}
          title="Google Cloud Storage (GCS)"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '13px', fontWeight: 500, color: 'var(--accent-blue)' }}
        >
          <Cloud size={16} />
          <span>Cloud Storage</span>
        </button>

        {/* Charts Button */}
        <button
          className="btn-icon"
          onClick={onOpenChartModal}
          title="Create Chart"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '13px', fontWeight: 500 }}
        >
          <BarChart3 size={16} />
          <span>Charts</span>
        </button>

        {/* Export Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn-icon"
            onClick={() => setExportOpen(!exportOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', fontSize: '13px' }}
          >
            <FileDown size={16} />
            <span>Export</span>
            <ChevronDown size={13} />
          </button>
          {exportOpen && (
            <div style={{ ...dropdownStyle, right: 0, left: 'auto', width: '200px' }}>
              <div style={menuItemStyle} onClick={() => { exportToXLSX(workbook); setExportOpen(false); }}>
                Microsoft Excel (.xlsx)
              </div>
              <div style={menuItemStyle} onClick={() => { exportToCSV(activeSheet); setExportOpen(false); }}>
                Comma Separated Values (.csv)
              </div>
              <div style={menuItemStyle} onClick={() => { exportToJSON(workbook); setExportOpen(false); }}>
                JSON Structure (.json)
              </div>
              <div style={menuDividerStyle} />
              <div style={menuItemStyle} onClick={() => { window.print(); setExportOpen(false); }}>
                PDF Document (Print)
              </div>
            </div>
          )}
        </div>

        {/* 7-Themes Selector Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn-icon"
            onClick={() => setThemeMenuOpen(!themeMenuOpen)}
            title="Choose Theme Palette"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            <div
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                backgroundColor: activeThemeObj.bg,
                border: `2px solid ${activeThemeObj.accent}`,
              }}
            />
            <span>{activeThemeObj.name}</span>
            <ChevronDown size={12} />
          </button>

          {themeMenuOpen && (
            <div
              style={{
                ...dropdownStyle,
                right: 0,
                left: 'auto',
                width: '260px',
                padding: '6px',
              }}
            >
              <div style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Select Workspace Theme
              </div>
              {THEME_OPTIONS.map((t) => {
                const isSelected = t.id === theme;
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      onThemeSelect(t.id);
                      setThemeMenuOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'var(--accent-blue-subtle)' : 'transparent',
                      transition: 'background 0.1s ease',
                      marginBottom: '2px',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-surface-secondary)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: t.bg,
                          border: `2px solid ${t.accent}`,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                        }}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {t.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {t.subtitle}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check size={16} color="var(--accent-blue)" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Settings Button */}
        <button
          className="btn-icon"
          onClick={onOpenSettings}
          title="AI & App Settings"
        >
          <Settings size={16} />
        </button>

        {/* AI Copilot Sparkle Toggle Button */}
        <button
          className="btn-ai-spark"
          onClick={onToggleAICopilot}
          style={{
            background: isAICopilotOpen
              ? 'linear-gradient(135deg, #1d4ed8, #6d28d9, #be185d)'
              : 'linear-gradient(135deg, #2563eb, #7c3aed, #db2777)',
          }}
        >
          <Sparkles size={16} />
          <span>SheetAI Copilot</span>
        </button>
      </div>
    </header>
  );
};

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: '4px',
  backgroundColor: 'var(--bg-surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '8px',
  boxShadow: 'var(--shadow-lg)',
  padding: '6px 0',
  minWidth: '220px',
  zIndex: 100,
};

const menuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 14px',
  fontSize: '13px',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  transition: 'background 0.1s ease',
};

const menuDividerStyle: React.CSSProperties = {
  height: '1px',
  backgroundColor: 'var(--border-subtle)',
  margin: '4px 0',
};
