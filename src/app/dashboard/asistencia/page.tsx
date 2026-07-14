'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronDown } from 'lucide-react';

type TrabajadorSimple = { id: string; nombre_completo: string };
type LoteSimple = { id: string; nombre: string };
type TipoAsistencia = 'normal' | 'falta' | 'permiso' | 'incapacidad';

type RegistroDia = {
  tipo: TipoAsistencia;
  lote_ids: string[];
  horas_extra: string;
  notas: string;
};

const TIPO_OPCIONES: { valor: TipoAsistencia; label: string; color: string; bg: string }[] = [
  { valor: 'normal', label: 'Presente', color: '#4ADE80', bg: 'rgba(74,222,128,0.15)' },
  { valor: 'falta', label: 'Falta', color: '#F87171', bg: 'rgba(248,113,113,0.15)' },
  { valor: 'permiso', label: 'Permiso', color: '#E8C77E', bg: 'rgba(232,199,126,0.15)' },
  { valor: 'incapacidad', label: 'Incapacidad', color: '#93C5FD', bg: 'rgba(147,197,253,0.15)' },
];

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
          border: '1px solid rgba(216,203,176,0.25)',
          backgroundColor: 'rgba(255,255,255,0.04)',
          color: '#F3ECDD',
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
              backgroundColor: '#243B2C',
              border: '1px solid rgba(232,199,126,0.25)',
              borderRadius: '10px',
              padding: '0.4rem',
              minWidth: '220px',
              maxHeight: '240px',
              overflowY: 'auto',
              boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
            }}
          >
            {lotes.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', padding: '0.4rem' }}>No hay tablones registrados.</p>
            ) : (
              lotes.map((l) => (
                <label
                  key={l.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.5rem', cursor: 'pointer', borderRadius: '6px' }}
                >
                  <input type="checkbox" checked={seleccionados.includes(l.id)} onChange={() => toggle(l.id)} />
                  <span style={{ fontSize: '0.85rem', color: '#F3ECDD' }}>{l.nombre}</span>
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
          }
        : { tipo: 'normal', lote_ids: [], horas_extra: '0', notas: '' };
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: '#F3ECDD', fontSize: '1.75rem', margin: 0 }}>Asistencia</h1>
          <p style={{ color: '#94a3b8', marginTop: '0.25rem' }}>Marca quién trabajó hoy y en qué tablón — puedes elegir varios.</p>
        </div>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          style={{
            padding: '0.6rem 0.9rem',
            borderRadius: '10px',
            border: '1px solid rgba(216,203,176,0.25)',
            backgroundColor: 'rgba(255,255,255,0.04)',
            color: '#F3ECDD',
            fontSize: '0.95rem',
          }}
        />
      </div>

      {!loading && trabajadores.length > 0 && (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {conteo.map((c) => (
            <span key={c.valor} style={{ color: c.color, backgroundColor: c.bg, padding: '0.3rem 0.8rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600 }}>
              {c.total} {c.label}
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Cargando...</p>
      ) : trabajadores.length === 0 ? (
        <div style={{ backgroundColor: '#1F3326', border: '1px dashed rgba(232,199,126,0.3)', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#D8CBB0' }}>Todavía no tienes trabajadores activos registrados.</p>
        </div>
      ) : (
        <div style={{ backgroundColor: '#1F3326', border: '1px solid rgba(232,199,126,0.15)', borderRadius: '12px', overflow: 'hidden' }}>
          {trabajadores.map((t, i) => {
            const r = registros[t.id];
            if (!r) return null;
            return (
              <div
                key={t.id}
                style={{
                  padding: '1rem 1.25rem',
                  borderBottom: i < trabajadores.length - 1 ? '1px solid rgba(232,199,126,0.08)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ color: '#F3ECDD', fontWeight: 600, minWidth: '160px', flex: '1 1 160px' }}>{t.nombre_completo}</div>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {TIPO_OPCIONES.map((op) => (
                      <button
                        key={op.valor}
                        type="button"
                        onClick={() => actualizarRegistro(t.id, { tipo: op.valor })}
                        style={{
                          padding: '0.4rem 0.8rem',
                          borderRadius: '999px',
                          border: r.tipo === op.valor ? `1px solid ${op.color}` : '1px solid rgba(216,203,176,0.2)',
                          backgroundColor: r.tipo === op.valor ? op.bg : 'transparent',
                          color: r.tipo === op.valor ? op.color : '#94a3b8',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
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
                      style={{
                        width: '110px',
                        padding: '0.5rem 0.7rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(216,203,176,0.25)',
                        backgroundColor: 'rgba(255,255,255,0.04)',
                        color: '#F3ECDD',
                        fontSize: '0.85rem',
                      }}
                    />
                  )}
                </div>

                {r.lote_ids.length === 0 && r.tipo === 'normal' && (
                  <input
                    type="text"
                    value={r.notas}
                    onChange={(e) => actualizarRegistro(t.id, { notas: e.target.value })}
                    placeholder="¿Qué hizo hoy? Ej: vigilancia nocturna, reparó el tractor..."
                    style={{
                      marginTop: '0.6rem',
                      width: '100%',
                      padding: '0.5rem 0.7rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(216,203,176,0.2)',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      color: '#D8CBB0',
                      fontSize: '0.85rem',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && trabajadores.length > 0 && (
        <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleGuardarTodo}
            disabled={saving}
            style={{
              padding: '0.8rem 1.8rem',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #E8C77E 0%, #C9974C 100%)',
              color: '#1F3326',
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Guardando...' : 'Guardar asistencia del día'}
          </button>
          {mensaje && <span style={{ color: '#4ADE80', fontSize: '0.9rem' }}>{mensaje}</span>}
          {error && <span style={{ color: '#F5A3A3', fontSize: '0.9rem' }}>{error}</span>}
        </div>
      )}
    </div>
  );
}