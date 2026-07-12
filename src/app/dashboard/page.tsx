'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getTasaBCV, TasaBCV } from '@/lib/bcv';
import { colors } from '@/lib/theme';
import { Users, Receipt, Wallet, Package, Map, TriangleAlert, CheckCircle2, Droplets, Sprout, Scissors, Bug, Shovel, CircleDollarSign } from 'lucide-react';

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function primerDiaMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function formatBs(valor: number) {
  return valor.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function saludo() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function fechaCorta(fecha: string) {
  const [y, m, d] = fecha.split('-');
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${parseInt(d, 10)} ${meses[parseInt(m, 10) - 1]}`;
}

function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    let raf: number;
    function step(ts: number) {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

const ACTIVIDAD_ICONOS: Record<string, { icon: typeof Droplets; color: string; label: string }> = {
  riego: { icon: Droplets, color: '#93C5FD', label: 'Riego' },
  fertilizacion: { icon: Sprout, color: '#4ADE80', label: 'Fertilización' },
  control_maleza: { icon: Bug, color: '#FBBF24', label: 'Control de maleza' },
  control_biologico: { icon: Bug, color: '#C4B5FD', label: 'Control biológico' },
  subsolado: { icon: Shovel, color: '#D8CBB0', label: 'Subsolado' },
  agoste: { icon: Droplets, color: '#E8C77E', label: 'Agoste' },
  tamo: { icon: Shovel, color: '#94A3B8', label: 'Saque de tamo' },
  corte: { icon: Scissors, color: '#F87171', label: 'Corte' },
  resiembro: { icon: Sprout, color: '#FB923C', label: 'Resiembro' },
  otro: { icon: Shovel, color: '#F3ECDD', label: 'Labor' },
  gasto: { icon: CircleDollarSign, color: '#E8C77E', label: 'Gasto' },
};

type ActividadItem = {
  id: string;
  tipo: string;
  fecha: string;
  detalle: string;
  monto?: number;
};

type ResumenData = {
  trabajadoresActivos: number;
  presentesHoy: number;
  faltasHoy: number;
  permisosHoy: number;
  incapacidadesHoy: number;
  gastosMesUsd: number;
  nominaPendienteCount: number;
  nominaPendienteUsd: number;
  itemsStockBajo: { nombre: string; stock_actual: number; unidad_medida: string }[];
  lotesTotal: number;
  lotesActivos: number;
  lotesEnCosecha: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<ResumenData | null>(null);
  const [tasa, setTasa] = useState<TasaBCV | null>(null);
  const [loading, setLoading] = useState(true);
  const [actividad, setActividad] = useState<ActividadItem[]>([]);
  const [loadingActividad, setLoadingActividad] = useState(true);

  const presentesAnim = useCountUp(data?.presentesHoy ?? 0);
  const gastosAnim = useCountUp(data?.gastosMesUsd ?? 0);
  const nominaAnim = useCountUp(data?.nominaPendienteUsd ?? 0);
  const stockBajoAnim = useCountUp(data?.itemsStockBajo.length ?? 0);
  const lotesAnim = useCountUp(data?.lotesTotal ?? 0);

  useEffect(() => {
    cargarResumen();
    cargarActividad();
    getTasaBCV().then(setTasa);
  }, []);

  async function cargarActividad() {
    setLoadingActividad(true);
    const [{ data: labores }, { data: gastos }] = await Promise.all([
      supabase.from('labores_tablon').select('id, tipo, subtipo, fecha, lotes(nombre)').order('fecha', { ascending: false }).limit(6),
      supabase.from('gastos').select('id, categoria, descripcion, monto_usd, fecha').order('fecha', { ascending: false }).limit(6),
    ]);

    const itemsLabor: ActividadItem[] = ((labores as unknown as Array<{ id: string; tipo: string; subtipo: string | null; fecha: string; lotes: { nombre: string } | null }>) ?? []).map((l) => ({
      id: `l-${l.id}`,
      tipo: l.tipo,
      fecha: l.fecha,
      detalle: `${l.lotes?.nombre ?? 'Tablón'}${l.subtipo ? ' · ' + l.subtipo : ''}`,
    }));

    const itemsGasto: ActividadItem[] = (gastos ?? []).map((g) => ({
      id: `g-${g.id}`,
      tipo: 'gasto',
      fecha: g.fecha,
      detalle: g.descripcion,
      monto: g.monto_usd,
    }));

    const combinado = [...itemsLabor, ...itemsGasto].sort((a, b) => (a.fecha < b.fecha ? 1 : -1)).slice(0, 8);
    setActividad(combinado);
    setLoadingActividad(false);
  }

  async function cargarResumen() {
    setLoading(true);

    const [
      { data: trabActivos },
      { data: asisHoy },
      { data: gastosMes },
      { data: nominaPendiente },
      { data: itemsInv },
      { data: lotes },
    ] = await Promise.all([
      supabase.from('trabajadores').select('id').eq('estado', 'activo'),
      supabase.from('asistencia').select('tipo').eq('fecha', hoy()),
      supabase.from('gastos').select('monto_usd').gte('fecha', primerDiaMes()),
      supabase.from('nomina').select('total_pagar').eq('estado', 'pendiente'),
      supabase.from('inventario_items').select('nombre, stock_actual, stock_minimo, unidad_medida'),
      supabase.from('lotes').select('estado'),
    ]);

    const totalActivos = trabActivos?.length ?? 0;
    const presentesHoy = asisHoy?.filter((a) => a.tipo === 'normal').length ?? 0;
    const faltasHoy = asisHoy?.filter((a) => a.tipo === 'falta').length ?? 0;
    const permisosHoy = asisHoy?.filter((a) => a.tipo === 'permiso').length ?? 0;
    const incapacidadesHoy = asisHoy?.filter((a) => a.tipo === 'incapacidad').length ?? 0;

    const gastosMesUsd = (gastosMes ?? []).reduce((sum, g) => sum + (g.monto_usd ?? 0), 0);

    const nominaPendienteCount = nominaPendiente?.length ?? 0;
    const nominaPendienteUsd = (nominaPendiente ?? []).reduce((sum, n) => sum + (n.total_pagar ?? 0), 0);

    const itemsStockBajo = (itemsInv ?? [])
      .filter((i) => i.stock_minimo != null && i.stock_minimo > 0 && i.stock_actual < i.stock_minimo)
      .map((i) => ({ nombre: i.nombre, stock_actual: i.stock_actual, unidad_medida: i.unidad_medida }));

    const lotesTotal = lotes?.length ?? 0;
    const lotesActivos = lotes?.filter((l) => l.estado === 'activo').length ?? 0;
    const lotesEnCosecha = lotes?.filter((l) => l.estado === 'en_cosecha').length ?? 0;

    setData({
      trabajadoresActivos: totalActivos,
      presentesHoy,
      faltasHoy,
      permisosHoy,
      incapacidadesHoy,
      gastosMesUsd,
      nominaPendienteCount,
      nominaPendienteUsd,
      itemsStockBajo,
      lotesTotal,
      lotesActivos,
      lotesEnCosecha,
    });
    setLoading(false);
  }

  if (loading || !data) {
    return <p style={{ color: colors.muted }}>Cargando resumen...</p>;
  }

  const statCardBase: React.CSSProperties = {
    backgroundColor: colors.bgPanel,
    border: `1px solid ${colors.border}`,
    borderRadius: '16px',
    padding: '1.25rem',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
  };

  const badgeStyle = (color: string): React.CSSProperties => ({
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${color}22`,
    color,
    marginBottom: '0.85rem',
  });

  const labelStyle: React.CSSProperties = {
    color: colors.muted,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '0.35rem',
  };

  return (
    <div>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .stat-card {
          animation: fadeSlideUp 0.6s cubic-bezier(.16,1,.3,1) both;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.28);
          border-color: rgba(232,199,126,0.3);
        }
        .stat-card:active { transform: scale(0.97); }
        .stat-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #E8C77E, transparent);
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 1.1rem;
        }
        @media (max-width: 640px) {
          .stats-grid {
            display: flex;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            gap: 0.75rem;
            margin: 0 -1.5rem;
            padding: 0.25rem 1.5rem 0.75rem;
            -webkit-overflow-scrolling: touch;
          }
          .stats-grid::-webkit-scrollbar { display: none; }
          .stat-card { flex: 0 0 78%; scroll-snap-align: center; }
          .stat-number { font-size: 1.6rem !important; }
        }
        .activity-row {
          display: flex; align-items: center; gap: 0.85rem;
          padding: 0.8rem 0;
          border-bottom: 1px solid rgba(232,199,126,0.08);
        }
        .activity-row:last-child { border-bottom: none; }
      `}</style>

      <div style={{ marginBottom: '1.75rem' }}>
        <p style={{ color: colors.gold, fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
          {saludo()}
        </p>
        <h1 style={{ color: colors.cream, fontSize: '1.85rem', margin: '0.25rem 0 0' }}>Resumen de la hacienda</h1>
        <p style={{ color: colors.muted, marginTop: '0.35rem' }}>
          {new Date().toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })}
          {tasa && <span> · Tasa BCV: Bs {formatBs(tasa.usd)}</span>}
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card" onClick={() => router.push('/dashboard/asistencia')} style={{ ...statCardBase, animationDelay: '0s' }}>
          <div style={badgeStyle(colors.success)}><Users size={18} /></div>
          <p style={labelStyle}>Trabajadores hoy</p>
          <p className="stat-number" style={{ color: colors.success, fontSize: '1.85rem', fontWeight: 700, margin: 0 }}>
            {Math.round(presentesAnim)}<span style={{ fontSize: '0.95rem', color: colors.muted, fontWeight: 400 }}> / {data.trabajadoresActivos} presentes</span>
          </p>
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
            {data.faltasHoy > 0 && <span style={{ color: colors.danger, fontSize: '0.72rem', backgroundColor: `${colors.danger}20`, padding: '0.15rem 0.5rem', borderRadius: '999px' }}>{data.faltasHoy} falta(s)</span>}
            {data.permisosHoy > 0 && <span style={{ color: colors.gold, fontSize: '0.72rem', backgroundColor: `${colors.gold}20`, padding: '0.15rem 0.5rem', borderRadius: '999px' }}>{data.permisosHoy} permiso(s)</span>}
            {data.incapacidadesHoy > 0 && <span style={{ color: colors.info, fontSize: '0.72rem', backgroundColor: `${colors.info}20`, padding: '0.15rem 0.5rem', borderRadius: '999px' }}>{data.incapacidadesHoy} incapacidad(es)</span>}
            {data.faltasHoy === 0 && data.permisosHoy === 0 && data.incapacidadesHoy === 0 && (
              <span style={{ color: colors.muted, fontSize: '0.72rem' }}>Sin novedades aún hoy</span>
            )}
          </div>
        </div>

        <div className="stat-card" onClick={() => router.push('/dashboard/gastos')} style={{ ...statCardBase, animationDelay: '0.06s' }}>
          <div style={badgeStyle(colors.gold)}><Receipt size={18} /></div>
          <p style={labelStyle}>Gastos del mes</p>
          <p className="stat-number" style={{ color: colors.gold, fontSize: '1.85rem', fontWeight: 700, margin: 0 }}>${gastosAnim.toFixed(2)}</p>
          {tasa && <p style={{ color: colors.muted, fontSize: '0.82rem', marginTop: '0.45rem' }}>≈ Bs {formatBs(data.gastosMesUsd * tasa.usd)}</p>}
        </div>

        <div className="stat-card" onClick={() => router.push('/dashboard/nomina')} style={{ ...statCardBase, animationDelay: '0.12s' }}>
          <div style={badgeStyle(data.nominaPendienteCount > 0 ? colors.danger : colors.success)}><Wallet size={18} /></div>
          <p style={labelStyle}>Nómina pendiente</p>
          <p className="stat-number" style={{ color: data.nominaPendienteCount > 0 ? colors.danger : colors.success, fontSize: '1.85rem', fontWeight: 700, margin: 0 }}>
            ${nominaAnim.toFixed(2)}
          </p>
          <p style={{ color: colors.muted, fontSize: '0.82rem', marginTop: '0.45rem' }}>
            {data.nominaPendienteCount === 0 ? 'Todo al día' : `${data.nominaPendienteCount} pago(s) por hacer`}
          </p>
        </div>

        <div className="stat-card" onClick={() => router.push('/dashboard/inventario')} style={{ ...statCardBase, animationDelay: '0.18s' }}>
          <div style={badgeStyle(data.itemsStockBajo.length === 0 ? colors.success : colors.danger)}>
            {data.itemsStockBajo.length === 0 ? <CheckCircle2 size={18} /> : <TriangleAlert size={18} />}
          </div>
          <p style={labelStyle}>Inventario</p>
          {data.itemsStockBajo.length === 0 ? (
            <p style={{ color: colors.success, fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Todo en orden</p>
          ) : (
            <>
              <p className="stat-number" style={{ color: colors.danger, fontSize: '1.85rem', fontWeight: 700, margin: 0 }}>{Math.round(stockBajoAnim)}</p>
              <p style={{ color: colors.muted, fontSize: '0.82rem', marginTop: '0.45rem' }}>
                Con stock bajo: {data.itemsStockBajo.slice(0, 3).map((i) => i.nombre).join(', ')}
                {data.itemsStockBajo.length > 3 && ` y ${data.itemsStockBajo.length - 3} más`}
              </p>
            </>
          )}
        </div>

        <div className="stat-card" onClick={() => router.push('/dashboard/lotes')} style={{ ...statCardBase, animationDelay: '0.24s' }}>
          <div style={badgeStyle(colors.cream)}><Map size={18} /></div>
          <p style={labelStyle}>Tablones</p>
          <p className="stat-number" style={{ color: colors.cream, fontSize: '1.85rem', fontWeight: 700, margin: 0 }}>{Math.round(lotesAnim)}</p>
          <p style={{ color: colors.muted, fontSize: '0.82rem', marginTop: '0.45rem' }}>
            {data.lotesActivos} activo(s){data.lotesEnCosecha > 0 && ` · ${data.lotesEnCosecha} en cosecha`}
          </p>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ color: colors.cream, fontSize: '1.15rem', marginBottom: '0.25rem' }}>Actividad reciente</h2>
        <p style={{ color: colors.muted, fontSize: '0.85rem', marginBottom: '1rem' }}>Lo último que pasó en la hacienda.</p>

        <div style={{ backgroundColor: colors.bgPanel, border: `1px solid ${colors.border}`, borderRadius: '14px', padding: '0.5rem 1.25rem' }}>
          {loadingActividad ? (
            <p style={{ color: colors.muted, padding: '1rem 0' }}>Cargando...</p>
          ) : actividad.length === 0 ? (
            <p style={{ color: colors.muted, padding: '1rem 0' }}>Todavía no hay actividad registrada.</p>
          ) : (
            actividad.map((item) => {
              const info = ACTIVIDAD_ICONOS[item.tipo] ?? ACTIVIDAD_ICONOS.otro;
              const Icon = info.icon;
              return (
                <div key={item.id} className="activity-row">
                  <div style={{ width: '34px', height: '34px', borderRadius: '9px', backgroundColor: `${info.color}20`, color: info.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: colors.cream, fontSize: '0.88rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span style={{ color: info.color, fontWeight: 600 }}>{info.label}</span> · {item.detalle}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {item.monto != null && <p style={{ color: colors.gold, fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>${item.monto.toFixed(2)}</p>}
                    <p style={{ color: colors.muted, fontSize: '0.75rem', margin: 0 }}>{fechaCorta(item.fecha)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}