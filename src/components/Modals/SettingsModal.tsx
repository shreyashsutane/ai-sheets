import React, { useState } from 'react';
import { X, Sparkles, Check, ExternalLink, ShieldCheck, Cpu, Server, Bot } from 'lucide-react';
import { AISettings, AIProvider } from '../../types/spreadsheet';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AISettings;
  onSaveSettings: (newSettings: AISettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [provider, setProvider] = useState<AIProvider>(settings.provider || 'builtin');
  const [geminiKey, setGeminiKey] = useState(settings.apiKey || '');
  const [geminiModel, setGeminiModel] = useState(settings.model || 'gemini-2.0-flash');
  const [openaiKey, setOpenaiKey] = useState(settings.openaiKey || '');
  const [openaiModel, setOpenaiModel] = useState(settings.openaiModel || 'gpt-4o');
  const [claudeKey, setClaudeKey] = useState(settings.claudeKey || '');
  const [claudeModel, setClaudeModel] = useState(settings.claudeModel || 'claude-3-7-sonnet-20250219');
  const [ollamaUrl, setOllamaUrl] = useState(settings.ollamaUrl || 'http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState(settings.ollamaModel || 'llama3');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      provider,
      apiKey: geminiKey.trim(),
      model: geminiModel,
      openaiKey: openaiKey.trim(),
      openaiModel,
      claudeKey: claudeKey.trim(),
      claudeModel,
      ollamaUrl: ollamaUrl.trim(),
      ollamaModel,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 700);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ width: '560px', maxHeight: '90vh' }}
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
            <Sparkles size={18} color="var(--accent-blue)" />
            <span style={{ fontSize: '16px', fontWeight: 700 }}>AI Provider & Model Settings</span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          {/* Provider Selection Tabs */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
              Select Active AI Provider
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
              <button
                type="button"
                className={`btn-icon ${provider === 'builtin' ? 'active' : ''}`}
                onClick={() => setProvider('builtin')}
                style={{ padding: '8px 4px', fontSize: '11px', fontWeight: 600, borderRadius: '6px', flexDirection: 'column', gap: '4px' }}
              >
                <ShieldCheck size={16} />
                <span>Built-in</span>
              </button>
              <button
                type="button"
                className={`btn-icon ${provider === 'gemini' ? 'active' : ''}`}
                onClick={() => setProvider('gemini')}
                style={{ padding: '8px 4px', fontSize: '11px', fontWeight: 600, borderRadius: '6px', flexDirection: 'column', gap: '4px' }}
              >
                <Sparkles size={16} />
                <span>Gemini</span>
              </button>
              <button
                type="button"
                className={`btn-icon ${provider === 'openai' ? 'active' : ''}`}
                onClick={() => setProvider('openai')}
                style={{ padding: '8px 4px', fontSize: '11px', fontWeight: 600, borderRadius: '6px', flexDirection: 'column', gap: '4px' }}
              >
                <Bot size={16} />
                <span>OpenAI</span>
              </button>
              <button
                type="button"
                className={`btn-icon ${provider === 'claude' ? 'active' : ''}`}
                onClick={() => setProvider('claude')}
                style={{ padding: '8px 4px', fontSize: '11px', fontWeight: 600, borderRadius: '6px', flexDirection: 'column', gap: '4px' }}
              >
                <Cpu size={16} />
                <span>Claude</span>
              </button>
              <button
                type="button"
                className={`btn-icon ${provider === 'ollama' ? 'active' : ''}`}
                onClick={() => setProvider('ollama')}
                style={{ padding: '8px 4px', fontSize: '11px', fontWeight: 600, borderRadius: '6px', flexDirection: 'column', gap: '4px' }}
              >
                <Server size={16} />
                <span>Ollama</span>
              </button>
            </div>
          </div>

          {/* Provider Specific Settings */}
          {provider === 'builtin' && (
            <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-surface-secondary)', fontSize: '13px', lineHeight: '1.4' }}>
              ✨ <strong>Built-in Offline Engine Active</strong>: Generates realistic tables, calculates column formulas, formats styles, and analyzes datasets instantly in your browser with zero API keys or network requests.
            </div>
          )}

          {provider === 'gemini' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Google Gemini API Key
                </label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  style={{ width: '100%', padding: '7px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-strong)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Model</label>
                <select value={geminiModel} onChange={(e) => setGeminiModel(e.target.value)} style={{ width: '100%', padding: '7px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-strong)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fastest)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Reasoning)</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                </select>
              </div>
            </div>
          )}

          {provider === 'openai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  style={{ width: '100%', padding: '7px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-strong)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Model</label>
                <select value={openaiModel} onChange={(e) => setOpenaiModel(e.target.value)} style={{ width: '100%', padding: '7px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-strong)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                  <option value="gpt-4o">GPT-4o (Omni)</option>
                  <option value="gpt-4o-mini">GPT-4o Mini (Ultra Fast)</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                </select>
              </div>
            </div>
          )}

          {provider === 'claude' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Anthropic Claude API Key
                </label>
                <input
                  type="password"
                  value={claudeKey}
                  onChange={(e) => setClaudeKey(e.target.value)}
                  placeholder="sk-ant-..."
                  style={{ width: '100%', padding: '7px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-strong)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Model</label>
                <select value={claudeModel} onChange={(e) => setClaudeModel(e.target.value)} style={{ width: '100%', padding: '7px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-strong)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                  <option value="claude-3-7-sonnet-20250219">Claude 3.7 Sonnet</option>
                  <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
                </select>
              </div>
            </div>
          )}

          {provider === 'ollama' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Ollama Base URL
                </label>
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  style={{ width: '100%', padding: '7px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-strong)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Model Name</label>
                <input
                  type="text"
                  value={ollamaModel}
                  onChange={(e) => setOllamaModel(e.target.value)}
                  placeholder="llama3, mistral, qwen2.5"
                  style={{ width: '100%', padding: '7px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-strong)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <button type="button" className="btn-icon" onClick={onClose} style={{ padding: '8px 16px', fontSize: '13px' }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ padding: '8px 20px', minWidth: '100px', justifyContent: 'center' }}>
              {savedSuccess ? (
                <>
                  <Check size={16} /> Saved!
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
