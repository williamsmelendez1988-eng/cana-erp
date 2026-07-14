'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Tablon = {
  id: string;
  nombre: string;
  variedad: string | null;
  tipo_ciclo: string | null;
  numero_soca: number | null;
  area_hectareas: number | null;
};

type AsistenciaConSalario = {
  trabajador_id: string;
  lote_ids: string[] | null;
  trabajadores: { salario_diario_usd: number | null } | null;
};

type ItemLinea =
  | { kind: 'labor'; fecha: string; tipo: string; subtipo: string | null; toneladas: number | null; responsable: string | null; notas: string | null }
  | { kind: 'gasto'; fecha: string; categoria: string; descripcion: string; monto_usd: number };

const TIPO_LABOR_INFO: Record<string, { label: string; color: string; bg: string }> = {
  riego: { label: 'Riego', color: '#93C5FD', bg: 'rgba(147,197,253,0.15)' },
  fertilizacion: { label: 'Fertilización', color: '#4ADE80', bg: 'rgba(74,222,128,0.15)' },
  control_maleza: { label: 'Control de maleza', color: '#FBBF24', bg: 'rgba(251,191,36,0.15)' },
  control_biologico: { label: 'Control biológico', color: '#C4B5FD', bg: 'rgba(196,181,253,0.15)' },
  subsolado: { label: 'Subsolado', color: '#D8CBB0', bg: 'rgba(216,203,176,0.12)' },
  agoste: { label: 'Agoste', color: '#E8C77E', bg: 'rgba(232,199,126,0.15)' },
  tamo: { label: 'Saque de tamo', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
  corte: { label: 'Corte / Cosecha', color: '#F87171', bg: 'rgba(248,113,113,0.15)' },
  resiembro: { label: 'Resiembro', color: '#FB923C', bg: 'rgba(251,146,60,0.15)' },
  otro: { label: 'Otra labor', color: '#F3ECDD', bg: 'rgba(243,236,221,0.08)' },
};

const CATEGORIA_GASTO_LABELS: Record<string, string> = {
  sueldos: 'Sueldos',
  mano_obra_contratada: 'Mano de obra contratada',
  combustible: 'Combustible',
  electricidad: 'Electricidad',
  repuestos: 'Repuestos',
  fertilizantes: 'Fertilizantes',
  herramientas: 'Herramientas',
  servicios: 'Servicios',
  otros: 'Otros',
};

const inputStyle: React.CSSProperties = {
  padding: '0.65rem 0.9rem',
  borderRadius: '8px',
  border: '1px solid rgba(216,203,176,0.25)',
  backgroundColor: 'rgba(255,255,255,0.04)',
  color: '#F3ECDD',
  fontSize: '0.95rem',
  fontFamily: 'inherit',
};

function labelCiclo(t: Tablon): string {
  if (!t.tipo_ciclo) return '';
  if (t.tipo_ciclo === 'planta') return 'Caña planta';
  return `Soca ${t.numero_soca ?? '?'}`;
}

export default function ExpedientePage() {
  const [tablones, setTablones] = useState<Tablon[]>([]);
  const [tablonId, setTablonId] = useState('');
  const [loadingTablones, setLoadingTablones] = useState(true);
  const [loadingDatos, setLoadingDatos] = useState(false);

  const [gastoDirecto, setGastoDirecto] = useState(0);
  const [costoManoObra, setCostoManoObra] = useState(0);
  const [totalToneladas, setTotalToneladas] = useState(0);
  const [linea, setLinea] = useState<ItemLinea[]>([]);

  useEffect(() => {
    cargarTablones();
  }, []);

  useEffect(() => {
    if (tablonId) cargarExpediente(tablonId);
  }, [tablonId]);

  async function cargarTablones() {
    setLoadingTablones(true);
    const { data } = await supabase.from('lotes').select('id, nombre, variedad, tipo_ciclo, numero_soca, area_hectareas').order('nombre');
    const lista = (data as Tablon[]) ?? [];
    setTablones(lista);
    if (lista.length > 0 && !tablonId) setTablonId(lista[0].id);
    setLoadingTablones(false);
  }

  async function cargarExpediente(id: string) {
    setLoadingDatos(true);

    const [{ data: labores }, { data: gastos }, { data: asisRows }] = await Promise.all([
      supabase.from('labores_tablon').select('tipo, subtipo, fecha, toneladas, responsable, notas').eq('tablon_id', id),
      supabase.from('gastos').select('categoria, descripcion, monto_usd, fecha').eq('lote_id', id),
      supabase.from('asistencia').select('trabajador_id, lote_ids, trabajadores(salario_diario_usd)').contains('lote_ids', [id]).eq('tipo', 'normal'),
    ]);

    const asistenciaTyped = (asisRows as unknown as AsistenciaConSalario[]) ?? [];

    const gastoTotal = (gastos ?? []).reduce((sum, g) => sum + (g.monto_usd ?? 0), 0);

    // El sueldo del día se reparte en partes iguales entre todos los tablones donde trabajó ese día
    const manoObraTotal = asistenciaTyped.reduce((sum, r) => {
      const cantidadTablones = r.lote_ids?.length || 1;
      const salario = r.trabajadores?.salario_diario_usd ?? 0;
      return sum + salario / cantidadTablones;
    }, 0);

    const toneladasTotal = (labores ?? []).reduce((sum, l) => sum + (l.tipo === 'corte' ? (l.toneladas ?? 0) : 0), 0);

    setGastoDirecto(gastoTotal);
    setCostoManoObra(manoObraTotal);
    setTotalToneladas(toneladasTotal);

    const itemsLabor: ItemLinea[] = (labores ?? []).map((l) => ({
      kind: 'labor',
      fecha: l.fecha,
      tipo: l.tipo,
      subtipo: l.subtipo,
      toneladas: l.toneladas,
      responsable: l.responsable,
      notas: l.notas,
    }));
    const itemsGasto: ItemLinea[] = (gastos ?? []).map((g) => ({
      kind: 'gasto',
      fecha: g.fecha,
      categoria: g.categoria,
      descripcion: g.descripcion,
      monto_usd: g.monto_usd,
    }));

    const combinado = [...itemsLabor, ...itemsGasto].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
    setLinea(combinado);

    setLoadingDatos(false);
  }

  const tablonActual = tablones.find((t) => t.id === tablonId);
  const totalCosto = gastoDirecto + costoManoObra;
  const costoPorHectarea = tablonActual?.area_hectareas ? totalCosto / tablonActual.area_hectareas : null;
  const tonPorHectarea = tablonActual?.area_hectareas && totalToneladas > 0 ? totalToneladas / tablonActual.area_hectareas : null;
  const costoPorTonelada = totalToneladas > 0 ? totalCosto / totalToneladas : null;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#F3ECDD', fontSize: '1.75rem', margin: 0 }}>Expediente del tablón</h1>
        <p style={{ color: '#94a3b8', marginTop: '0.25rem' }}>Todo lo que se le ha hecho, gastado y cosechado — en un solo lugar.</p>
      </div>

      {loadingTablones ? (
        <p style={{ color: '#94a3b8' }}>Cargando tablones...</p>
      ) : tablones.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>Primero necesitas registrar al menos un tablón.</p>
      ) : (
        <>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ color: '#D8CBB0', fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>Tablón</label>
            <select value={tablonId} onChange={(e) => setTablonId(e.target.value)} style={{ ...inputStyle, minWidth: '240px' }}>
              {tablones.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </div>

          {tablonActual && (
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {tablonActual.variedad && (
                <span style={{ color: '#E8C77E', backgroundColor: 'rgba(232,199,126,0.12)', padding: '0.3rem 0.8rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600 }}>
                  {tablonActual.variedad}
                </span>
              )}
              {labelCiclo(tablonActual) && (
                <span style={{ color: '#F3ECDD', backgroundColor: 'rgba(255,255,255,0.06)', padding: '0.3rem 0.8rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600 }}>
                  {labelCiclo(tablonActual)}
                </span>
              )}
              {tablonActual.area_hectareas != null && (
                <span style={{ color: '#94a3b8', backgroundColor: 'rgba(255,255,255,0.04)', padding: '0.3rem 0.8rem', borderRadius: '999px', fontSize: '0.8rem' }}>
                  {tablonActual.area_hectareas} ha
                </span>
              )}
            </div>
          )}

          {loadingDatos ? (
            <p style={{ color: '#94a3b8' }}>Calculando...</p>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ backgroundColor: '#1F3326', border: '1px solid rgba(232,199,126,0.15)', borderRadius: '12px', padding: '1.25rem' }}>
                  <p style={{ color: '#D8CBB0', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.4rem' }}>Costo total</p>
                  <p style={{ color: '#E8C77E', fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>${totalCosto.toFixed(2)}</p>
                </div>
                <div style={{ backgroundColor: '#1F3326', border: '1px solid rgba(232,199,126,0.15)', borderRadius: '12px', padding: '1.25rem' }}>
                  <p style={{ color: '#D8CBB0', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.4rem' }}>Costo por hectárea</p>
                  <p style={{ color: '#F3ECDD', fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>
                    {costoPorHectarea != null ? `$${costoPorHectarea.toFixed(2)}` : '—'}
                  </p>
                </div>
                <div style={{ backgroundColor: '#1F3326', border: '1px solid rgba(232,199,126,0.15)', borderRadius: '12px', padding: '1.25rem' }}>
                  <p style={{ color: '#D8CBB0', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.4rem' }}>Producción total</p>
                  <p style={{ color: '#93C5FD', fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>
                    {totalToneladas > 0 ? `${totalToneladas.toFixed(1)} ton` : '—'}
                  </p>
                  {tonPorHectarea != null && <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: '0.3rem 0 0' }}>{tonPorHectarea.toFixed(1)} ton/ha</p>}
                </div>
                <div style={{ backgroundColor: '#1F3326', border: '1px solid rgba(232,199,126,0.15)', borderRadius: '12px', padding: '1.25rem' }}>
                  <p style={{ color: '#D8CBB0', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.4rem' }}>Costo por tonelada</p>
                  <p style={{ color: '#F3ECDD', fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>
                    {costoPorTonelada != null ? `$${costoPorTonelada.toFixed(2)}` : '—'}
                  </p>
                </div>
              </div>

              <p style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: '1.5rem' }}>
                Costo total = gastos directos (${gastoDirecto.toFixed(2)}) + mano de obra según asistencia (${costoManoObra.toFixed(2)}). Si un trabajador estuvo en varios tablones el mismo día, su sueldo se reparte en partes iguales entre ellos. Todavía no incluye el valor de los insumos aplicados.
              </p>

              <h2 style={{ color: '#F3ECDD', fontSize: '1.2rem', marginBottom: '1rem' }}>Línea de tiempo</h2>
              {linea.length === 0 ? (
                <p style={{ color: '#94a3b8' }}>Todavía no hay labores ni gastos registrados para este tablón.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {linea.map((item, i) => {
                    if (item.kind === 'labor') {
                      const info = TIPO_LABOR_INFO[item.tipo] ?? TIPO_LABOR_INFO.otro;
                      return (
                        <div key={i} style={{ backgroundColor: '#1F3326', borderLeft: `3px solid ${info.color}`, border: '1px solid rgba(232,199,126,0.1)', borderRadius: '10px', padding: '0.9rem 1.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <span style={{ color: info.color, backgroundColor: info.bg, padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>
                              {info.label}
                            </span>
                            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{item.fecha}</span>
                          </div>
                          {item.subtipo && <p style={{ color: '#F3ECDD', fontSize: '0.9rem', margin: '0.5rem 0 0' }}>{item.subtipo}</p>}
                          {item.toneladas != null && <p style={{ color: '#E8C77E', fontSize: '0.85rem', margin: '0.3rem 0 0', fontWeight: 600 }}>{item.toneladas} toneladas</p>}
                          {item.responsable && <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>Responsable: {item.responsable}</p>}
                        </div>
                      );
                    }
                    return (
                      <div key={i} style={{ backgroundColor: '#1F3326', borderLeft: '3px solid #E8C77E', border: '1px solid rgba(232,199,126,0.1)', borderRadius: '10px', padding: '0.9rem 1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <span style={{ color: '#E8C77E', backgroundColor: 'rgba(232,199,126,0.15)', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>
                            Gasto · {CATEGORIA_GASTO_LABELS[item.categoria] ?? item.categoria}
                          </span>
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{item.fecha}</span>
                        </div>
                        <p style={{ color: '#F3ECDD', fontSize: '0.9rem', margin: '0.5rem 0 0' }}>{item.descripcion}</p>
                        <p style={{ color: '#E8C77E', fontSize: '0.85rem', margin: '0.3rem 0 0', fontWeight: 600 }}>${item.monto_usd.toFixed(2)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}