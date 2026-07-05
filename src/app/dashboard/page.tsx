'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getTasaBCV, TasaBCV } from '@/lib/bcv';

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

  useEffect(() => {
    cargarResumen();
    getTasaBCV().then(setTasa);
  }, []);

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
    return <p style={{ color: '#94a3b8' }}>Cargando resumen...</p>;
  }

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#1F3326',
    border: '1px solid rgba(232,199,126,0.15)',
    borderRadius: '12px',
    padding: '1.5rem',
    cursor: 'pointer',
  };

  const labelStyle: React.CSSProperties = {
    color: '#D8CBB0',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.5rem',
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#F3ECDD', fontSize: '1.75rem', margin: 0 }}>Resumen de la hacienda</h1>
        <p style={{ color: '#94a3b8', marginTop: '0.25rem' }}>
          {new Date().toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })}
          {tasa && <span> · Tasa BCV: Bs {formatBs(tasa.usd)}</span>}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
        <div onClick={() => router.push('/dashboard/asistencia')} style={cardStyle}>
          <p style={labelStyle}>Trabajadores hoy</p>
          <p style={{ color: '#4ADE80', fontSize: '2rem', fontWeight: 700, margin: 0 }}>
            {data.presentesHoy}<span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 400 }}> / {data.trabajadoresActivos} presentes</span>
          </p>
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
            {data.faltasHoy > 0 && <span style={{ color: '#F87171', fontSize: '0.75rem', backgroundColor: 'rgba(248,113,113,0.12)', padding: '0.2rem 0.5rem', borderRadius: '999px' }}>{data.faltasHoy} falta(s)</span>}
            {data.permisosHoy > 0 && <span style={{ color: '#E8C77E', fontSize: '0.75rem', backgroundColor: 'rgba(232,199,126,0.12)', padding: '0.2rem 0.5rem', borderRadius: '999px' }}>{data.permisosHoy} permiso(s)</span>}
            {data.incapacidadesHoy > 0 && <span style={{ color: '#93C5FD', fontSize: '0.75rem', backgroundColor: 'rgba(147,197,253,0.12)', padding: '0.2rem 0.5rem', borderRadius: '999px' }}>{data.incapacidadesHoy} incapacidad(es)</span>}
            {data.faltasHoy === 0 && data.permisosHoy === 0 && data.incapacidadesHoy === 0 && (
              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Sin novedades aún hoy</span>
            )}
          </div>
        </div>

        <div onClick={() => router.push('/dashboard/gastos')} style={cardStyle}>
          <p style={labelStyle}>Gastos del mes</p>
          <p style={{ color: '#E8C77E', fontSize: '2rem', fontWeight: 700, margin: 0 }}>${data.gastosMesUsd.toFixed(2)}</p>
          {tasa && <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.4rem' }}>≈ Bs {formatBs(data.gastosMesUsd * tasa.usd)}</p>}
        </div>

        <div onClick={() => router.push('/dashboard/nomina')} style={cardStyle}>
          <p style={labelStyle}>Nómina pendiente</p>
          <p style={{ color: data.nominaPendienteCount > 0 ? '#F87171' : '#4ADE80', fontSize: '2rem', fontWeight: 700, margin: 0 }}>
            ${data.nominaPendienteUsd.toFixed(2)}
          </p>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.4rem' }}>
            {data.nominaPendienteCount === 0 ? 'Todo al día' : `${data.nominaPendienteCount} pago(s) por hacer`}
          </p>
        </div>

        <div onClick={() => router.push('/dashboard/inventario')} style={cardStyle}>
          <p style={labelStyle}>Inventario</p>
          {data.itemsStockBajo.length === 0 ? (
            <p style={{ color: '#4ADE80', fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Todo en orden</p>
          ) : (
            <>
              <p style={{ color: '#F87171', fontSize: '2rem', fontWeight: 700, margin: 0 }}>{data.itemsStockBajo.length}</p>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.4rem' }}>
                Con stock bajo: {data.itemsStockBajo.slice(0, 3).map((i) => i.nombre).join(', ')}
                {data.itemsStockBajo.length > 3 && ` y ${data.itemsStockBajo.length - 3} más`}
              </p>
            </>
          )}
        </div>

        <div onClick={() => router.push('/dashboard/lotes')} style={cardStyle}>
          <p style={labelStyle}>Lotes</p>
          <p style={{ color: '#F3ECDD', fontSize: '2rem', fontWeight: 700, margin: 0 }}>{data.lotesTotal}</p>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.4rem' }}>
            {data.lotesActivos} activo(s){data.lotesEnCosecha > 0 && ` · ${data.lotesEnCosecha} en cosecha`}
          </p>
        </div>
      </div>
    </div>
  );
}