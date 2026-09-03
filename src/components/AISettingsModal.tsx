import React, { useState, useEffect } from 'react';
import { Key, CheckCircle, AlertCircle, Eye, EyeOff, X, RefreshCw } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { COPILOT_CONFIG, setCustomApiKey } from '../config/copilotConfig';
import { copilotService } from '../services/copilotService';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({ isOpen, onClose }) => {
  const { state, updateState } = useStore();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      const current = state.settings?.aiApiKey || COPILOT_CONFIG.apiKey || '';
      setApiKey(current);
      setStatus('idle');
      setStatusMessage('');
    }
  }, [isOpen, state.settings?.aiApiKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    const clean = apiKey.trim();
    setCustomApiKey(clean);
    updateState({
      settings: {
        ...state.settings,
        aiApiKey: clean,
      },
    });
    setStatus('success');
    setStatusMessage('Key saved and synced to Supabase across all your devices!');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleTestConnection = async () => {
    const clean = apiKey.trim();
    if (!clean) {
      setStatus('error');
      setStatusMessage('Please enter an API key first.');
      return;
    }

    try {
      setStatus('testing');
      setStatusMessage('Testing connection with provider...');
      setCustomApiKey(clean);

      const reply = await copilotService.generateMultimodalResponse('Respond with OK');
      if (reply) {
        setStatus('success');
        setStatusMessage(`Connected successfully! Provider: ${COPILOT_CONFIG.provider} (${COPILOT_CONFIG.model})`);
      }
    } catch (err: any) {
      setStatus('error');
      setStatusMessage(err.message || 'Failed to connect. Please verify your key.');
    }
  };

  return (
    <div className="qb-modal-overlay" style={{ zIndex: 9999 }}>
      <div className="qb-modal" style={{ maxWidth: 480 }}>
        <div className="qb-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Key size={20} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ margin: 0 }}>AI Copilot Key Settings</h3>
          </div>
          <button className="qb-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            Your API key is securely synced to your private Supabase profile. It will automatically follow you on any computer, phone, or laptop!
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
              API Key (Gemini, Groq, or OpenRouter)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AQ.Ab8... or gsk_... or sk-..."
                style={{
                  width: '100%',
                  padding: '0.65rem 2.5rem 0.65rem 0.75rem',
                  fontSize: '0.85rem',
                  background: 'var(--bg-dark)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-main)',
                  fontFamily: 'monospace',
                }}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
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
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {statusMessage && (
            <div
              style={{
                fontSize: '0.82rem',
                padding: '0.6rem 0.8rem',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background:
                  status === 'success'
                    ? 'rgba(16, 185, 129, 0.12)'
                    : status === 'error'
                    ? 'rgba(239, 68, 68, 0.12)'
                    : 'rgba(99, 102, 241, 0.12)',
                color:
                  status === 'success'
                    ? '#10b981'
                    : status === 'error'
                    ? '#ef4444'
                    : 'var(--accent-primary)',
              }}
            >
              {status === 'testing' && <RefreshCw size={14} className="spin" />}
              {status === 'success' && <CheckCircle size={14} />}
              {status === 'error' && <AlertCircle size={14} />}
              <span>{statusMessage}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleTestConnection}
              disabled={status === 'testing'}
              style={{ fontSize: '0.82rem' }}
            >
              ⚡ Test Connection
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
