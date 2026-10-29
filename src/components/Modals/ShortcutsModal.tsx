import React from 'react';
import { X, Keyboard, Command } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'Ctrl + Z / ⌘Z', desc: 'Undo last change' },
  { key: 'Ctrl + Y / ⌘Y', desc: 'Redo previously undone change' },
  { key: 'Ctrl + C / ⌘C', desc: 'Copy cell or range selection' },
  { key: 'Ctrl + V / ⌘V', desc: 'Paste from clipboard' },
  { key: 'Ctrl + B / ⌘B', desc: 'Toggle bold formatting' },
  { key: 'Ctrl + I / ⌘I', desc: 'Toggle italic formatting' },
  { key: 'Ctrl + U / ⌘U', desc: 'Toggle underline formatting' },
  { key: 'Ctrl + H / ⌘H', desc: 'Open Find and Replace' },
  { key: 'Ctrl + P / ⌘P', desc: 'Print / Save as PDF' },
  { key: 'Enter', desc: 'Commit edit and move down' },
  { key: 'Tab', desc: 'Commit edit and move right' },
  { key: 'Shift + Arrows', desc: 'Expand rectangular range selection' },
  { key: 'F2', desc: 'Edit active cell' },
  { key: 'Delete / Backspace', desc: 'Clear cell contents' },
  { key: 'Drag Bottom-Right Dot', desc: 'Auto-fill formula or sequence' },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ width: '560px', maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Keyboard size={18} color="var(--accent-blue)" />
            <span style={{ fontSize: '16px', fontWeight: 700 }}>Keyboard Shortcuts</span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Shortcuts List */}
        <div style={{ padding: '16px 20px', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {SHORTCUTS.map((s, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface-secondary)',
                }}
              >
                <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{s.desc}</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-strong)',
                    color: 'var(--accent-blue)',
                  }}
                >
                  {s.key}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
