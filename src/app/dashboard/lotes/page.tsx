'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Lote = {
  id: string;
  nombre: string;
  codigo: string | null;
  area_hectareas: number | null;
  estado: 'activo' | 'en_cosecha' | 'inactivo';
  fecha_siembra: string | null;
  notas: string | null;
};

const ESTADO_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  activo: { label: 'Activo', color: '#4ADE80', bg: 'rgba(74,222,128,0.12)' },
  en_cosecha: { label: 'En cosecha', color: '#E8C77E', bg: 'rgba(232,199,126,0.15)' },
  inactivo: { label: 'Inactivo', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: '#F3ECDD', fontSize: '1.75rem', margin: 0 }}>Tablones</h1>
          <p style={{ color: '#94a3b8', marginTop: '0.25rem' }}>Los tablones de la hacienda, uno por parcela.</p>
        </div>
        <button
          onClick={abrirNuevo}
          style={{
            padding: '0.7rem 1.4rem',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #E8C77E 0%, #C9974C 100%)',
            color: '#1F3326',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          + Nuevo tablón
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Cargando tablones...</p>
      ) : lotes.length === 0 ? (
        <div style={{ backgroundColor: '#1F3326', border: '1px dashed rgba(232,199,126,0.3)', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#D8CBB0', marginBottom: '1rem' }}>Todavía no has registrado ningún tablón.</p>
          <button
            onClick={abrirNuevo}
            style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid #E8C77E', backgroundColor: 'transparent', color: '#E8C77E', cursor: 'pointer', fontWeight: 600 }}
          >
            Registrar el primero
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {lotes.map((lote) => {
            const estadoInfo = ESTADO_LABELS[lote.estado];
            return (
              <div
                key={lote.id}
                onClick={() => abrirEditar(lote)}
                style={{
                  backgroundColor: '#1F3326',
                  border: '1px solid rgba(232,199,126,0.15)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <h3 style={{ color: '#F3ECDD', fontSize: '1.1rem', margin: 0 }}>{lote.nombre}</h3>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px', color: estadoInfo.color, backgroundColor: estadoInfo.bg }}>
                    {estadoInfo.label}
                  </span>
                </div>
                {lote.codigo && <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.2rem 0' }}>Código: {lote.codigo}</p>}
                {lote.area_hectareas != null && <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.2rem 0' }}>{lote.area_hectareas} hectáreas</p>}
                {lote.fecha_siembra && <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.2rem 0' }}>Sembrado: {lote.fecha_siembra}</p>}
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleGuardar}
            style={{
              backgroundColor: '#1F3326',
              border: '1px solid rgba(232,199,126,0.2)',
              borderRadius: '16px',
              padding: '2rem',
              width: '100%',
              maxWidth: '420px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <h2 style={{ color: '#F3ECDD', fontSize: '1.3rem', margin: 0 }}>{editing ? 'Editar tablón' : 'Nuevo tablón'}</h2>

            <Campo label="Nombre">
              <input required value={nombre} onChange={(e) => setNombre(e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Código (opcional)">
              <input value={codigo} onChange={(e) => setCodigo(e.target.value)} style={inputStyle} />
            </Campo>

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

            <Campo label="Notas">
              <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </Campo>

            {error && <p style={{ color: '#F5A3A3', fontSize: '0.85rem', margin: 0 }}>{error}</p>}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ flex: 1, padding: '0.7rem', borderRadius: '10px', border: '1px solid rgba(216,203,176,0.25)', backgroundColor: 'transparent', color: '#D8CBB0', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '0.7rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #E8C77E 0%, #C9974C 100%)',
                  color: '#1F3326',
                  fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
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