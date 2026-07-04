'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Fraunces, Inter } from 'next/font/google';
import { supabase } from '@/lib/supabase';

const fraunces = Fraunces({ subsets: ['latin'], weight: ['600'] });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] });

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError('Correo o contraseña incorrectos.');
      return;
    }

    router.push('/dashboard');
  }

  return (
    <main
      className={inter.className}
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        backgroundColor: '#1F3326',
        backgroundImage: 'url(/images/cana-hero.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(15,23,17,0.55) 0%, rgba(15,23,17,0.88) 100%)',
        }}
      />

      <style>{`
        .cana-input { transition: border-color 0.2s, background-color 0.2s; }
        .cana-input:focus {
          outline: none;
          border-color: #C9974C !important;
          background-color: rgba(255,255,255,0.06) !important;
        }
        .cana-button { transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s; }
        .cana-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(201,151,76,0.35);
        }
        .cana-button:active:not(:disabled) { transform: translateY(0); }
      `}</style>

      <form
        onSubmit={handleLogin}
        style={{
          position: 'relative',
          zIndex: 1,
          backgroundColor: 'rgba(31,51,38,0.65)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(232,199,126,0.2)',
          padding: '3rem 2.5rem',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '380px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '0.25rem' }}>
          <h1 className={fraunces.className} style={{ color: '#F3ECDD', fontSize: '2rem', margin: 0, letterSpacing: '0.01em' }}>
            Caña ERP
          </h1>
          <svg width="120" height="10" viewBox="0 0 120 10" style={{ margin: '0.75rem auto 0', display: 'block' }}>
            <line x1="0" y1="5" x2="120" y2="5" stroke="#C9974C" strokeWidth="1" opacity="0.6" />
            <path d="M55 5 L58 0 M60 5 L60 0 M65 5 L62 0" stroke="#C9974C" strokeWidth="1" opacity="0.8" fill="none" />
          </svg>
          <p style={{ color: '#C9974C', fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '0.6rem' }}>
            Hacienda Digital
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ color: '#D8CBB0', fontSize: '0.85rem', fontWeight: 500 }}>Correo</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="cana-input"
            style={{ padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(216,203,176,0.25)', backgroundColor: 'rgba(255,255,255,0.04)', color: '#F3ECDD', fontSize: '1rem' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ color: '#D8CBB0', fontSize: '0.85rem', fontWeight: 500 }}>Contraseña</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="cana-input"
            style={{ padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(216,203,176,0.25)', backgroundColor: 'rgba(255,255,255,0.04)', color: '#F3ECDD', fontSize: '1rem' }}
          />
        </div>

        {error && <p style={{ color: '#F5A3A3', fontSize: '0.85rem', margin: 0 }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="cana-button"
          style={{
            marginTop: '0.5rem',
            padding: '0.85rem',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #E8C77E 0%, #C9974C 100%)',
            color: '#1F3326',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}