'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getTasaBCV, TasaBCV } from '@/lib/bcv';

type Trabajador = {
  id: string;
  nombre_completo: string;
  salario_diario_usd: number | null;
};

type FilaCalculo = {
  diasTrabajados: number;
  horasExtra: number;
  salarioBase: number;
  bonificaciones: string;
  descuentos: string;
  anticipos: string;
};

type NominaGuardada = {
  id: string;
  trabajador_id: string;
  periodo_inicio: string;
  periodo_fin: string;
  dias_trabajados: number;
  salario_base: number;
  bonificaciones: number;
  descuentos: number;
  anticipos: number;
  total_pagar: number;
  tasa_bcv: number | null;
  estado: 'pendiente' | 'pagado';
  fecha_pago: string | null;
  trabajadores: { nombre_completo: string } | null;
};

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.7rem',
  borderRadius: '8px',
  border: '1px solid rgba(216,203,176,0.25)',
  backgroundColor: 'rgba(255,255,255,0.04)',
  color: '#F3ECDD',
  fontSize: '0.9rem',
  fontFamily: 'inherit',
  width: '100px',
};

function formatBs(valor: number) {
  return valor.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function inicioSemanaActual() {
  const hoy = new Date();
  const dia = hoy.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diff);
  return lunes.toISOString().slice(0, 10);
}

function finSemanaActual() {
  const inicio = new Date(inicioSemanaActual());
  inicio.setDate(inicio.getDate() + 6);
  return inicio.toISOString().slice(0, 10);
}

