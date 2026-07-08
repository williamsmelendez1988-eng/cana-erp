'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Hacienda = {
  id: string;
  nombre: string;
  latitud: number | null;
  longitud: number | null;
  superficie_hectareas: number | null;
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

export default function HaciendaPage() {
  const [hacienda, setHacienda] = useState<Hacienda | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [ubicando, setUbicando] = useState(false);

  const [nombre, setNombre] = useState('');
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');
  const [superficie, setSuperficie] = useState('');

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setLoading(true);
    const { data } = await supabase.from('hacienda').select('*').limit(1).maybeSingle();
    if (data) {
      setHacienda(data as Hacienda);
      setNombre(data.nombre ?? '');
      setLatitud(data.latitud?.toString() ?? '');
      setLongitud(data.longitud?.toString() ?? '');
      setSuperficie(data.superficie_hectareas?.toString() ?? '');
    }
    setLoading(false);
  }

  function usarUbicacionActual() {
    if (!navigator.geolocation) {
      setError('Este navegador no puede obtener tu ubicación. Ingresa las coordenadas a mano.');
      return;
    }
    setUbicando(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitud(pos.coords.latitude.toFixed(6));
        setLongitud(pos.coords.longitude.toFixed(6));
        setUbicando(false);
      },
      () => {
        setError('No se pudo obtener tu ubicación. Revisa los permisos del navegador o ingrésala a mano.');
        setUbicando(false);
      }
    );
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMensaje('');
    setSaving(true);

    const payload = {
      nombre,
      latitud: latitud ? parseFloat(latitud) : null,
      longitud: longitud ? parseFloat(longitud) : null,
      superficie_hectareas: superficie ? parseFloat(superficie) : null,
    };

    const { error } = hacienda
      ? await supabase.from('hacienda').update(payload).eq('id', hacienda.id)
      : await supabase.from('hacienda').insert(payload);

    setSaving(false);

    if (error) {
      setError(`Error: ${error.message}`);
      return;
    }

    setMensaje('Datos de la hacienda guardados.');
    setTimeout(() => setMensaje(''), 3000);
    cargar();
  }

  if (loading) {
    return <p style={{ color: '#94a3b8' }}>Cargando...</p>;
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#F3ECDD', fontSize: '1.75rem', margin: 0 }}>Mi Hacienda</h1>
        <p style={{ color: '#94a3b8', marginTop: '0.25rem' }}>
          Esta información se usa para traer el clima automático de tu finca.
        </p>
      </div>

      <form
        onSubmit={handleGuardar}
        style={{
          backgroundColor: '#1F3326',
          border: '1px solid rgba(232,199,126,0.15)',
          borderRadius: '12px',
          padding: '1.5rem',
          maxWidth: '480px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <Campo label="Nombre de la hacienda">
          <input required value={nombre} onChange={(e) => setNombre(e.target.value)} style={inputStyle} />
        </Campo>

        <Campo label="Superficie total (hectáreas)">
          <input type="number" step="0.01" min="0" value={superficie} onChange={(e) => setSuperficie(e.target.value)} style={inputStyle} />
        </Campo>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <Campo label="Latitud">
              <input type="number" step="0.000001" value={latitud} onChange={(e) => setLatitud(e.target.value)} style={inputStyle} />
            </Campo>
          </div>
          <div style={{ flex: 1 }}>
            <Campo label="Longitud">
              <input type="number" step="0.000001" value={longitud} onChange={(e) => setLongitud(e.target.value)} style={inputStyle} />
            </Campo>
          </div>
        </div>

        <button
          type="button"
          onClick={usarUbicacionActual}
          disabled={ubicando}
          style={{
            padding: '0.6rem',
            borderRadius: '8px',
            border: '1px solid rgba(232,199,126,0.3)',
            backgroundColor: 'transparent',
            color: '#E8C77E',
            cursor: ubicando ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          {ubicando ? 'Obteniendo ubicación...' : '📍 Usar mi ubicación actual'}
        </button>
        <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: 0 }}>
          Si estás parado en la hacienda cuando le des clic, toma la coordenada exacta. Si no, busca tu finca en Google Maps, mantén presionado sobre el punto, y copia los números que aparecen ahí.
        </p>

        {error && <p style={{ color: '#F5A3A3', fontSize: '0.85rem', margin: 0 }}>{error}</p>}
        {mensaje && <p style={{ color: '#4ADE80', fontSize: '0.85rem', margin: 0 }}>{mensaje}</p>}

        <button
          type="submit"
          disabled={saving}
          style={{
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
      </form>
    </div>
  );
}