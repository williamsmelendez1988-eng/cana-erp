'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type LoteSimple = {
  id: string;
  nombre: string;
  variedad: string | null;
  tipo_ciclo: string | null;
  numero_soca: number | null;
};

type Labor = {
  id: string;
  tipo: string;
  subtipo: string | null;
  fecha: string;
  responsable: string | null;
  notas: string | null;
};

const TIPO_INFO: Record<string, { label: string; color: string; bg: string; placeholder: string }> = {
  riego: { label: 'Riego', color: '#93C5FD', bg: 'rgba(147,197,253,0.15)', placeholder: 'Ej: 1er riego, riego de nacimiento, 2do riego...' },
  fertilizacion: { label: 'Fertilización', color: '#4ADE80', bg: 'rgba(74,222,128,0.15)', placeholder: 'Ej: 1era fertilización, fertilización de fondo...' },
  control_maleza: { label: 'Control de maleza', color: '#FBBF24', bg: 'rgba(251,191,36,0.15)', placeholder: 'Ej: Mecánico con discos, manual con machete, químico...' },
  control_biologico: { label: 'Control biológico', color: '#C4B5FD', bg: 'rgba(196,181,253,0.15)', placeholder: 'Ej: Liberación de mosca amazónica o Cotesia contra taladrador, hongo contra candelilla...' },
  subsolado: { label: 'Subsolado', color: '#D8CBB0', bg: 'rgba(216,203,176,0.12)', placeholder: 'Ej: Subsolado antes de siembra...' },
  agoste: { label: 'Agoste', color: '#E8C77E', bg: 'rgba(232,199,126,0.15)', placeholder: 'Ej: Inicio de restricción de riego previo a cosecha...' },
  tamo: { label: 'Saque de tamo', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', placeholder: 'Ej: Limpieza de hojarasca post-corte...' },
  corte: { label: 'Corte / Cosecha', color: '#F87171', bg: 'rgba(248,113,113,0.15)', placeholder: 'Ej: Corte manual, corte mecanizado...' },
  resiembro: { label: 'Resiembro', color: '#FB923C', bg: 'rgba(251,146,60,0.15)', placeholder: 'Ej: Resiembro con personal contratado...' },
  otro: { label: 'Otra labor', color: '#F3ECDD', bg: 'rgba(243,236,221,0.08)', placeholder: 'Describe la labor realizada...' },
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

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <label style={{ color: '#D8CBB0', fontSize: '0.85rem', fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function labelCiclo(t: LoteSimple): string {
  if (!t.tipo_ciclo) return '';
  if (t.tipo_ciclo === 'planta') return 'Caña planta';
  return `Soca ${t.numero_soca ?? '?'}`;
}

export default function LaboresPage() {
  const [tablones, setTablones] = useState<LoteSimple[]>([]);
  const [tablonId, setTablonId] = useState('');
  const [labores, setLabores] = useState<Labor[]>([]);
  const [loadingTablones, setLoadingTablones] = useState(true);
  const [loadingLabores, setLoadingLabores] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [tipo, setTipo] = useState('riego');
  const [subtipo, setSubtipo] = useState('');
  const [fecha, setFecha] = useState(hoy());
  const [responsable, setResponsable] = useState('');
  const [notas, setNotas] = useState('');

  useEffect(() => {
    cargarTablones();
  }, []);

  useEffect(() => {
    if (tablonId) cargarLabores(tablonId);
  }, [tablonId]);

  async function cargarTablones() {
    setLoadingTablones(true);
    const { data } = await supabase.from('lotes').select('id, nombre, variedad, tipo_ciclo, numero_soca').order('nombre');
    const lista = (data as LoteSimple[]) ?? [];
    setTablones(lista);
    if (lista.length > 0 && !tablonId) setTablonId(lista[0].id);
    setLoadingTablones(false);
  }

  async function cargarLabores(id: string) {
    setLoadingLabores(true);
    const { data } = await supabase
      .from('labores_tablon')
      .select('id, tipo, subtipo, fecha, responsable, notas')
      .eq('tablon_id', id)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false });
    setLabores((data as Labor[]) ?? []);
    setLoadingLabores(false);
  }

  function abrirNueva() {
    setTipo('riego');
    setSubtipo('');
    setFecha(hoy());
    setResponsable('');
    setNotas('');
    setError('');
    setModalOpen(true);
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    setMensaje('');

    const { error: laborError } = await supabase.from('labores_tablon').insert({
      tablon_id: tablonId,
      tipo,
      subtipo: subtipo || null,
      fecha,
      responsable: responsable || null,
      notas: notas || null,
    });

    if (laborError) {
      setSaving(false);
      setError(`Error: ${laborError.message}`);
      return;
    }

    if (tipo === 'corte') {
      const tablonActual = tablones.find((t) => t.id === tablonId);
      if (tablonActual) {
        const nuevoNumeroSoca = tablonActual.tipo_ciclo === 'planta' ? 1 : (tablonActual.numero_soca ?? 0) + 1;
        const { error: loteError } = await supabase
          .from('lotes')
          .update({ tipo_ciclo: 'soca', numero_soca: nuevoNumeroSoca, fecha_ultimo_corte: fecha })
          .eq('id', tablonId);

        if (!loteError) {
          setMensaje(`Corte registrado — este tablón pasó a Soca ${nuevoNumeroSoca}.`);
        }
      }
    } else {
      setMensaje('Labor registrada correctamente.');
    }

    setSaving(false);
    setModalOpen(false);
    cargarTablones();
    cargarLabores(tablonId);
    setTimeout(() => setMensaje(''), 4000);
  }

  const tablonActual = tablones.find((t) => t.id === tablonId);

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#F3ECDD', fontSize: '1.75rem', margin: 0 }}>Labores</h1>
        <p style={{ color: '#94a3b8', marginTop: '0.25rem' }}>Todo lo que se le hace a cada tablón: riegos, fertilización, control de plagas y más.</p>
      </div>

      {loadingTablones ? (
        <p style={{ color: '#94a3b8' }}>Cargando tablones...</p>
      ) : tablones.length === 0 ? (
        <div style={{ backgroundColor: '#1F3326', border: '1px dashed rgba(232,199,126,0.3)', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#D8CBB0' }}>Primero necesitas registrar al menos un tablón.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ color: '#D8CBB0', fontSize: '0.85rem', fontWeight: 500 }}>Tablón</label>
              <select value={tablonId} onChange={(e) => setTablonId(e.target.value)} style={{ ...inputStyle, minWidth: '220px' }}>
                {tablones.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>
            <button
              onClick={abrirNueva}
              style={{ padding: '0.7rem 1.4rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #E8C77E 0%, #C9974C 100%)', color: '#1F3326', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
            >
              + Nueva labor
            </button>
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
            </div>
          )}

          {mensaje && <p style={{ color: '#4ADE80', fontSize: '0.9rem', marginBottom: '1rem' }}>{mensaje}</p>}

          {loadingLabores ? (
            <p style={{ color: '#94a3b8' }}>Cargando labores...</p>
          ) : labores.length === 0 ? (
            <div style={{ backgroundColor: '#1F3326', border: '1px dashed rgba(232,199,126,0.3)', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
              <p style={{ color: '#D8CBB0' }}>Todavía no hay labores registradas para este tablón.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {labores.map((l) => {
                const info = TIPO_INFO[l.tipo] ?? TIPO_INFO.otro;
                return (
                  <div
                    key={l.id}
                    style={{
                      backgroundColor: '#1F3326',
                      borderLeft: `3px solid ${info.color}`,
                      border: '1px solid rgba(232,199,126,0.1)',
                      borderRadius: '10px',
                      padding: '0.9rem 1.25rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ color: info.color, backgroundColor: info.bg, padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>
                        {info.label}
                      </span>
                      <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{l.fecha}</span>
                    </div>
                    {l.subtipo && <p style={{ color: '#F3ECDD', fontSize: '0.9rem', margin: '0.5rem 0 0' }}>{l.subtipo}</p>}
                    {l.responsable && <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>Responsable: {l.responsable}</p>}
                    {l.notas && <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: '0.2rem 0 0', fontStyle: 'italic' }}>{l.notas}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <div onClick={() => setModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleGuardar}
            style={{ backgroundColor: '#1F3326', border: '1px solid rgba(232,199,126,0.2)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <h2 style={{ color: '#F3ECDD', fontSize: '1.3rem', margin: 0 }}>Nueva labor — {tablonActual?.nombre}</h2>

            <Campo label="Tipo de labor">
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={inputStyle}>
                {Object.entries(TIPO_INFO).map(([valor, info]) => (
                  <option key={valor} value={valor}>{info.label}</option>
                ))}
              </select>
            </Campo>

            {tipo === 'corte' && (
              <p style={{ color: '#E8C77E', fontSize: '0.8rem', margin: 0, backgroundColor: 'rgba(232,199,126,0.1)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                Al guardar, este tablón va a pasar automáticamente a {tablonActual?.tipo_ciclo === 'planta' ? 'Soca 1' : `Soca ${(tablonActual?.numero_soca ?? 0) + 1}`}.
              </p>
            )}

            <Campo label="Detalle">
              <input
                value={subtipo}
                onChange={(e) => setSubtipo(e.target.value)}
                placeholder={TIPO_INFO[tipo]?.placeholder}
                style={inputStyle}
              />
            </Campo>

            <Campo label="Fecha">
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Responsable">
              <input value={responsable} onChange={(e) => setResponsable(e.target.value)} placeholder="Quién la realizó" style={inputStyle} />
            </Campo>

            <Campo label="Notas">
              <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </Campo>

            {error && <p style={{ color: '#F5A3A3', fontSize: '0.85rem', margin: 0 }}>{error}</p>}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setModalOpen(false)} style={{ flex: 1, padding: '0.7rem', borderRadius: '10px', border: '1px solid rgba(216,203,176,0.25)', backgroundColor: 'transparent', color: '#D8CBB0', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{ flex: 1, padding: '0.7rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #E8C77E 0%, #C9974C 100%)', color: '#1F3326', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}