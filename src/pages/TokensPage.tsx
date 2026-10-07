import { useState, useEffect, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import {
  FiPlus, FiTrash2, FiX, FiAlertCircle, FiArrowLeft, FiKey, FiCopy, FiCheck
} from 'react-icons/fi';

interface TokenRow {
  id: string;
  name: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export default function TokensPage() {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [newToken, setNewToken] = useState('');
  const [copied, setCopied] = useState(false);

  const [formName, setFormName] = useState('');
  const [formExpiry, setFormExpiry] = useState('');

  const loadTokens = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiService.getTokens();
      setTokens(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading tokens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTokens();
  }, []);

  const openCreate = () => {
    setFormName('');
    setFormExpiry('');
    setShowCreateModal(true);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const result = await apiService.createToken({
        name: formName,
        expiresAt: formExpiry || undefined,
      });
      setShowCreateModal(false);
      setNewToken(result.token);
      setShowTokenModal(true);
      loadTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating token');
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this token? This cannot be undone.')) return;
    try {
      await apiService.revokeToken(id);
      loadTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error revoking token');
    }
  };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US') : '-';
  const formatDateTime = (d: string | null) => d ? new Date(d).toLocaleString('en-US') : 'Never';

  return (
    <div className="app-container" style={{ flexDirection: 'column' }}>
      <header style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem 2rem',
        borderBottom: '1px solid rgba(51, 65, 85, 0.4)',
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(12px)',
      }}>
        <Link to="/projects" className="btn-secondary" style={{ padding: '0.5rem 0.75rem' }}>
          <FiArrowLeft size={16} />
        </Link>
        <FiKey size={20} style={{ color: 'var(--color-accent)' }} />
        <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'white', flex: 1 }}>
          Personal Access Tokens
        </h1>
        <button className="btn-primary" onClick={openCreate}>
          <FiPlus size={16} />
          <span>New token</span>
        </button>
      </header>

      <main style={{ flex: 1, padding: '2rem', overflow: 'auto' }}>
        <p style={{ color: 'var(--color-dark-500)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          Personal access tokens are used to authenticate with the CLI. Treat them like passwords.
        </p>

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1rem', marginBottom: '1rem',
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '0.5rem', color: '#fca5a5', fontSize: '0.875rem',
          }}>
            <FiAlertCircle size={16} /> {error}
          </div>
        )}

        {loading ? (
          <div style={{ color: 'var(--color-dark-500)', textAlign: 'center', padding: '4rem' }}>
            Loading tokens...
          </div>
        ) : (
          <div style={{
            background: 'rgba(30, 41, 59, 0.3)',
            border: '1px solid rgba(51, 65, 85, 0.4)',
            borderRadius: '0.75rem',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(30, 41, 59, 0.5)' }}>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Last used</th>
                  <th style={thStyle}>Expires</th>
                  <th style={thStyle}>Created</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((t) => (
                  <tr key={t.id} style={{ borderTop: '1px solid rgba(51, 65, 85, 0.3)' }}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FiKey size={14} style={{ color: 'var(--color-dark-500)' }} />
                        {t.name}
                      </div>
                    </td>
                    <td style={tdStyle}>{formatDateTime(t.lastUsedAt)}</td>
                    <td style={tdStyle}>
                      {t.expiresAt ? (
                        <span style={{
                          color: new Date(t.expiresAt) < new Date() ? '#ef4444' : 'inherit'
                        }}>
                          {formatDate(t.expiresAt)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-dark-500)' }}>Never</span>
                      )}
                    </td>
                    <td style={tdStyle}>{formatDate(t.createdAt)}</td>
                    <td style={tdStyle}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.375rem 0.5rem', color: '#ef4444' }}
                        onClick={() => handleRevoke(t.id)}
                        title="Revoke token"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {tokens.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-dark-500)' }}>
                      No tokens created yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* CLI Usage Example */}
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          background: 'rgba(30, 41, 59, 0.3)',
          border: '1px solid rgba(51, 65, 85, 0.4)',
          borderRadius: '0.75rem',
        }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>CLI Usage</h3>
          <code style={{
            display: 'block',
            padding: '0.75rem',
            background: 'rgba(15, 23, 42, 0.5)',
            borderRadius: '0.5rem',
            fontSize: '0.8125rem',
            color: '#94a3b8',
            overflowX: 'auto',
          }}>
            curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/cli/flows
          </code>
        </div>
      </main>

      {/* Create Token Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)} role="none">
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '28rem' }} role="none">
            <div className="modal-header">
              <h2>Create token</h2>
              <button className="btn-icon" onClick={() => setShowCreateModal(false)}>
                <FiX size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>
                  Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., CI Pipeline"
                  required
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={labelStyle}>Expiration (optional)</label>
                <input
                  type="date"
                  value={formExpiry}
                  onChange={(e) => setFormExpiry(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={!formName.trim()}>
                  Create token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Show Token Modal (one-time display) */}
      {showTokenModal && (
        <div className="modal-overlay" role="none">
          <div className="modal-content" style={{ maxWidth: '32rem' }} role="dialog">
            <div className="modal-header">
              <h2>Token created</h2>
            </div>
            <div className="modal-body">
              <div style={{
                padding: '1rem',
                background: 'rgba(52, 211, 153, 0.1)',
                border: '1px solid rgba(52, 211, 153, 0.2)',
                borderRadius: '0.5rem',
                marginBottom: '1rem',
              }}>
                <p style={{ fontSize: '0.875rem', color: '#34d399', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Copy this token now. You won't be able to see it again!
                </p>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                background: 'rgba(15, 23, 42, 0.5)',
                borderRadius: '0.5rem',
                border: '1px solid rgba(51, 65, 85, 0.4)',
              }}>
                <code style={{
                  flex: 1,
                  fontSize: '0.8125rem',
                  color: '#e2e8f0',
                  wordBreak: 'break-all',
                }}>
                  {newToken}
                </code>
                <button
                  className="btn-secondary"
                  onClick={handleCopy}
                  style={{ padding: '0.5rem', flexShrink: 0 }}
                  title="Copy to clipboard"
                >
                  {copied ? <FiCheck size={16} style={{ color: '#34d399' }} /> : <FiCopy size={16} />}
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-primary"
                onClick={() => {
                  setShowTokenModal(false);
                  setNewToken('');
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.75rem 1rem',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--color-dark-500)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  fontSize: '0.875rem',
  color: 'var(--color-dark-300)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8125rem',
  fontWeight: 500,
  color: 'var(--color-dark-400)',
  marginBottom: '0.375rem',
};
