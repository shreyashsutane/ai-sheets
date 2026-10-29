import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  Check,
  BarChart3,
  Settings,
  Mic,
  MicOff,
  Wand2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AIMessage, SheetData, SelectionRange, AISettings } from '../../types/spreadsheet';
import { processAIRequest } from '../../core/ai/aiEngine';

interface AICopilotSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentSheet: SheetData;
  selection: SelectionRange;
  settings: AISettings;
  onApplyChanges: (proposed: AIMessage['proposedChanges']) => void;
  onOpenSettings: () => void;
}

const QUICK_PROMPTS = [
  { label: '🪄 Generate Sales Forecast', prompt: 'Create a regional sales forecast table for Q1-Q4 with revenue, growth % and totals' },
  { label: '📊 Analyze & Create Chart', prompt: 'Analyze this sheet, summarize key stats, and generate a chart' },
  { label: '💵 Monthly Budget Planner', prompt: 'Generate a monthly personal budget with planned vs actual spend and variance formulas' },
  { label: '⚡ Add Column Totals', prompt: 'Calculate the total and average for the numeric columns and format as currency' },
  { label: '🎨 Format & Style Table', prompt: 'Apply professional dark headers, zebra rows and formatting to this table' },
  { label: '🧹 Clean & Trim Data', prompt: 'Clean all data: trim extra whitespace and capitalize names' },
];

export const AICopilotSidebar: React.FC<AICopilotSidebarProps> = ({
  isOpen,
  onClose,
  currentSheet,
  selection,
  settings,
  onApplyChanges,
  onOpenSettings,
}) => {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `👋 **Hello! I'm your SheetAI Copilot.**\n\nI can generate data models, create formulas, build charts, clean tables, and analyze insights. You can type or **use the microphone 🎙️** to speak!`,
      timestamp: Date.now(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((res: any) => res[0].transcript)
          .join('');
        setInputValue(transcript);
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech Recognition error:', err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Please try Google Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInputValue('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  if (!isOpen) return null;

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputValue;
    if (!textToSend.trim() || isLoading) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userMessage: AIMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customPrompt) setInputValue('');
    setIsLoading(true);

    try {
      const response = await processAIRequest(textToSend, currentSheet, selection, settings);

      const aiMessage: AIMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        timestamp: Date.now(),
        proposedChanges: response.proposedChanges,
        applied: false,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Sorry, I encountered an issue processing your request: ${err.message}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (msgId: string, proposed?: AIMessage['proposedChanges']) => {
    if (!proposed) return;
    onApplyChanges(proposed);

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch {
      // ignore
    }

    setMessages((prev) =>
      prev.map((msg) => (msg.id === msgId ? { ...msg, applied: true } : msg))
    );
  };

  const getProviderLabel = () => {
    switch (settings.provider) {
      case 'gemini': return `Gemini (${settings.model || '2.0 Flash'})`;
      case 'openai': return `OpenAI (${settings.openaiModel || 'gpt-4o'})`;
      case 'claude': return `Claude (${settings.claudeModel || '3.7 Sonnet'})`;
      case 'ollama': return `Ollama (${settings.ollamaModel || 'llama3'})`;
      default: return 'Built-in Intelligent Engine';
    }
  };

  return (
    <aside
      style={{
        width: '380px',
        height: '100%',
        backgroundColor: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)',
        position: 'relative',
        zIndex: 45,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'linear-gradient(135deg, rgba(37,99,235,0.05), rgba(139,92,246,0.08))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed, #db2777)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <Sparkles size={16} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              SheetAI Copilot
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {getProviderLabel()}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            className="btn-icon"
            onClick={onOpenSettings}
            title="AI Settings & Models"
          >
            <Settings size={16} />
          </button>
          <button
            className="btn-icon"
            onClick={onClose}
            title="Close Sidebar"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Quick Prompt Chips */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          backgroundColor: 'var(--bg-surface-secondary)',
        }}
      >
        {QUICK_PROMPTS.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(qp.prompt)}
            disabled={isLoading}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 500,
              borderRadius: '12px',
              border: '1px solid var(--border-strong)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Messages Thread */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
              }}
            >
              {/* Role Header */}
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {isUser ? 'You' : 'SheetAI'}
              </div>

              {/* Message Bubble */}
              <div
                style={{
                  maxWidth: '92%',
                  padding: '10px 14px',
                  borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  fontSize: '13px',
                  lineHeight: '1.45',
                  backgroundColor: isUser ? 'var(--accent-blue)' : 'var(--bg-surface-secondary)',
                  color: isUser ? '#ffffff' : 'var(--text-primary)',
                  border: isUser ? 'none' : '1px solid var(--border-subtle)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.content}
              </div>

              {/* Proposed Changes Preview */}
              {msg.proposedChanges && (
                <div
                  style={{
                    width: '100%',
                    marginTop: '8px',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid var(--accent-blue)',
                    backgroundColor: 'var(--accent-blue-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-blue)' }}>
                      ⚡ {msg.proposedChanges.description}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(37,99,235,0.15)',
                        color: 'var(--accent-blue)',
                        fontWeight: 600,
                      }}
                    >
                      {Object.keys(msg.proposedChanges.affectedCells).length} cells
                    </span>
                  </div>

                  {msg.proposedChanges.summary && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {msg.proposedChanges.summary}
                    </div>
                  )}

                  {msg.proposedChanges.chartSuggestion && (
                    <div
                      style={{
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#7c3aed',
                        fontWeight: 600,
                      }}
                    >
                      <BarChart3 size={13} />
                      <span>Chart: {msg.proposedChanges.chartSuggestion.title} ({msg.proposedChanges.chartSuggestion.type.toUpperCase()})</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    {msg.applied ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#10b981',
                        }}
                      >
                        <Check size={14} /> Applied to sheet
                      </div>
                    ) : (
                      <button
                        className="btn-primary"
                        onClick={() => handleApply(msg.id, msg.proposedChanges)}
                        style={{
                          width: '100%',
                          justifyContent: 'center',
                          padding: '7px 12px',
                          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                        }}
                      >
                        <Check size={14} />
                        <span>Apply to Sheet</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px' }}>
            <div
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                border: '2px solid var(--accent-blue)',
                borderTopColor: 'transparent',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>SheetAI is thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box with Voice Mic */}
      <div
        style={{
          padding: '12px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        {isListening && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#ef4444', marginBottom: '6px', fontWeight: 600 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulse 1s infinite' }} />
            Listening... Speak your command now
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--bg-surface-secondary)',
            border: isListening ? '1px solid #ef4444' : '1px solid var(--border-strong)',
            borderRadius: '8px',
            padding: '4px 6px',
          }}
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isListening ? 'Listening...' : 'Ask AI or tap microphone...'}
            disabled={isLoading}
            style={{
              flex: 1,
              fontSize: '13px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              outline: 'none',
              padding: '6px 4px',
            }}
          />

          {/* Voice Microphone Button */}
          <button
            type="button"
            onClick={toggleSpeechRecognition}
            className="btn-icon"
            style={{
              color: isListening ? '#ffffff' : 'var(--text-secondary)',
              backgroundColor: isListening ? '#ef4444' : 'transparent',
              borderRadius: '50%',
              padding: '6px',
            }}
            title={isListening ? 'Stop listening' : 'Dictate with Voice'}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="btn-icon"
            style={{
              color: inputValue.trim() ? 'var(--accent-blue)' : 'var(--text-muted)',
              cursor: inputValue.trim() ? 'pointer' : 'default',
            }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.2); }
        }
      `}</style>
    </aside>
  );
};
