'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { colors, card, buttonPrimary, buttonSecondary, inputStyle } from '@/lib/theme';
import { Map, Plus, Sprout, Ruler, Calendar, X } from 'lucide-react';

type Lote = {
  id: string;
  nombre: string;
  codigo: string | null;
  area_hectareas: number | null;
  estado: 'activo' | 'en_cosecha' | 'inactivo';
  fecha_siembra: string | null;
  variedad: string | null;
  tipo_ciclo: string | null;
  numero_soca: number | null;
  fecha_ultimo_corte: string | null;
  notas: string | null;
};

const ESTADO_LABELS: Record<string, { label: string; color: string }> = {
  activo: { label: 'Activo', color: colors.success },
  en_cosecha: { label: 'En cosecha', color: colors.gold },
  inactivo: { label: 'Inactivo', color: colors.muted },
};

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <label style={{ color: '#D8CBB0', fontSize: '0.85rem', fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

function labelCiclo(t: Lote): string {
  if (!t.tipo_ciclo) return '';
  if (t.tipo_ciclo === 'preparacion') return 'En preparación';
  if (t.tipo_ciclo === 'barbecho') return 'Barbecho';
  if (t.tipo_ciclo === 'planta') return 'Caña planta';
  return `Soca ${t.numero_soca ?? '?'}`;
}

export default function LotesPage() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Lote | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [areaHectareas, setAreaHectareas] = useState('');
  const [estado, setEstado] = useState<'activo' | 'en_cosecha' | 'inactivo'>('activo');
  const [fechaSiembra, setFechaSiembra] = useState('');
  const [variedad, setVariedad] = useState('');
  const [tipoCiclo, setTipoCiclo] = useState<'preparacion' | 'planta' | 'soca' | 'barbecho'>('planta');
  const [numeroSoca, setNumeroSoca] = useState('');
  const [fechaUltimoCorte, setFechaUltimoCorte] = useState('');
  const [notas, setNotas] = useState('');

  useEffect(() => {
    cargarLotes();
  }, []);

  async function cargarLotes() {
    setLoading(true);
    const { data, error } = await supabase.from('lotes').select('*').order('created_at', { ascending: false });
    if (!error && data) setLotes(data as Lote[]);
    setLoading(false);
  }

  function abrirNuevo() {
    setEditing(null);
    setNombre('');
    setCodigo('');
    setAreaHectareas('');
    setEstado('activo');
    setFechaSiembra('');
    setVariedad('');
    setTipoCiclo('planta');
    setNumeroSoca('');
    setFechaUltimoCorte('');
    setNotas('');
    setError('');
    setModalOpen(true);
  }

  function abrirEditar(lote: Lote) {
    setEditing(lote);
    setNombre(lote.nombre);
    setCodigo(lote.codigo ?? '');
    setAreaHectareas(lote.area_hectareas?.toString() ?? '');
    setEstado(lote.estado);
    setFechaSiembra(lote.fecha_siembra ?? '');
    setVariedad(lote.variedad ?? '');
    setTipoCiclo((lote.tipo_ciclo as 'preparacion' | 'planta' | 'soca' | 'barbecho') ?? 'planta');
    setNumeroSoca(lote.numero_soca?.toString() ?? '');
    setFechaUltimoCorte(lote.fecha_ultimo_corte ?? '');
    setNotas(lote.notas ?? '');
    setError('');
    setModalOpen(true);
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      nombre,
      codigo: codigo || null,
      area_hectareas: areaHectareas ? parseFloat(areaHectareas) : null,
      estado,
      fecha_siembra: fechaSiembra || null,
      variedad: variedad || null,
      tipo_ciclo: tipoCiclo,
      numero_soca: tipoCiclo === 'soca' && numeroSoca ? parseInt(numeroSoca, 10) : null,
      fecha_ultimo_corte: fechaUltimoCorte || null,
      notas: notas || null,
    };

    const { error } = editing
      ? await supabase.from('lotes').update(payload).eq('id', editing.id)
      : await supabase.from('lotes').insert(payload);

    setSaving(false);

    if (error) {
      setError(error.message.includes('duplicate') ? 'Ese código ya está en uso por otro tablón.' : 'Ocurrió un error al guardar.');
      return;
    }

    setModalOpen(false);
    cargarLotes();
  }

  return (
    <div>
      <style>{`
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .tablon-card {
          animation: fadeSlideUp 0.5s cubic-bezier(.16,1,.3,1) both;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .tablon-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.28); border-color: rgba(232,199,126,0.3); }
        .tablon-card:active { transform: scale(0.98); }
        .btn-primary { transition: transform 0.15s, box-shadow 0.15s; }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(201,151,76,0.35); }
        .btn-primary:active { transform: scale(0.97); }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: colors.cream, fontSize: '1.75rem', margin: 0 }}>Tablones</h1>
          <p style={{ color: colors.muted, marginTop: '0.25rem' }}>Los tablones de la hacienda, uno por parcela.</p>
        </div>
        <button onClick={abrirNuevo} className="btn-primary" style={{ ...buttonPrimary, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={16} /> Nuevo tablón
        </button>
      </div>

      {loading ? (
        <p style={{ color: colors.muted }}>Cargando tablones...</p>
      ) : lotes.length === 0 ? (
        <div style={{ ...card, border: `1px dashed ${colors.borderStrong}`, padding: '3rem', textAlign: 'center' }}>
          <Map size={28} color={colors.gold} style={{ marginBottom: '0.75rem' }} />
          <p style={{ color: '#D8CBB0', marginBottom: '1rem' }}>Todavía no has registrado ningún tablón.</p>
          <button onClick={abrirNuevo} className="btn-primary" style={{ ...buttonPrimary, margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={16} /> Registrar el primero
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {lotes.map((lote, i) => {
            const estadoInfo = ESTADO_LABELS[lote.estado];
            const ciclo = labelCiclo(lote);
            return (
              <div
                key={lote.id}
                className="tablon-card"
                onClick={() => abrirEditar(lote)}
                style={{ ...card, cursor: 'pointer', position: 'relative', overflow: 'hidden', animationDelay: `${Math.min(i * 0.05, 0.4)}s` }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${estadoInfo.color}, transparent)` }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '9px', backgroundColor: `${estadoInfo.color}20`, color: estadoInfo.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Map size={16} />
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px', color: estadoInfo.color, backgroundColor: `${estadoInfo.color}20` }}>
                    {estadoInfo.label}
                  </span>
                </div>
                <h3 style={{ color: colors.cream, fontSize: '1.1rem', margin: '0 0 0.5rem' }}>{lote.nombre}</h3>
                {lote.variedad && (
                  <p style={{ color: colors.gold, fontSize: '0.85rem', margin: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                    <Sprout size={13} /> {lote.variedad}
                  </p>
                )}
                {ciclo && <p style={{ color: colors.muted, fontSize: '0.85rem', margin: '0.25rem 0' }}>{ciclo}</p>}
                {lote.area_hectareas != null && (
                  <p style={{ color: colors.muted, fontSize: '0.85rem', margin: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Ruler size={13} /> {lote.area_hectareas} hectáreas
                  </p>
                )}
                {lote.fecha_ultimo_corte && (
                  <p style={{ color: colors.muted, fontSize: '0.85rem', margin: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={13} /> Último corte: {lote.fecha_ultimo_corte}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleGuardar}
            style={{ ...card, width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: colors.cream, fontSize: '1.3rem', margin: 0 }}>{editing ? 'Editar tablón' : 'Nuevo tablón'}</h2>
              <button type="button" onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: colors.muted, cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <Campo label="Nombre">
              <input required value={nombre} onChange={(e) => setNombre(e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Código (opcional)">
              <input value={codigo} onChange={(e) => setCodigo(e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Variedad de caña">
              <input value={variedad} onChange={(e) => setVariedad(e.target.value)} placeholder="Ej: PR 61-632, V 71-51" style={inputStyle} />
            </Campo>

            <Campo label="Ciclo">
              <select value={tipoCiclo} onChange={(e) => setTipoCiclo(e.target.value as typeof tipoCiclo)} style={inputStyle}>
                <option value="preparacion">En preparación</option>
                <option value="planta">Caña planta</option>
                <option value="soca">Soca</option>
                <option value="barbecho">Barbecho (abandonado)</option>
              </select>
            </Campo>

            {tipoCiclo === 'soca' && (
              <Campo label="Número de soca">
                <input type="number" min="1" step="1" value={numeroSoca} onChange={(e) => setNumeroSoca(e.target.value)} placeholder="Ej: 1, 2, 7, 14..." style={inputStyle} />
              </Campo>
            )}

            <Campo label="Área (hectáreas)">
              <input type="number" step="0.01" min="0" value={areaHectareas} onChange={(e) => setAreaHectareas(e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Estado">
              <select value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)} style={inputStyle}>
                <option value="activo">Activo</option>
                <option value="en_cosecha">En cosecha</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </Campo>

            <Campo label="Fecha de siembra">
              <input type="date" value={fechaSiembra} onChange={(e) => setFechaSiembra(e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Fecha del último corte">
              <input type="date" value={fechaUltimoCorte} onChange={(e) => setFechaUltimoCorte(e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Notas">
              <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
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