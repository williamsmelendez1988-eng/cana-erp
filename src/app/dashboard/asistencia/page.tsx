'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { colors, card, buttonPrimary, inputStyle } from '@/lib/theme';
import { ChevronDown, CalendarDays, Users } from 'lucide-react';

type TrabajadorSimple = { id: string; nombre_completo: string };
type LoteSimple = { id: string; nombre: string };
type TipoAsistencia = 'normal' | 'falta' | 'permiso' | 'incapacidad';

type RegistroDia = {
  tipo: TipoAsistencia;
  lote_ids: string[];
  horas_extra: string;
  notas: string;
  tipo_labor: string;
};

const TIPO_OPCIONES: { valor: TipoAsistencia; label: string; color: string }[] = [
  { valor: 'normal', label: 'Presente', color: colors.success },
  { valor: 'falta', label: 'Falta', color: colors.danger },
  { valor: 'permiso', label: 'Permiso', color: colors.gold },
  { valor: 'incapacidad', label: 'Incapacidad', color: colors.info },
];

const TIPO_LABOR_LABELS: Record<string, string> = {
  riego: 'Riego',
  fertilizacion: 'Fertilización',
  control_maleza: 'Control de maleza',
  control_biologico: 'Control biológico',
  subsolado: 'Subsolado',
  agoste: 'Agoste',
  tamo: 'Saque de tamo',
  corte: 'Corte / Cosecha',
  resiembro: 'Resiembro',
  otro: 'Otra labor',
};

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function SelectorTablones({
  lotes,
  seleccionados,
  onChange,
}: {
  lotes: LoteSimple[];
  seleccionados: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  function toggle(id: string) {
    if (seleccionados.includes(id)) onChange(seleccionados.filter((x) => x !== id));
    else onChange([...seleccionados, id]);
  }

  const nombres = lotes.filter((l) => seleccionados.includes(l.id)).map((l) => l.nombre);
  const texto = nombres.length === 0 ? 'Sin tablón asignado' : nombres.length <= 2 ? nombres.join(', ') : `${nombres.length} tablones`;

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.5rem 0.7rem',
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          backgroundColor: 'rgba(255,255,255,0.04)',
          color: colors.cream,
          fontSize: '0.85rem',
          cursor: 'pointer',
          maxWidth: '220px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {texto} <ChevronDown size={14} style={{ flexShrink: 0 }} />
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div
            style={{
              position: 'absolute', top: '110%', left: 0, zIndex: 41,
              backgroundColor: colors.bgPanelHover,
              border: `1px solid ${colors.borderStrong}`,
              borderRadius: '10px',
              padding: '0.4rem',
              minWidth: '220px',
              maxHeight: '240px',
              overflowY: 'auto',
              boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
            }}
          >
            {lotes.length === 0 ? (
              <p style={{ color: colors.muted, fontSize: '0.8rem', padding: '0.4rem' }}>No hay tablones registrados.</p>
            ) : (
              lotes.map((l) => (
                <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.5rem', cursor: 'pointer', borderRadius: '6px' }}>
                  <input type="checkbox" checked={seleccionados.includes(l.id)} onChange={() => toggle(l.id)} />
                  <span style={{ fontSize: '0.85rem', color: colors.cream }}>{l.nombre}</span>
                </label>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function AsistenciaPage() {
  const [fecha, setFecha] = useState(hoy());
  const [trabajadores, setTrabajadores] = useState<TrabajadorSimple[]>([]);
  const [lotes, setLotes] = useState<LoteSimple[]>([]);
  const [registros, setRegistros] = useState<Record<string, RegistroDia>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    cargarBase();
  }, []);

  useEffect(() => {
    if (trabajadores.length > 0) cargarAsistenciaDelDia(fecha);
  }, [fecha, trabajadores]);

  async function cargarBase() {
    const [{ data: trabs }, { data: lts }] = await Promise.all([
      supabase.from('trabajadores').select('id, nombre_completo').eq('estado', 'activo').order('nombre_completo'),
      supabase.from('lotes').select('id, nombre').order('nombre'),
    ]);
    setTrabajadores((trabs as TrabajadorSimple[]) ?? []);
    setLotes((lts as LoteSimple[]) ?? []);
  }

  async function cargarAsistenciaDelDia(f: string) {
    setLoading(true);
    const { data } = await supabase.from('asistencia').select('*').eq('fecha', f);

    const base: Record<string, RegistroDia> = {};
    trabajadores.forEach((t) => {
      const existente = data?.find((r) => r.trabajador_id === t.id);
      base[t.id] = existente
        ? {
            tipo: existente.tipo,
            lote_ids: existente.lote_ids ?? [],
            horas_extra: existente.horas_extra?.toString() ?? '0',
            notas: existente.notas ?? '',
            tipo_labor: existente.tipo_labor ?? '',
          }
        : { tipo: 'normal', lote_ids: [], horas_extra: '0', notas: '', tipo_labor: '' };
    });
    setRegistros(base);
    setLoading(false);
  }

  function actualizarRegistro(trabajadorId: string, cambios: Partial<RegistroDia>) {
    setRegistros((prev) => ({ ...prev, [trabajadorId]: { ...prev[trabajadorId], ...cambios } }));
  }

  async function handleGuardarTodo() {
    setSaving(true);
    setError('');
    setMensaje('');

    const filas = trabajadores.map((t) => {
      const r = registros[t.id];
      return {
        trabajador_id: t.id,
        fecha,
        lote_ids: r.lote_ids,
        tipo: r.tipo,
        horas_extra: r.horas_extra ? parseFloat(r.horas_extra) : 0,
        notas: r.notas || null,
        tipo_labor: r.lote_ids.length > 0 && r.tipo_labor ? r.tipo_labor : null,
      };
    });

    const { error } = await supabase.from('asistencia').upsert(filas, { onConflict: 'trabajador_id,fecha' });

    setSaving(false);

    if (error) {
      setError(`Error al guardar: ${error.message}`);
      return;
    }

    setMensaje('Asistencia guardada correctamente.');
    setTimeout(() => setMensaje(''), 3000);
  }

  const conteo = TIPO_OPCIONES.map((op) => ({
    ...op,
    total: Object.values(registros).filter((r) => r.tipo === op.valor).length,
  }));

  return (
    <div>
      <style>{`
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .asis-row { animation: fadeSlideUp 0.4s cubic-bezier(.16,1,.3,1) both; }
        .btn-primary { transition: transform 0.15s, box-shadow 0.15s; }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(201,151,76,0.35); }
        .btn-primary:active { transform: scale(0.97); }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: colors.cream, fontSize: '1.75rem', margin: 0 }}>Asistencia</h1>
          <p style={{ color: colors.muted, marginTop: '0.25rem' }}>Marca quién trabajó hoy, en qué tablón, y qué va a hacer allí.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', ...inputStyle, padding: '0.5rem 0.7rem' }}>
          <CalendarDays size={16} color={colors.gold} />
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            style={{ background: 'none', border: 'none', color: colors.cream, fontSize: '0.95rem', outline: 'none' }}
          />
        </div>
      </div>

      {!loading && trabajadores.length > 0 && (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {conteo.map((c) => (
            <span key={c.valor} style={{ color: c.color, backgroundColor: `${c.color}20`, padding: '0.3rem 0.8rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600 }}>
              {c.total} {c.label}
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <p style={{ color: colors.muted }}>Cargando...</p>
      ) : trabajadores.length === 0 ? (
        <div style={{ ...card, border: `1px dashed ${colors.borderStrong}`, padding: '3rem', textAlign: 'center' }}>
          <Users size={28} color={colors.gold} style={{ marginBottom: '0.75rem' }} />
          <p style={{ color: '#D8CBB0' }}>Todavía no tienes trabajadores activos registrados.</p>
        </div>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          {trabajadores.map((t, i) => {
            const r = registros[t.id];
            if (!r) return null;
            const tieneTablon = r.lote_ids.length > 0;
            return (
              <div
                key={t.id}
                className="asis-row"
                style={{
                  padding: '1rem 1.25rem',
                  borderBottom: i < trabajadores.length - 1 ? `1px solid ${colors.border}` : 'none',
                  animationDelay: `${Math.min(i * 0.03, 0.3)}s`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ color: colors.cream, fontWeight: 600, minWidth: '160px', flex: '1 1 160px' }}>{t.nombre_completo}</div>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {TIPO_OPCIONES.map((op) => (
                      <button
                        key={op.valor}
                        type="button"
                        onClick={() => actualizarRegistro(t.id, { tipo: op.valor })}
                        style={{
                          padding: '0.4rem 0.8rem',
                          borderRadius: '999px',
                          border: r.tipo === op.valor ? `1px solid ${op.color}` : `1px solid ${colors.border}`,
                          backgroundColor: r.tipo === op.valor ? `${op.color}20` : 'transparent',
                          color: r.tipo === op.valor ? op.color : colors.muted,
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>

                  <SelectorTablones lotes={lotes} seleccionados={r.lote_ids} onChange={(ids) => actualizarRegistro(t.id, { lote_ids: ids })} />

                  {r.tipo === 'normal' && (
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={r.horas_extra}
                      onChange={(e) => actualizarRegistro(t.id, { horas_extra: e.target.value })}
                      placeholder="Horas extra"
                      title="Horas extra"
                      style={{ ...inputStyle, width: '110px', padding: '0.5rem 0.7rem', fontSize: '0.85rem' }}
                    />
                  )}
                </div>

                {r.tipo === 'normal' && tieneTablon && (
                  <div style={{ marginTop: '0.6rem' }}>
                    <select
                      value={r.tipo_labor}
                      onChange={(e) => actualizarRegistro(t.id, { tipo_labor: e.target.value })}
                      style={{ ...inputStyle, width: '100%', fontSize: '0.85rem', color: r.tipo_labor ? colors.cream : colors.muted }}
                    >
                      <option value="">¿Qué va a hacer en ese tablón? (opcional)</option>
                      {Object.entries(TIPO_LABOR_LABELS).map(([valor, label]) => (
                        <option key={valor} value={valor}>{label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {r.tipo === 'normal' && !tieneTablon && (
                  <input
                    type="text"
                    value={r.notas}
                    onChange={(e) => actualizarRegistro(t.id, { notas: e.target.value })}
                    placeholder="¿Qué hizo hoy? Ej: vigilancia nocturna, reparó el tractor..."
                    style={{ ...inputStyle, marginTop: '0.6rem', width: '100%', fontSize: '0.85rem', color: colors.muted }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && trabajadores.length > 0 && (
        <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button onClick={handleGuardarTodo} disabled={saving} className="btn-primary" style={{ ...buttonPrimary, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Guardando...' : 'Guardar asistencia del día'}
          </button>
          {mensaje && <span style={{ color: colors.success, fontSize: '0.9rem' }}>{mensaje}</span>}
          {error && <span style={{ color: colors.danger, fontSize: '0.9rem' }}>{error}</span>}
        </div>
      )}
    </div>
  );
}