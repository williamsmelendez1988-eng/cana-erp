'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Bien = {
  id: string;
  nombre: string;
  tipo: string;
  fecha_instalacion: string | null;
  estado: 'funcionando' | 'mantenimiento' | 'fuera_servicio';
  notas: string | null;
};

const TIPO_LABELS: Record<string, string> = {
  pozo_agua: 'Pozo de agua',
  tanque: 'Tanque de almacenamiento',
  galpon: 'Galpón',
  vivienda: 'Vivienda',
  cerca: 'Cerca / Alambrado',
  maquinaria_fija: 'Maquinaria fija',
  otro: 'Otro',
};

const ESTADO_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  funcionando: { label: 'Funcionando', color: '#4ADE80', bg: 'rgba(74,222,128,0.12)' },
  mantenimiento: { label: 'Necesita mantenimiento', color: '#FBBF24', bg: 'rgba(251,191,36,0.15)' },
  fuera_servicio: { label: 'Fuera de servicio', color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
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

export default function InfraestructuraPage() {
  const [bienes, setBienes] = useState<Bien[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Bien | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('pozo_agua');
  const [fechaInstalacion, setFechaInstalacion] = useState('');
  const [estado, setEstado] = useState<'funcionando' | 'mantenimiento' | 'fuera_servicio'>('funcionando');
  const [notas, setNotas] = useState('');

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setLoading(true);
    const { data } = await supabase.from('infraestructura').select('*').order('created_at', { ascending: false });
    setBienes((data as Bien[]) ?? []);
    setLoading(false);
  }

  function abrirNuevo() {
    setEditing(null);
    setNombre('');
    setTipo('pozo_agua');
    setFechaInstalacion('');
    setEstado('funcionando');
    setNotas('');
    setError('');
    setModalOpen(true);
  }

  function abrirEditar(bien: Bien) {
    setEditing(bien);
    setNombre(bien.nombre);
    setTipo(bien.tipo);
    setFechaInstalacion(bien.fecha_instalacion ?? '');
    setEstado(bien.estado);
    setNotas(bien.notas ?? '');
    setError('');
    setModalOpen(true);
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      nombre,
      tipo,
      fecha_instalacion: fechaInstalacion || null,
      estado,
      notas: notas || null,
    };

    const { error } = editing
      ? await supabase.from('infraestructura').update(payload).eq('id', editing.id)
      : await supabase.from('infraestructura').insert(payload);

    setSaving(false);

    if (error) {
      setError(`Error: ${error.message}`);
      return;
    }

    setModalOpen(false);
    cargar();
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: '#F3ECDD', fontSize: '1.75rem', margin: 0 }}>Infraestructura</h1>
          <p style={{ color: '#94a3b8', marginTop: '0.25rem' }}>Los bienes de la hacienda: pozos, tanques, galpones y más.</p>
        </div>
        <button
          onClick={abrirNuevo}
          style={{ padding: '0.7rem 1.4rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #E8C77E 0%, #C9974C 100%)', color: '#1F3326', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
        >
          + Nuevo bien
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Cargando...</p>
      ) : bienes.length === 0 ? (
        <div style={{ backgroundColor: '#1F3326', border: '1px dashed rgba(232,199,126,0.3)', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#D8CBB0', marginBottom: '1rem' }}>Todavía no has registrado ningún bien.</p>
          <button
            onClick={abrirNuevo}
            style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid #E8C77E', backgroundColor: 'transparent', color: '#E8C77E', cursor: 'pointer', fontWeight: 600 }}
          >
            Registrar el primero
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {bienes.map((bien) => {
            const estadoInfo = ESTADO_LABELS[bien.estado];
            return (
              <div
                key={bien.id}
                onClick={() => abrirEditar(bien)}
                style={{
                  backgroundColor: '#1F3326',
                  border: '1px solid rgba(232,199,126,0.15)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <h3 style={{ color: '#F3ECDD', fontSize: '1.1rem', margin: 0 }}>{bien.nombre}</h3>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px', color: estadoInfo.color, backgroundColor: estadoInfo.bg }}>
                    {estadoInfo.label}
                  </span>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.2rem 0' }}>{TIPO_LABELS[bien.tipo] ?? bien.tipo}</p>
                {bien.fecha_instalacion && <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.2rem 0' }}>Desde: {bien.fecha_instalacion}</p>}
                {bien.notas && <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: '0.4rem 0 0', fontStyle: 'italic' }}>{bien.notas}</p>}
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div onClick={() => setModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleGuardar}
            style={{ backgroundColor: '#1F3326', border: '1px solid rgba(232,199,126,0.2)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <h2 style={{ color: '#F3ECDD', fontSize: '1.3rem', margin: 0 }}>{editing ? 'Editar bien' : 'Nuevo bien'}</h2>

            <Campo label="Nombre">
              <input required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Pozo principal" style={inputStyle} />
            </Campo>

            <Campo label="Tipo">
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={inputStyle}>
                {Object.entries(TIPO_LABELS).map(([valor, label]) => (
                  <option key={valor} value={valor}>{label}</option>
                ))}
              </select>
            </Campo>

            <Campo label="Fecha de instalación / construcción">
              <input type="date" value={fechaInstalacion} onChange={(e) => setFechaInstalacion(e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Estado">
              <select value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)} style={inputStyle}>
                <option value="funcionando">Funcionando</option>
                <option value="mantenimiento">Necesita mantenimiento</option>
                <option value="fuera_servicio">Fuera de servicio</option>
              </select>
            </Campo>

            <Campo label="Notas">
              <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
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