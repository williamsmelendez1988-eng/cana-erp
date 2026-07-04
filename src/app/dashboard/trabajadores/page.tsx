'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getTasaBCV, TasaBCV } from '@/lib/bcv';

type Trabajador = {
  id: string;
  nombre_completo: string;
  cedula: string | null;
  cargo: string | null;
  salario_diario: number | null;
  telefono: string | null;
  fecha_ingreso: string | null;
  estado: 'activo' | 'inactivo';
  notas: string | null;
};

const ESTADO_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  activo: { label: 'Activo', color: '#4ADE80', bg: 'rgba(74,222,128,0.12)' },
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

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function formatBs(valor: number) {
  return valor.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function bsAUsd(bs: number, tasa: TasaBCV | null): string | null {
  if (!tasa || !tasa.usd) return null;
  return (bs / tasa.usd).toFixed(2);
}

export default function TrabajadoresPage() {
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Trabajador | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tasa, setTasa] = useState<TasaBCV | null>(null);
  const [tasaCargando, setTasaCargando] = useState(true);

  const [nombreCompleto, setNombreCompleto] = useState('');
  const [cedula, setCedula] = useState('');
  const [cargo, setCargo] = useState('');
  const [salarioDiario, setSalarioDiario] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaIngreso, setFechaIngreso] = useState(hoy());
  const [estado, setEstado] = useState<'activo' | 'inactivo'>('activo');
  const [notas, setNotas] = useState('');

  useEffect(() => {
    cargarTrabajadores();
    getTasaBCV().then((t) => {
      setTasa(t);
      setTasaCargando(false);
    });
  }, []);

  async function cargarTrabajadores() {
    setLoading(true);
    const { data, error } = await supabase.from('trabajadores').select('*').order('created_at', { ascending: false });
    if (!error && data) setTrabajadores(data as Trabajador[]);
    setLoading(false);
  }

  function abrirNuevo() {
    setEditing(null);
    setNombreCompleto('');
    setCedula('');
    setCargo('');
    setSalarioDiario('');
    setTelefono('');
    setFechaIngreso(hoy());
    setEstado('activo');
    setNotas('');
    setError('');
    setModalOpen(true);
  }

  function abrirEditar(t: Trabajador) {
    setEditing(t);
    setNombreCompleto(t.nombre_completo);
    setCedula(t.cedula ?? '');
    setCargo(t.cargo ?? '');
    setSalarioDiario(t.salario_diario?.toString() ?? '');
    setTelefono(t.telefono ?? '');
    setFechaIngreso(t.fecha_ingreso ?? hoy());
    setEstado(t.estado);
    setNotas(t.notas ?? '');
    setError('');
    setModalOpen(true);
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      nombre_completo: nombreCompleto,
      cedula: cedula || null,
      cargo: cargo || null,
      salario_diario: salarioDiario ? parseFloat(salarioDiario) : null,
      telefono: telefono || null,
      fecha_ingreso: fechaIngreso || null,
      estado,
      notas: notas || null,
    };

    const { error } = editing
      ? await supabase.from('trabajadores').update(payload).eq('id', editing.id)
      : await supabase.from('trabajadores').insert(payload);

    setSaving(false);

    if (error) {
      setError(error.message.includes('duplicate') ? 'Esa cédula ya está registrada a otro trabajador.' : `Error: ${error.message}`);
      return;
    }

    setModalOpen(false);
    cargarTrabajadores();
  }

  const previewUsd = salarioDiario ? bsAUsd(parseFloat(salarioDiario), tasa) : null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: '#F3ECDD', fontSize: '1.75rem', margin: 0 }}>Trabajadores</h1>
          <p style={{ color: '#94a3b8', marginTop: '0.25rem' }}>El personal de la hacienda.</p>
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
          + Nuevo trabajador
        </button>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        {tasaCargando ? (
          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Consultando tasa BCV...</span>
        ) : tasa ? (
          <span style={{ color: '#E8C77E', fontSize: '0.8rem', fontWeight: 600 }}>
            Tasa BCV hoy: Bs {formatBs(tasa.usd)} por $1 <span style={{ color: '#94a3b8', fontWeight: 400 }}>({tasa.fecha})</span>
          </span>
        ) : (
          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No se pudo obtener la tasa BCV hoy — mostrando solo bolívares.</span>
        )}
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Cargando trabajadores...</p>
      ) : trabajadores.length === 0 ? (
        <div style={{ backgroundColor: '#1F3326', border: '1px dashed rgba(232,199,126,0.3)', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#D8CBB0', marginBottom: '1rem' }}>Todavía no has registrado ningún trabajador.</p>
          <button
            onClick={abrirNuevo}
            style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid #E8C77E', backgroundColor: 'transparent', color: '#E8C77E', cursor: 'pointer', fontWeight: 600 }}
          >
            Registrar el primero
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {trabajadores.map((t) => {
            const estadoInfo = ESTADO_LABELS[t.estado];
            const usd = t.salario_diario != null ? bsAUsd(t.salario_diario, tasa) : null;
            return (
              <div
                key={t.id}
                onClick={() => abrirEditar(t)}
                style={{
                  backgroundColor: '#1F3326',
                  border: '1px solid rgba(232,199,126,0.15)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <h3 style={{ color: '#F3ECDD', fontSize: '1.1rem', margin: 0 }}>{t.nombre_completo}</h3>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px', color: estadoInfo.color, backgroundColor: estadoInfo.bg }}>
                    {estadoInfo.label}
                  </span>
                </div>
                {t.cargo && <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.2rem 0' }}>{t.cargo}</p>}
                {t.cedula && <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.2rem 0' }}>Cédula: {t.cedula}</p>}
                {t.salario_diario != null && (
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.2rem 0' }}>
                    Bs {formatBs(t.salario_diario)} / día
                    {usd && <span style={{ color: '#E8C77E', fontWeight: 600 }}> · ≈ ${usd}</span>}
                  </p>
                )}
                {t.telefono && <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.2rem 0' }}>{t.telefono}</p>}
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
            <h2 style={{ color: '#F3ECDD', fontSize: '1.3rem', margin: 0 }}>{editing ? 'Editar trabajador' : 'Nuevo trabajador'}</h2>

            <Campo label="Nombre completo">
              <input required value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Cédula">
              <input value={cedula} onChange={(e) => setCedula(e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Cargo">
              <input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ej: Cortador, Capataz" style={inputStyle} />
            </Campo>

            <Campo label="Salario diario (Bs)">
              <input type="number" step="0.01" min="0" value={salarioDiario} onChange={(e) => setSalarioDiario(e.target.value)} style={inputStyle} />
              {previewUsd && (
                <span style={{ color: '#E8C77E', fontSize: '0.8rem' }}>≈ ${previewUsd} a la tasa de hoy</span>
              )}
            </Campo>

            <Campo label="Teléfono">
              <input value={telefono} onChange={(e) => setTelefono(e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Fecha de ingreso">
              <input type="date" value={fechaIngreso} onChange={(e) => setFechaIngreso(e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Estado">
              <select value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)} style={inputStyle}>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
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