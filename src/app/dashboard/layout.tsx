'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard, Map, ClipboardList, FileText, Users, CalendarCheck,
  Package, Wallet, Receipt, CloudSun, Building2, Settings, Menu, X, LogOut,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Resumen', icon: LayoutDashboard },
  { href: '/dashboard/lotes', label: 'Tablones', icon: Map },
  { href: '/dashboard/labores', label: 'Labores', icon: ClipboardList },
  { href: '/dashboard/expediente', label: 'Expediente', icon: FileText },
  { href: '/dashboard/trabajadores', label: 'Trabajadores', icon: Users },
  { href: '/dashboard/asistencia', label: 'Asistencia', icon: CalendarCheck },
  { href: '/dashboard/inventario', label: 'Inventario', icon: Package },
  { href: '/dashboard/nomina', label: 'Nómina', icon: Wallet },
  { href: '/dashboard/gastos', label: 'Gastos', icon: Receipt },
  { href: '/dashboard/clima', label: 'Clima', icon: CloudSun },
  { href: '/dashboard/infraestructura', label: 'Infraestructura', icon: Building2 },
  { href: '/dashboard/hacienda', label: 'Mi Hacienda', icon: Settings },
];

function CanaMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="15" cy="15" r="13" stroke="#C9974C" strokeWidth="1.2" opacity="0.4" />
      <circle cx="15" cy="15" r="9" stroke="#E8C77E" strokeWidth="1.4" opacity="0.75" />
      <circle cx="15" cy="15" r="5" stroke="#C9974C" strokeWidth="1.6" />
      <circle cx="15" cy="15" r="1.6" fill="#E8C77E" />
    </svg>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  function irA(href: string) {
    router.push(href);
    setDrawerOpen(false);
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', backgroundColor: '#0F1A13', color: '#F3ECDD', fontFamily: 'sans-serif' }}>
        <CanaMark />
        <span>Verificando sesión...</span>
      </div>
    );
  }

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
      <style>{`
        .nav-desktop { display: flex; }
        .nav-mobile-btn { display: none; }
        @media (max-width: 880px) {
          .nav-desktop { display: none; }
          .nav-mobile-btn { display: flex; }
        }
        .nav-item-desktop {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding-bottom: 5px;
          cursor: pointer;
          white-space: nowrap;
        }
        .nav-item-desktop::after {
          content: '';
          position: absolute;
          left: 50%;
          bottom: 0;
          height: 2px;
          width: 0;
          background: #E8C77E;
          transition: width 0.25s ease, left 0.25s ease;
          transform: translateX(-50%);
        }
        .nav-item-desktop:hover::after,
        .nav-item-desktop.active::after {
          width: 100%;
        }
        .nav-drawer-backdrop {
          position: fixed; inset: 0;
          background: rgba(6,10,7,0.65);
          backdrop-filter: blur(2px);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.25s ease;
          z-index: 100;
        }
        .nav-drawer-backdrop.open { opacity: 1; pointer-events: auto; }
        .nav-drawer {
          position: fixed; top: 0; right: 0; height: 100%;
          width: min(86vw, 320px);
          background: linear-gradient(180deg, #1B2E22 0%, #12201A 100%);
          border-left: 1px solid rgba(232,199,126,0.15);
          transform: translateX(100%);
          transition: transform 0.32s cubic-bezier(.4,0,.2,1);
          z-index: 101;
          display: flex;
          flex-direction: column;
          box-shadow: -24px 0 60px rgba(0,0,0,0.45);
        }
        .nav-drawer.open { transform: translateX(0); }
        .nav-drawer-item {
          display: flex; align-items: center; gap: 0.9rem;
          padding: 0.85rem 1.25rem;
          color: #D8CBB0;
          border-left: 3px solid transparent;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .nav-drawer-item:active { background: rgba(232,199,126,0.08); }
        .nav-drawer-item.active {
          color: #E8C77E;
          background: rgba(232,199,126,0.08);
          border-left-color: #E8C77E;
          font-weight: 600;
        }
        .icon-btn {
          display: flex; align-items: center; justify-content: center;
          width: 40px; height: 40px;
          border-radius: 10px;
          border: 1px solid rgba(232,199,126,0.2);
          background: transparent;
          color: #F3ECDD;
          cursor: pointer;
        }
        .icon-btn:active { background: rgba(232,199,126,0.1); }
      `}</style>

      <header
        style={{
          backgroundColor: 'rgba(27,46,34,0.88)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: '1px solid rgba(232,199,126,0.15)',
          padding: '0.9rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
          <button className="icon-btn nav-mobile-btn" onClick={() => setDrawerOpen(true)} aria-label="Abrir menú">
            <Menu size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CanaMark />
            <span style={{ color: '#F3ECDD', fontSize: '1.15rem', fontWeight: 700, letterSpacing: '0.01em' }}>Caña ERP</span>
          </div>

          <nav className="nav-desktop" style={{ gap: '1.4rem', marginLeft: '1rem' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <div
                  key={item.href}
                  className={`nav-item-desktop${active ? ' active' : ''}`}
                  onClick={() => irA(item.href)}
                  style={{ color: active ? '#E8C77E' : '#D8CBB0', fontWeight: active ? 600 : 400, fontSize: '0.85rem' }}
                >
                  <Icon size={15} />
                  {item.label}
                </div>
              );
            })}
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <span className="nav-desktop" style={{ color: '#94a3b8', fontSize: '0.82rem' }}>{email}</span>
          <button
            onClick={handleLogout}
            className="nav-desktop"
            style={{
              alignItems: 'center', gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid rgba(232,199,126,0.3)',
              backgroundColor: 'transparent',
              color: '#F3ECDD',
              cursor: 'pointer',
              fontSize: '0.82rem',
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className={`nav-drawer-backdrop${drawerOpen ? ' open' : ''}`} onClick={() => setDrawerOpen(false)} />
      <div className={`nav-drawer${drawerOpen ? ' open' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.1rem 1.25rem', borderBottom: '1px solid rgba(232,199,126,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CanaMark />
            <span style={{ color: '#F3ECDD', fontSize: '1.05rem', fontWeight: 700 }}>Caña ERP</span>
          </div>
          <button className="icon-btn" onClick={() => setDrawerOpen(false)} aria-label="Cerrar menú">
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <div key={item.href} className={`nav-drawer-item${active ? ' active' : ''}`} onClick={() => irA(item.href)}>
                <Icon size={18} />
                <span style={{ fontSize: '0.92rem' }}>{item.label}</span>
              </div>
            );
          })}
        </div>

        <div style={{ borderTop: '1px solid rgba(232,199,126,0.12)', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.78rem', wordBreak: 'break-all' }}>{email}</span>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              padding: '0.7rem',
              borderRadius: '10px',
              border: '1px solid rgba(232,199,126,0.3)',
              backgroundColor: 'transparent',
              color: '#F3ECDD',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </div>

      <main style={{ padding: '1.5rem' }}>{children}</main>
    </div>
  );
}