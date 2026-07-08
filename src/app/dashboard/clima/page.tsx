'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getClimaHoy, ClimaHoy } from '@/lib/clima';

type RegistroLluvia = {
  id: string;
  fecha: string;
  mm_lluvia: number;
  notas: string | null;
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

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function inicioMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function inicioAno() {
  const d = new Date();
  return new Date(d.getFullYear(), 0, 1).toISOString().slice(0, 10);
}

function inicioSemana() {
  const d = new Date();
  const dia = d.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  const lunes = new Date(d);
  lunes.setDate(d.getDate() + diff);
  return lunes.toISOString().slice(0, 10);
}

export default function ClimaPage() {
  const [climaHoy, setClimaHoy] = useState<ClimaHoy | null>(null);
  const [climaError, setClimaError] = useState('');
  const [cargandoClima, setCargandoClima] = useState(true);

  const [registros, setRegistros] = useState<RegistroLluvia[]>([]);
  const [cargandoRegistros, setCargandoRegistros] = useState(true);

  const [mmHoy, setMmHoy] = useState('');
  const [notasHoy, setNotasHoy] = useState('');
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    cargarClima();
    cargarRegistros();
  }, []);

  async function cargarClima() {
    setCargandoClima(true);
    setClimaError('');
    const { data: hacienda } = await supabase.from('hacienda').select('latitud, longitud').limit(1).maybeSingle();

    if (!hacienda?.latitud || !hacienda?.longitud) {
      setClimaError('Falta configurar la ubicación en "Mi Hacienda" para traer el clima automático.');
      setCargandoClima(false);
      return;
    }

    const clima = await getClimaHoy(hacienda.latitud, hacienda.longitud);
    if (!clima) {
      setClimaError('No se pudo obtener el clima en este momento. Intenta más tarde.');
    } else {
      setClimaHoy(clima);
    }
    setCargandoClima(false);
  }

  async function cargarRegistros() {
    setCargandoRegistros(true);
    const { data } = await supabase
      .from('registro_pluviometrico')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(60);
    const lista = (data as RegistroLluvia[]) ?? [];
    setRegistros(lista);

    const registroDeHoy = lista.find((r) => r.fecha === hoy());
    if (registroDeHoy) {
      setMmHoy(registroDeHoy.mm_lluvia.toString());
      setNotasHoy(registroDeHoy.notas ?? '');
    }
    setCargandoRegistros(false);
  }

  async function guardarLluviaHoy(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMensaje('');

    const { error } = await supabase.from('registro_pluviometrico').upsert(
      {
        fecha: hoy(),
        mm_lluvia: mmHoy ? parseFloat(mmHoy) : 0,
        notas: notasHoy || null,
      },
      { onConflict: 'fecha' }
    );

    setSaving(false);

    if (!error) {
      setMensaje('Registro de hoy guardado.');
      setTimeout(() => setMensaje(''), 3000);
      cargarRegistros();
    }
  }

  function sumaDesde(fechaInicio: string) {
    return registros.filter((r) => r.fecha >= fechaInicio).reduce((sum, r) => sum + r.mm_lluvia, 0);
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#F3ECDD', fontSize: '1.75rem', margin: 0 }}>Clima</h1>
        <p style={{ color: '#94a3b8', marginTop: '0.25rem' }}>Temperatura automática y tu registro de lluvia.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: '#1F3326', border: '1px solid rgba(232,199,126,0.15)', borderRadius: '12px', padding: '1.5rem' }}>
          <p style={{ color: '#D8CBB0', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Clima de hoy (automático)</p>
          {cargandoClima ? (
            <p style={{ color: '#94a3b8' }}>Consultando...</p>
          ) : climaError ? (
            <p style={{ color: '#F5A3A3', fontSize: '0.85rem' }}>{climaError}</p>
          ) : climaHoy ? (
            <>
              <p style={{ color: '#E8C77E', fontSize: '2rem', fontWeight: 700, margin: 0 }}>
                {climaHoy.temperaturaMax}° <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 400 }}>/ {climaHoy.temperaturaMin}°</span>
              </p>
              <p style={{ color: '#93C5FD', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                🌧️ {climaHoy.probabilidadLluvia}% de probabilidad de lluvia
              </p>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.3rem' }}>
                Estimado del pronóstico: {climaHoy.precipitacionMm} mm
              </p>
            </>
          ) : null}
        </div>

        <div style={{ backgroundColor: '#1F3326', border: '1px solid rgba(232,199,126,0.15)', borderRadius: '12px', padding: '1.5rem' }}>
          <p style={{ color: '#D8CBB0', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Lluvia acumulada (tu pluviómetro)</p>
          {cargandoRegistros ? (
            <p style={{ color: '#94a3b8' }}>Cargando...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <p style={{ color: '#F3ECDD', margin: 0 }}>Esta semana: <strong style={{ color: '#E8C77E' }}>{sumaDesde(inicioSemana()).toFixed(1)} mm</strong></p>
              <p style={{ color: '#F3ECDD', margin: 0 }}>Este mes: <strong style={{ color: '#E8C77E' }}>{sumaDesde(inicioMes()).toFixed(1)} mm</strong></p>
              <p style={{ color: '#F3ECDD', margin: 0 }}>Este año: <strong style={{ color: '#E8C77E' }}>{sumaDesde(inicioAno()).toFixed(1)} mm</strong></p>
            </div>
          )}
        </div>
      </div>

      <div style={{ backgroundColor: '#1F3326', border: '1px solid rgba(232,199,126,0.2)', borderRadius: '12px', padding: '1.5rem', maxWidth: '420px', marginBottom: '2rem' }}>
        <h2 style={{ color: '#F3ECDD', fontSize: '1.1rem', margin: '0 0 1rem' }}>Anotar lo que marcó el pluviómetro hoy</h2>
        <form onSubmit={guardarLluviaHoy} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div>
            <label style={{ color: '#D8CBB0', fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>Milímetros de hoy</label>
            <input type="number" step="0.1" min="0" value={mmHoy} onChange={(e) => setMmHoy(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ color: '#D8CBB0', fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>Notas (opcional)</label>
            <input value={notasHoy} onChange={(e) => setNotasHoy(e.target.value)} style={inputStyle} />
          </div>
          <button
            type="submit"
            disabled={saving}
            style={{ padding: '0.7rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #E8C77E 0%, #C9974C 100%)', color: '#1F3326', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}
          >
            {saving ? 'Guardando...' : 'Guardar registro de hoy'}
          </button>
          {mensaje && <span style={{ color: '#4ADE80', fontSize: '0.85rem' }}>{mensaje}</span>}
        </form>
      </div>

      <h2 style={{ color: '#F3ECDD', fontSize: '1.2rem', marginBottom: '1rem' }}>Últimos registros</h2>
      {cargandoRegistros ? (
        <p style={{ color: '#94a3b8' }}>Cargando...</p>
      ) : registros.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>Todavía no hay registros de lluvia.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {registros.slice(0, 14).map((r) => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#1F3326', borderRadius: '8px', padding: '0.6rem 1rem', border: '1px solid rgba(232,199,126,0.08)' }}>
              <span style={{ color: '#D8CBB0', fontSize: '0.85rem' }}>{r.fecha}</span>
              <span style={{ color: '#93C5FD', fontSize: '0.85rem', fontWeight: 600 }}>{r.mm_lluvia} mm</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}