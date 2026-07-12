'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/login');
        return;
      }
      setEmail(data.session.user.email ?? '');
      setChecking(false);
    }
    checkSession();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1F3326', color: '#F3ECDD', fontFamily: 'sans-serif' }}>
        Verificando sesión...
      </div>
    );
  }

  const navItems = [
    { href: '/dashboard', label: 'Resumen' },
    { href: '/dashboard/lotes', label: 'Tablones' },
    { href: '/dashboard/labores', label: 'Labores' },
    { href: '/dashboard/expediente', label: 'Expediente' },
    { href: '/dashboard/trabajadores', label: 'Trabajadores' },
    { href: '/dashboard/asistencia', label: 'Asistencia' },
    { href: '/dashboard/inventario', label: 'Inventario' },
    { href: '/dashboard/nomina', label: 'Nómina' },
    { href: '/dashboard/gastos', label: 'Gastos' },
    { href: '/dashboard/clima', label: 'Clima' },
    { href: '/dashboard/infraestructura', label: 'Infraestructura' },
    { href: '/dashboard/hacienda', label: 'Mi Hacienda' },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        fontFamily: 'sans-serif',
        backgroundImage: 'linear-gradient(180deg, rgba(15,23,17,0.93) 0%, rgba(15,23,17,0.97) 100%), url(/images/cana-hero.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <header
        style={{
          backgroundColor: 'rgba(31,51,38,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(232,199,126,0.15)',
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <span style={{ color: '#F3ECDD', fontSize: '1.25rem', fontWeight: 700 }}>Caña ERP</span>
          <nav style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
            {navItems.map((item) => (
              <div
                key={item.href}
                onClick={() => router.push(item.href)}
                style={{
                  color: pathname === item.href ? '#E8C77E' : '#D8CBB0',
                  fontWeight: pathname === item.href ? 600 : 400,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  paddingBottom: '0.25rem',
                  borderBottom: pathname === item.href ? '2px solid #E8C77E' : '2px solid transparent',
                }}
              >
                {item.label}
              </div>
            ))}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{email}</span>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid rgba(232,199,126,0.3)',
              backgroundColor: 'transparent',
              color: '#F3ECDD',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </header>
      <main style={{ padding: '2rem' }}>{children}</main>
    </div>
  );
}