export default function NominaPage() {
  const [periodoInicio, setPeriodoInicio] = useState(inicioSemanaActual());
  const [periodoFin, setPeriodoFin] = useState(finSemanaActual());
  const [tasa, setTasa] = useState<TasaBCV | null>(null);

  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [filas, setFilas] = useState<Record<string, FilaCalculo>>({});
  const [calculando, setCalculando] = useState(false);
  const [calculado, setCalculado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const [historial, setHistorial] = useState<NominaGuardada[]>([]);
  const [historialLoading, setHistorialLoading] = useState(true);

  useEffect(() => {
    getTasaBCV().then(setTasa);
    cargarHistorial();
  }, []);

  async function cargarHistorial() {
    setHistorialLoading(true);
    const { data } = await supabase
      .from('nomina')
      .select('*, trabajadores(nombre_completo)')
      .order('periodo_inicio', { ascending: false })
      .limit(30);
    setHistorial((data as unknown as NominaGuardada[]) ?? []);
    setHistorialLoading(false);
  }

  async function calcular() {
    setCalculando(true);
    setError('');
    setMensaje('');

    const { data: trabs } = await supabase
      .from('trabajadores')
      .select('id, nombre_completo, salario_diario_usd')
      .eq('estado', 'activo')
      .order('nombre_completo');

    const listaTrabs = (trabs as Trabajador[]) ?? [];

    const { data: asis } = await supabase
      .from('asistencia')
      .select('trabajador_id, tipo, horas_extra')
      .gte('fecha', periodoInicio)
      .lte('fecha', periodoFin);

    const nuevasFilas: Record<string, FilaCalculo> = {};
    listaTrabs.forEach((t) => {
      const registrosDelTrabajador = (asis ?? []).filter((a) => a.trabajador_id === t.id);
      const diasTrabajados = registrosDelTrabajador.filter((a) => a.tipo === 'normal').length;
      const horasExtra = registrosDelTrabajador.reduce((sum, a) => sum + (a.tipo === 'normal' ? (a.horas_extra ?? 0) : 0), 0);
      const salarioBase = diasTrabajados * (t.salario_diario_usd ?? 0);
      nuevasFilas[t.id] = { diasTrabajados, horasExtra, salarioBase, bonificaciones: '0', descuentos: '0', anticipos: '0' };
    });

    setTrabajadores(listaTrabs);
    setFilas(nuevasFilas);
    setCalculando(false);
    setCalculado(true);
  }

  function actualizarFila(trabajadorId: string, cambios: Partial<FilaCalculo>) {
    setFilas((prev) => ({ ...prev, [trabajadorId]: { ...prev[trabajadorId], ...cambios } }));
  }

  function totalFila(f: FilaCalculo) {
    return f.salarioBase + parseFloat(f.bonificaciones || '0') - parseFloat(f.descuentos || '0') - parseFloat(f.anticipos || '0');
  }

  async function guardarNomina() {
    setGuardando(true);
    setError('');
    setMensaje('');

    const filasAGuardar = trabajadores.map((t) => {
      const f = filas[t.id];
      return {
        trabajador_id: t.id,
        periodo_inicio: periodoInicio,
        periodo_fin: periodoFin,
        dias_trabajados: f.diasTrabajados,
        horas_extra_total: f.horasExtra,
        salario_base: f.salarioBase,
        bonificaciones: parseFloat(f.bonificaciones || '0'),
        descuentos: parseFloat(f.descuentos || '0'),
        anticipos: parseFloat(f.anticipos || '0'),
        tasa_bcv: tasa?.usd ?? null,
      };
    });

    const { error } = await supabase.from('nomina').upsert(filasAGuardar, { onConflict: 'trabajador_id,periodo_inicio,periodo_fin' });

    setGuardando(false);

    if (error) {
      setError(`Error al guardar: ${error.message}`);
      return;
    }

    setMensaje('Nómina del período guardada.');
    setTimeout(() => setMensaje(''), 3000);
    cargarHistorial();
  }

  async function marcarPagado(registro: NominaGuardada) {
    await supabase.from('nomina').update({ estado: 'pagado', fecha_pago: new Date().toISOString().slice(0, 10) }).eq('id', registro.id);
    cargarHistorial();
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#F3ECDD', fontSize: '1.75rem', margin: 0 }}>Nómina</h1>
        <p style={{ color: '#94a3b8', marginTop: '0.25rem' }}>Calcula y registra el pago de cada período.</p>
      </div>

      <div style={{ backgroundColor: '#1F3326', border: '1px solid rgba(232,199,126,0.15)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ color: '#D8CBB0', fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>Desde</label>
            <input type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ color: '#D8CBB0', fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>Hasta</label>
            <input type="date" value={periodoFin} onChange={(e) => setPeriodoFin(e.target.value)} style={inputStyle} />
          </div>
          <button
            onClick={calcular}
            disabled={calculando}
            style={{ padding: '0.6rem 1.4rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #E8C77E 0%, #C9974C 100%)', color: '#1F3326', fontWeight: 700, cursor: calculando ? 'not-allowed' : 'pointer' }}
          >
            {calculando ? 'Calculando...' : 'Calcular período'}
          </button>
          {tasa && <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Tasa BCV: Bs {formatBs(tasa.usd)} ({tasa.fecha})</span>}
        </div>

        {calculado && (
          <div style={{ marginTop: '1.5rem' }}>
            {trabajadores.length === 0 ? (
              <p style={{ color: '#94a3b8' }}>No hay trabajadores activos.</p>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ color: '#D8CBB0', textAlign: 'left', borderBottom: '1px solid rgba(232,199,126,0.15)' }}>
                        <th style={{ padding: '0.5rem' }}>Trabajador</th>
                        <th style={{ padding: '0.5rem' }}>Días</th>
                        <th style={{ padding: '0.5rem' }}>H. extra</th>
                        <th style={{ padding: '0.5rem' }}>Base</th>
                        <th style={{ padding: '0.5rem' }}>Bono $</th>
                        <th style={{ padding: '0.5rem' }}>Descuento $</th>
                        <th style={{ padding: '0.5rem' }}>Anticipo $</th>
                        <th style={{ padding: '0.5rem' }}>Total $</th>
                        <th style={{ padding: '0.5rem' }}>Total Bs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trabajadores.map((t) => {
                        const f = filas[t.id];
                        if (!f) return null;
                        const total = totalFila(f);
                        return (
                          <tr key={t.id} style={{ borderBottom: '1px solid rgba(232,199,126,0.06)' }}>
                            <td style={{ padding: '0.5rem', color: '#F3ECDD' }}>{t.nombre_completo}</td>
                            <td style={{ padding: '0.5rem', color: '#94a3b8' }}>{f.diasTrabajados}</td>
                            <td style={{ padding: '0.5rem', color: '#94a3b8' }}>{f.horasExtra}</td>
                            <td style={{ padding: '0.5rem', color: '#94a3b8' }}>${f.salarioBase.toFixed(2)}</td>
                            <td style={{ padding: '0.5rem' }}>
                              <input type="number" step="0.01" value={f.bonificaciones} onChange={(e) => actualizarFila(t.id, { bonificaciones: e.target.value })} style={{ ...inputStyle, width: '80px' }} />
                            </td>
                            <td style={{ padding: '0.5rem' }}>
                              <input type="number" step="0.01" value={f.descuentos} onChange={(e) => actualizarFila(t.id, { descuentos: e.target.value })} style={{ ...inputStyle, width: '80px' }} />
                            </td>
                            <td style={{ padding: '0.5rem' }}>
                              <input type="number" step="0.01" value={f.anticipos} onChange={(e) => actualizarFila(t.id, { anticipos: e.target.value })} style={{ ...inputStyle, width: '80px' }} />
                            </td>
                            <td style={{ padding: '0.5rem', color: '#E8C77E', fontWeight: 700 }}>${total.toFixed(2)}</td>
                            <td style={{ padding: '0.5rem', color: '#94a3b8' }}>{tasa ? `Bs ${formatBs(total * tasa.usd)}` : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button
                    onClick={guardarNomina}
                    disabled={guardando}
                    style={{ padding: '0.7rem 1.6rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #E8C77E 0%, #C9974C 100%)', color: '#1F3326', fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer' }}
                  >
                    {guardando ? 'Guardando...' : 'Guardar nómina del período'}
                  </button>
                  {mensaje && <span style={{ color: '#4ADE80', fontSize: '0.9rem' }}>{mensaje}</span>}
                  {error && <span style={{ color: '#F5A3A3', fontSize: '0.9rem' }}>{error}</span>}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <h2 style={{ color: '#F3ECDD', fontSize: '1.3rem', marginBottom: '1rem' }}>Historial de nóminas</h2>
      {historialLoading ? (
        <p style={{ color: '#94a3b8' }}>Cargando...</p>
      ) : historial.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>Todavía no se ha guardado ninguna nómina.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {historial.map((n) => (
            <div
              key={n.id}
              style={{
                backgroundColor: '#1F3326',
                border: '1px solid rgba(232,199,126,0.15)',
                borderRadius: '10px',
                padding: '1rem 1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div>
                <p style={{ color: '#F3ECDD', fontWeight: 600, margin: 0 }}>{n.trabajadores?.nombre_completo ?? 'Trabajador'}</p>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>
                  {n.periodo_inicio} → {n.periodo_fin} · {n.dias_trabajados} días
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: '#E8C77E', fontWeight: 700, margin: 0 }}>${n.total_pagar.toFixed(2)}</p>
                  {n.tasa_bcv && <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: 0 }}>Bs {formatBs(n.total_pagar * n.tasa_bcv)}</p>}
                </div>
                {n.estado === 'pagado' ? (
                  <span style={{ color: '#4ADE80', backgroundColor: 'rgba(74,222,128,0.12)', padding: '0.3rem 0.7rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700 }}>
                    Pagado {n.fecha_pago}
                  </span>
                ) : (
                  <button
                    onClick={() => marcarPagado(n)}
                    style={{ padding: '0.4rem 0.9rem', borderRadius: '999px', border: '1px solid #E8C77E', backgroundColor: 'transparent', color: '#E8C77E', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Marcar pagado
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}