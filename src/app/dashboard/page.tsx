'use client';

import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();

  return (
    <div>
      <h1 style={{ color: '#F3ECDD', fontSize: '1.75rem', margin: 0 }}>Resumen de la hacienda</h1>
      <p style={{ color: '#94a3b8', marginTop: '0.5rem', marginBottom: '2rem' }}>
        Aquí vas a ver el estado general de la finca de un vistazo. Por ahora, empieza por registrar tus lotes.
      </p>
      <div
        onClick={() => router.push('/dashboard/lotes')}
        style={{
          backgroundColor: '#1F3326',
          border: '1px solid rgba(232,199,126,0.2)',
          borderRadius: '12px',
          padding: '1.5rem',
          maxWidth: '280px',
          cursor: 'pointer',
        }}
      >
        <p style={{ color: '#E8C77E', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
          Módulo
        </p>
        <p style={{ color: '#F3ECDD', fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Lotes →</p>
      </div>
    </div>
  );
}