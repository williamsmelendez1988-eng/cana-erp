'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getTasaBCV, TasaBCV } from '@/lib/bcv';
import { colors, card, buttonPrimary, buttonSecondary, inputStyle } from '@/lib/theme';
import { Users, Plus, Phone, Briefcase, IdCard, X } from 'lucide-react';

type Trabajador = {
  id: string;
  nombre_completo: string;
  cedula: string | null;
  cargo: string | null;
  salario_diario_usd: number | null;
  telefono: string | null;
  fecha_ingreso: string | null;
  estado: 'activo' | 'inactivo';
  notas: string | null;
};

const ESTADO_LABELS: Record<string, { label: string; color: string }> = {
  activo: { label: 'Activo', color: colors.success },
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

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function formatBs(valor: number) {
  return valor.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function usdABs(usd: number, tasa: TasaBCV | null): string | null {
  if (!tasa || !tasa.usd) return null;
  return formatBs(usd * tasa.usd);
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
  const [salarioDiarioUsd, setSalarioDiarioUsd] = useState('');
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
    setSalarioDiarioUsd('');
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
    setSalarioDiarioUsd(t.salario_diario_usd?.toString() ?? '');
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
      salario_diario_usd: salarioDiarioUsd ? parseFloat(salarioDiarioUsd) : null,
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

  const previewBs = salarioDiarioUsd ? usdABs(parseFloat(salarioDiarioUsd), tasa) : null;

  return (
    <div>
      <style>{`
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .trab-card {
          animation: fadeSlideUp 0.5s cubic-bezier(.16,1,.3,1) both;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .trab-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.28); border-color: rgba(232,199,126,0.3); }
        .trab-card:active { transform: scale(0.98); }
        .btn-primary { transition: transform 0.15s, box-shadow 0.15s; }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(201,151,76,0.35); }
        .btn-primary:active { transform: scale(0.97); }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: colors.cream, fontSize: '1.75rem', margin: 0 }}>Trabajadores</h1>
          <p style={{ color: colors.muted, marginTop: '0.25rem' }}>El personal de la hacienda.</p>
        </div>
        <button onClick={abrirNuevo} className="btn-primary" style={{ ...buttonPrimary, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={16} /> Nuevo trabajador
        </button>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        {tasaCargando ? (
          <span style={{ color: colors.muted, fontSize: '0.8rem' }}>Consultando tasa BCV...</span>
        ) : tasa ? (
          <span style={{ color: colors.gold, fontSize: '0.8rem', fontWeight: 600 }}>
            Tasa BCV hoy: Bs {formatBs(tasa.usd)} por $1 <span style={{ color: colors.muted, fontWeight: 400 }}>({tasa.fecha})</span>
          </span>
        ) : (
          <span style={{ color: colors.muted, fontSize: '0.8rem' }}>No se pudo obtener la tasa BCV hoy — mostrando solo dólares.</span>
        )}
      </div>

      {loading ? (
        <p style={{ color: colors.muted }}>Cargando trabajadores...</p>
      ) : trabajadores.length === 0 ? (
        <div style={{ ...card, border: `1px dashed ${colors.borderStrong}`, padding: '3rem', textAlign: 'center' }}>
          <Users size={28} color={colors.gold} style={{ marginBottom: '0.75rem' }} />
          <p style={{ color: '#D8CBB0', marginBottom: '1rem' }}>Todavía no has registrado ningún trabajador.</p>
          <button onClick={abrirNuevo} className="btn-primary" style={{ ...buttonPrimary, margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={16} /> Registrar el primero
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {trabajadores.map((t, i) => {
            const estadoInfo = ESTADO_LABELS[t.estado];
            const bs = t.salario_diario_usd != null ? usdABs(t.salario_diario_usd, tasa) : null;
            return (
              <div
                key={t.id}
                className="trab-card"
                onClick={() => abrirEditar(t)}
                style={{ ...card, cursor: 'pointer', position: 'relative', overflow: 'hidden', animationDelay: `${Math.min(i * 0.05, 0.4)}s` }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${estadoInfo.color}, transparent)` }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '9px', backgroundColor: `${estadoInfo.color}20`, color: estadoInfo.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={16} />
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px', color: estadoInfo.color, backgroundColor: `${estadoInfo.color}20` }}>
                    {estadoInfo.label}
                  </span>
                </div>
                <h3 style={{ color: colors.cream, fontSize: '1.1rem', margin: '0 0 0.5rem' }}>{t.nombre_completo}</h3>
                {t.cargo && (
                  <p style={{ color: colors.muted, fontSize: '0.85rem', margin: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Briefcase size={13} /> {t.cargo}
                  </p>
                )}
                {t.cedula && (
                  <p style={{ color: colors.muted, fontSize: '0.85rem', margin: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <IdCard size={13} /> {t.cedula}
                  </p>
                )}
                {t.salario_diario_usd != null && (
                  <p style={{ margin: '0.4rem 0 0.25rem' }}>
                    <span style={{ color: colors.gold, fontWeight: 700 }}>${t.salario_diario_usd.toFixed(2)} / día</span>
                    {bs && <span style={{ color: colors.muted, fontSize: '0.85rem' }}> · ≈ Bs {bs}</span>}
                  </p>
                )}
                {t.telefono && (
                  <p style={{ color: colors.muted, fontSize: '0.85rem', margin: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Phone size={13} /> {t.telefono}
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
              <h2 style={{ color: colors.cream, fontSize: '1.3rem', margin: 0 }}>{editing ? 'Editar trabajador' : 'Nuevo trabajador'}</h2>
              <button type="button" onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: colors.muted, cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <Campo label="Nombre completo">
              <input required value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Cédula">
              <input value={cedula} onChange={(e) => setCedula(e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Cargo">
              <input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ej: Cortador, Capataz" style={inputStyle} />
            </Campo>

            <Campo label="Salario diario ($)">
              <input type="number" step="0.01" min="0" value={salarioDiarioUsd} onChange={(e) => setSalarioDiarioUsd(e.target.value)} style={inputStyle} />
              {previewBs && <span style={{ color: colors.muted, fontSize: '0.8rem' }}>≈ Bs {previewBs} a la tasa de hoy</span>}
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