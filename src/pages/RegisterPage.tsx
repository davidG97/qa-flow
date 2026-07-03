import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiMail, FiLock, FiUser, FiAlertCircle } from 'react-icons/fi';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, name || undefined);
      navigate('/projects');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem 0.875rem 0.625rem 2.25rem',
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(51, 65, 85, 0.4)',
    borderRadius: '0.75rem',
    fontSize: '0.9375rem',
    color: '#f1f5f9',
    outline: 'none',
    transition: 'all 150ms',
  };

  const iconStyle: React.CSSProperties = {
    position: 'absolute',
    left: '0.875rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#64748b',
    pointerEvents: 'none',
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #020617 0%, #0f172a 100%)',
      padding: '1rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: '1px solid rgba(51, 65, 85, 0.4)',
        borderRadius: '1rem',
        padding: '2.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/logo.png" alt="QA Flow" width="64" height="64" style={{ display: 'block', margin: '0 auto 1rem auto', borderRadius: '0.75rem' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>
            QA Flow
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
            Crea tu cuenta gratis
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '0.5rem',
            color: '#fca5a5',
            fontSize: '0.875rem',
            marginBottom: '1.25rem',
          }}>
            <FiAlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <FiUser size={16} style={iconStyle} />
            <input
              type="text"
              placeholder="Nombre (opcional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <FiMail size={16} style={iconStyle} />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <FiLock size={16} style={iconStyle} />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#64748b', fontSize: '0.875rem' }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 500 }}>
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
