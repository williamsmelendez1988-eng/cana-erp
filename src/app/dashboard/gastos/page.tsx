'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getTasaBCV, TasaBCV } from '@/lib/bcv';

type LoteSimple = { id: string; nombre: string };

type Gasto = {
  id: string;
  categoria: string;
  descripcion: string;
  monto_usd: number;
  fecha: string;
  lote_id: string | null;
  lotes: { nombre: string } | null;
};

const CATEGORIA_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  sueldos: { label: 'Sueldos', color: '#E8C77E', bg: 'rgba(232,199,126,0.15)' },
  combustible: { label: 'Combustible', color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
  electricidad: { label: 'Electricidad', color: '#93C5FD', bg: 'rgba(147,197,253,0.12)' },
  repuestos: { label: 'Repuestos', color: '#C4B5FD', bg: 'rgba(196,181,253,0.12)' },
  fertilizantes: { label: 'Fertilizantes', color: '#4ADE80', bg: 'rgba(74,222,128,0.12)' },
  herramientas: { label: 'Herramientas', color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
  servicios: { label: 'Servicios', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
  otros: { label: 'Otros', color: '#D8CBB0', bg: 'rgba(216,203,176,0.1)' },
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

function primerDiaMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function formatBs(valor: number) {
  return valor.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function GastosPage() {
  const [periodoInicio, setPeriodoInicio] = useState(primerDiaMes());
  const [periodoFin, setPeriodoFin] = useState(hoy());
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [lotes, setLotes] = useState<LoteSimple[]>([]);
  const [tasa, setTasa] = useState<TasaBCV | null>(null);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [categoria, setCategoria] = useState('sueldos');
  const [descripcion, setDescripcion] = useState('');
  const [montoUsd, setMontoUsd] = useState('');
  const [loteId, setLoteId] = useState('');
  const [fecha, setFecha] = useState(hoy());

  useEffect(() => {
    cargarLotes();
    getTasaBCV().then(setTasa);
  }, []);

  useEffect(() => {
    cargarGastos();
  }, [periodoInicio, periodoFin]);

  async function cargarLotes() {
    const { data } = await supabase.from('lotes').select('id, nombre').order('nombre');
    setLotes((data as LoteSimple[]) ?? []);
  }

  async function cargarGastos() {
    setLoading(true);
    const { data, error } = await supabase
      .from('gastos')
      .select('id, categoria, descripcion, monto_usd, fecha, lote_id, lotes(nombre)')
      .gte('fecha', periodoInicio)
      .lte('fecha', periodoFin)
      .order('fecha', { ascending: false });
    if (!error && data) setGastos(data as unknown as Gasto[]);
    setLoading(false);
  }

  function abrirNuevo() {
    setCategoria('sueldos');
    setDescripcion('');
    setMontoUsd('');
    setLoteId('');
    setFecha(hoy());
    setError('');
    setModalOpen(true);
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const { error } = await supabase.from('gastos').insert({
      categoria,
      descripcion,
      monto_usd: parseFloat(montoUsd),
      lote_id: loteId || null,
      fecha,
    });

    setSaving(false);

    if (error) {
      setError(`Error: ${error.message}`);
      return;
    }

    setModalOpen(false);
    cargarGastos();
  }

  const totalUsd = gastos.reduce((sum, g) => sum + g.monto_usd, 0);

  const totalesPorCategoria = Object.keys(CATEGORIA_LABELS)
    .map((cat) => ({
      cat,
      total: gastos.filter((g) => g.categoria === cat).reduce((sum, g) => sum + g.monto_usd, 0),
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: '#F3ECDD', fontSize: '1.75rem', margin: 0 }}>Gastos</h1>
          <p style={{ color: '#94a3b8', marginTop: '0.25rem' }}>Todo lo que sale de la hacienda.</p>
        </div>
        <button
          onClick={abrirNuevo}
          style={{ padding: '0.7rem 1.4rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #E8C77E 0%, #C9974C 100%)', color: '#1F3326', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
        >
          + Nuevo gasto
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ color: '#D8CBB0', fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>Desde</label>
          <input type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} style={{ ...inputStyle, width: '160px' }} />
        </div>
        <div>
          <label style={{ color: '#D8CBB0', fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>Hasta</label>
          <input type="date" value={periodoFin} onChange={(e) => setPeriodoFin(e.target.value)} style={{ ...inputStyle, width: '160px' }} />
        </div>
      </div>

      <div style={{ backgroundColor: '#1F3326', border: '1px solid rgba(232,199,126,0.2)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ color: '#D8CBB0', fontSize: '0.8rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total del período</p>
          <p style={{ color: '#E8C77E', fontSize: '1.8rem', fontWeight: 700, margin: '0.25rem 0 0' }}>
            ${totalUsd.toFixed(2)}
            {tasa && <span style={{ color: '#94a3b8', fontSize: '1rem', fontWeight: 400 }}> · Bs {formatBs(totalUsd * tasa.usd)}</span>}
          </p>
        </div>
        {totalesPorCategoria.length > 0 && (
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            {totalesPorCategoria.map((c) => {
              const info = CATEGORIA_LABELS[c.cat];
              return (
                <span key={c.cat} style={{ color: info.color, backgroundColor: info.bg, padding: '0.3rem 0.7rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600 }}>
                  {info.label}: ${c.total.toFixed(2)}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Cargando gastos...</p>
      ) : gastos.length === 0 ? (
        <div style={{ backgroundColor: '#1F3326', border: '1px dashed rgba(232,199,126,0.3)', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#D8CBB0', marginBottom: '1rem' }}>No hay gastos registrados en este período.</p>
          <button
            onClick={abrirNuevo}
            style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid #E8C77E', backgroundColor: 'transparent', color: '#E8C77E', cursor: 'pointer', fontWeight: 600 }}
          >
            Registrar el primero
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {gastos.map((g) => {
            const info = CATEGORIA_LABELS[g.categoria] ?? CATEGORIA_LABELS.otros;
            return (
              <div
                key={g.id}
                style={{
                  backgroundColor: '#1F3326',
                  border: '1px solid rgba(232,199,126,0.12)',
                  borderRadius: '10px',
                  padding: '0.9rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flexWrap: 'wrap' }}>
                  <span style={{ color: info.color, backgroundColor: info.bg, padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>
                    {info.label}
                  </span>
                  <span style={{ color: '#F3ECDD' }}>{g.descripcion}</span>
                  {g.lotes?.nombre && <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>· {g.lotes.nombre}</span>}
                  <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>· {g.fecha}</span>
                </div>
                <span style={{ color: '#E8C77E', fontWeight: 700 }}>${g.monto_usd.toFixed(2)}</span>
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
            <h2 style={{ color: '#F3ECDD', fontSize: '1.3rem', margin: 0 }}>Nuevo gasto</h2>

            <Campo label="Categoría">
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={inputStyle}>
                {Object.entries(CATEGORIA_LABELS).map(([valor, info]) => (
                  <option key={valor} value={valor}>{info.label}</option>
                ))}
              </select>
            </Campo>

            <Campo label="Descripción">
              <input required value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej: Diesel para el tractor" style={inputStyle} />
            </Campo>

            <Campo label="Monto ($)">
              <input type="number" step="0.01" min="0" required value={montoUsd} onChange={(e) => setMontoUsd(e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Tablón relacionado (opcional)">
              <select value={loteId} onChange={(e) => setLoteId(e.target.value)} style={inputStyle}>
                <option value="">Gasto general de la hacienda</option>
                {lotes.map((l) => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
              </select>
            </Campo>

            <Campo label="Fecha">
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={inputStyle} />
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