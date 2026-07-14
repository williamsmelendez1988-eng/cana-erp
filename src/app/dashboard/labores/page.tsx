'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { colors, card, buttonPrimary, buttonSecondary, inputStyle } from '@/lib/theme';
import { Droplets, Sprout, Bug, Layers, Sun, Wind, Scissors, FileText, X } from 'lucide-react';

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
  toneladas: number | null;
};

const TIPO_INFO: Record<string, { label: string; color: string; icon: typeof Droplets; placeholder: string }> = {
  riego: { label: 'Riego', color: '#93C5FD', icon: Droplets, placeholder: 'Ej: 1er riego, riego de nacimiento, 2do riego...' },
  fertilizacion: { label: 'Fertilización', color: '#4ADE80', icon: Sprout, placeholder: 'Ej: 1era fertilización, fertilización de fondo...' },
  control_maleza: { label: 'Control de maleza', color: '#FBBF24', icon: Layers, placeholder: 'Ej: Mecánico con discos, manual con machete, químico...' },
  control_biologico: { label: 'Control biológico', color: '#C4B5FD', icon: Bug, placeholder: 'Ej: Liberación de mosca amazónica o Cotesia contra taladrador, hongo contra candelilla...' },
  subsolado: { label: 'Subsolado', color: '#D8CBB0', icon: Layers, placeholder: 'Ej: Subsolado antes de siembra...' },
  agoste: { label: 'Agoste', color: '#E8C77E', icon: Sun, placeholder: 'Ej: Inicio de restricción de riego previo a cosecha...' },
  tamo: { label: 'Saque de tamo', color: '#94A3B8', icon: Wind, placeholder: 'Ej: Limpieza de hojarasca post-corte...' },
  corte: { label: 'Corte / Cosecha', color: '#F87171', icon: Scissors, placeholder: 'Ej: Corte manual, corte mecanizado...' },
  resiembro: { label: 'Resiembro', color: '#FB923C', icon: Sprout, placeholder: 'Ej: Resiembro con personal contratado...' },
  otro: { label: 'Otra labor', color: '#F3ECDD', icon: FileText, placeholder: 'Describe la labor realizada...' },
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
  const [toneladas, setToneladas] = useState('');

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
      .select('id, tipo, subtipo, fecha, responsable, notas, toneladas')
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
    setToneladas('');
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
      toneladas: tipo === 'corte' && toneladas ? parseFloat(toneladas) : null,
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
      <style>{`
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .labor-row { animation: fadeSlideUp 0.4s cubic-bezier(.16,1,.3,1) both; transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .labor-row:hover { transform: translateX(3px); box-shadow: 0 6px 18px rgba(0,0,0,0.2); }
        .btn-primary { transition: transform 0.15s, box-shadow 0.15s; }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(201,151,76,0.35); }
        .btn-primary:active { transform: scale(0.97); }
      `}</style>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: colors.cream, fontSize: '1.75rem', margin: 0 }}>Labores</h1>
        <p style={{ color: colors.muted, marginTop: '0.25rem' }}>Todo lo que se le hace a cada tablón: riegos, fertilización, control de plagas y más.</p>
      </div>

      {loadingTablones ? (
        <p style={{ color: colors.muted }}>Cargando tablones...</p>
      ) : tablones.length === 0 ? (
        <div style={{ ...card, border: `1px dashed ${colors.borderStrong}`, padding: '3rem', textAlign: 'center' }}>
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
            <button onClick={abrirNueva} className="btn-primary" style={{ ...buttonPrimary, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              + Nueva labor
            </button>
          </div>

          {tablonActual && (
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {tablonActual.variedad && (
                <span style={{ color: colors.gold, backgroundColor: `${colors.gold}20`, padding: '0.3rem 0.8rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600 }}>
                  {tablonActual.variedad}
                </span>
              )}
              {labelCiclo(tablonActual) && (
                <span style={{ color: colors.cream, backgroundColor: 'rgba(255,255,255,0.06)', padding: '0.3rem 0.8rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600 }}>
                  {labelCiclo(tablonActual)}
                </span>
              )}
            </div>
          )}

          {mensaje && <p style={{ color: colors.success, fontSize: '0.9rem', marginBottom: '1rem' }}>{mensaje}</p>}

          {loadingLabores ? (
            <p style={{ color: colors.muted }}>Cargando labores...</p>
          ) : labores.length === 0 ? (
            <div style={{ ...card, border: `1px dashed ${colors.borderStrong}`, padding: '3rem', textAlign: 'center' }}>
              <p style={{ color: '#D8CBB0' }}>Todavía no hay labores registradas para este tablón.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {labores.map((l, i) => {
                const info = TIPO_INFO[l.tipo] ?? TIPO_INFO.otro;
                const Icon = info.icon;
                return (
                  <div
                    key={l.id}
                    className="labor-row"
                    style={{ ...card, padding: '1rem 1.25rem', borderLeft: `3px solid ${info.color}`, animationDelay: `${Math.min(i * 0.04, 0.3)}s` }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '9px', backgroundColor: `${info.color}20`, color: info.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={16} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <span style={{ color: info.color, fontSize: '0.85rem', fontWeight: 700 }}>{info.label}</span>
                          <span style={{ color: colors.muted, fontSize: '0.8rem' }}>{l.fecha}</span>
                        </div>
                        {l.subtipo && <p style={{ color: colors.cream, fontSize: '0.9rem', margin: '0.4rem 0 0' }}>{l.subtipo}</p>}
                        {l.toneladas != null && <p style={{ color: colors.gold, fontSize: '0.85rem', margin: '0.3rem 0 0', fontWeight: 600 }}>{l.toneladas} toneladas</p>}
                        {l.responsable && <p style={{ color: colors.muted, fontSize: '0.8rem', margin: '0.2rem 0 0' }}>Responsable: {l.responsable}</p>}
                        {l.notas && <p style={{ color: colors.muted, fontSize: '0.78rem', margin: '0.2rem 0 0', fontStyle: 'italic' }}>{l.notas}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <div onClick={() => setModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleGuardar}
            style={{ ...card, width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: colors.cream, fontSize: '1.3rem', margin: 0 }}>Nueva labor — {tablonActual?.nombre}</h2>
              <button type="button" onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: colors.muted, cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <Campo label="Tipo de labor">
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={inputStyle}>
                {Object.entries(TIPO_INFO).map(([valor, info]) => (
                  <option key={valor} value={valor}>{info.label}</option>
                ))}
              </select>
            </Campo>

            {tipo === 'corte' && (
              <>
                <p style={{ color: colors.gold, fontSize: '0.8rem', margin: 0, backgroundColor: `${colors.gold}18`, padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                  Al guardar, este tablón va a pasar automáticamente a {tablonActual?.tipo_ciclo === 'planta' ? 'Soca 1' : `Soca ${(tablonActual?.numero_soca ?? 0) + 1}`}.
                </p>
                <Campo label="Toneladas cosechadas">
                  <input type="number" step="0.01" min="0" value={toneladas} onChange={(e) => setToneladas(e.target.value)} placeholder="Ej: 45.5" style={inputStyle} />
                </Campo>
              </>
            )}

            <Campo label="Detalle">
              <input value={subtipo} onChange={(e) => setSubtipo(e.target.value)} placeholder={TIPO_INFO[tipo]?.placeholder} style={inputStyle} />
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

            {error && <p style={{ color: colors.danger, fontSize: '0.85rem', margin: 0 }}>{error}</p>}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setModalOpen(false)} style={{ ...buttonSecondary, flex: 1 }}>
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="btn-primary" style={{ ...buttonPrimary, flex: 1, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}