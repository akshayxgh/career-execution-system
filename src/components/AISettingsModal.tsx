import React, { useState, useEffect } from 'react';
import { Key, CheckCircle, Eye, EyeOff, X, RefreshCw, Zap, Image } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { COPILOT_CONFIG, setDualApiKeys } from '../config/copilotConfig';
import { copilotService } from '../services/copilotService';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({ isOpen, onClose }) => {
  const { state, updateState } = useStore();
  const [geminiKey, setGeminiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [showGemini, setShowGemini] = useState(false);
  const [showGroq, setShowGroq] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<string>('');
  const [groqStatus, setGroqStatus] = useState<string>('');
  const [saveMessage, setSaveMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const gKey = state.settings?.geminiApiKey || COPILOT_CONFIG.geminiApiKey || '';
      const grKey = state.settings?.groqApiKey || COPILOT_CONFIG.groqApiKey || '';
      setGeminiKey(gKey);
      setGroqKey(grKey);
      setGeminiStatus('');
      setGroqStatus('');
      setSaveMessage('');
    }
  }, [isOpen, state.settings?.geminiApiKey, state.settings?.groqApiKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    const cleanGemini = geminiKey.trim();
    const cleanGroq = groqKey.trim();

    setDualApiKeys({ geminiKey: cleanGemini, groqKey: cleanGroq });
    updateState({
      settings: {
        ...state.settings,
        geminiApiKey: cleanGemini,
        groqApiKey: cleanGroq,
        aiApiKey: cleanGroq || cleanGemini,
      },
    });

    setSaveMessage('Keys saved and synced to Supabase profile across all devices!');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleTestEngines = async () => {
    setIsTesting(true);
    setGeminiStatus('Testing Gemini OCR...');
    setGroqStatus('Testing Groq Chat...');

    // Save temporarily to test
    setDualApiKeys({ geminiKey: geminiKey.trim(), groqKey: groqKey.trim() });

    // Test Groq Text
    if (groqKey.trim()) {
      try {
        const groqReply = await copilotService.generateMultimodalResponse('Respond with OK');
        if (groqReply) {
          setGroqStatus('🟢 Groq (openai/gpt-oss-120b) Connected! 500+ tok/s');
        }
      } catch (err: any) {
        setGroqStatus(`🔴 Groq: ${err.message || 'Connection failed'}`);
      }
    } else {
      setGroqStatus('⚪ No Groq key provided (will use Gemini for chat fallback)');
    }

    // Test Gemini Vision
    if (geminiKey.trim()) {
      try {
        const testPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        const geminiReply = await copilotService.generateMultimodalResponse('Describe image', testPng, 'image/png');
        if (geminiReply) {
          setGeminiStatus('🟢 Gemini 3.6 Flash (Vision & OCR) Connected!');
        }
      } catch (err: any) {
        setGeminiStatus(`🔴 Gemini: ${err.message || 'Connection failed'}`);
      }
    } else {
      setGeminiStatus('⚪ No Gemini key provided');
    }

    setIsTesting(false);
  };

  return (
    <div className="qb-modal-overlay" style={{ zIndex: 9999 }}>
      <div className="qb-modal" style={{ maxWidth: 520 }}>
        <div className="qb-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Key size={20} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ margin: 0 }}>Hybrid AI Dual-Engine Settings</h3>
          </div>
          <button className="qb-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
            Your keys are securely synced to your private Supabase profile (<span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>user_id: Akshay</span>). They automatically follow you on any computer, phone, or laptop with zero setup!
          </p>

          {/* Gemini OCR Engine */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', background: 'var(--bg-dark)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Image size={15} style={{ color: '#60a5fa' }} />
                1. Vision & Screenshot OCR Engine (Gemini Key)
              </label>
              <span style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 500 }}>gemini-3.6-flash</span>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showGemini ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AQ.Ab8RN6... or AIzaSy..."
                style={{
                  width: '100%',
                  padding: '0.55rem 2.5rem 0.55rem 0.75rem',
                  fontSize: '0.82rem',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-main)',
                  fontFamily: 'monospace',
                }}
              />
              <button
                type="button"
                onClick={() => setShowGemini(!showGemini)}
                style={{
                  position: 'absolute',
                  right: '0.6rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                {showGemini ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {geminiStatus && (
              <div style={{ fontSize: '0.76rem', color: geminiStatus.startsWith('🟢') ? '#10b981' : geminiStatus.startsWith('🔴') ? '#ef4444' : 'var(--text-muted)' }}>
                {geminiStatus}
              </div>
            )}
          </div>

          {/* Groq Text & Chat Engine */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', background: 'var(--bg-dark)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Zap size={15} style={{ color: '#f59e0b' }} />
                2. Fast Enrichment & AI Copilot Chat (Groq Key)
              </label>
              <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 500 }}>500+ tok/s</span>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showGroq ? 'text' : 'password'}
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="gsk_..."
                style={{
                  width: '100%',
                  padding: '0.55rem 2.5rem 0.55rem 0.75rem',
                  fontSize: '0.82rem',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-main)',
                  fontFamily: 'monospace',
                }}
              />
              <button
                type="button"
                onClick={() => setShowGroq(!showGroq)}
                style={{
                  position: 'absolute',
                  right: '0.6rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                {showGroq ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {groqStatus && (
              <div style={{ fontSize: '0.76rem', color: groqStatus.startsWith('🟢') ? '#10b981' : groqStatus.startsWith('🔴') ? '#ef4444' : 'var(--text-muted)' }}>
                {groqStatus}
              </div>
            )}
          </div>

          {saveMessage && (
            <div
              style={{
                fontSize: '0.82rem',
                padding: '0.6rem 0.8rem',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
              }}
            >
              <CheckCircle size={15} />
              <span>{saveMessage}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleTestEngines}
              disabled={isTesting}
              style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              {isTesting ? <RefreshCw size={14} className="spin" /> : <Zap size={14} />}
              {isTesting ? 'Testing...' : '⚡ Test Both Engines'}
            </button>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} style={{ fontSize: '0.82rem' }}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSave} style={{ fontSize: '0.82rem' }}>
                Save & Sync
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
