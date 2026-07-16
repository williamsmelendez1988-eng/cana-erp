'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { colors, card, buttonPrimary, buttonSecondary } from '@/lib/theme';
import { MapPin, Footprints, Check, RotateCcw } from 'lucide-react';

type LoteSimple = { id: string; nombre: string; area_hectareas: number | null };
type Punto = { lat: number; lng: number };

function distanciaMetros(a: Punto, b: Punto): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function calcularAreaHectareas(puntos: Punto[]): number {
  if (puntos.length < 3) return 0;
  const lat0Rad = (puntos[0].lat * Math.PI) / 180;
  const metrosPerGradoLat = 110540;
  const metrosPerGradoLng = 111320 * Math.cos(lat0Rad);

  const coords = puntos.map((p) => ({
    x: (p.lng - puntos[0].lng) * metrosPerGradoLng,
    y: (p.lat - puntos[0].lat) * metrosPerGradoLat,
  }));

  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    area += coords[i].x * coords[j].y;
    area -= coords[j].x * coords[i].y;
  }
  return Math.abs(area) / 2 / 10000;
}

export default function MedirTablonPage() {
  const router = useRouter();
  const [tablones, setTablones] = useState<LoteSimple[]>([]);
  const [tablonId, setTablonId] = useState('');
  const [loadingTablones, setLoadingTablones] = useState(true);

  const [midiendo, setMidiendo] = useState(false);
  const [puntos, setPuntos] = useState<Punto[]>([]);
  const [distanciaTotal, setDistanciaTotal] = useState(0);
  const [precisionActual, setPrecisionActual] = useState<number | null>(null);
  const [errorGps, setErrorGps] = useState('');

  const [areaCalculada, setAreaCalculada] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    cargarTablones();
    return () => detenerWatch();
  }, []);

  async function cargarTablones() {
    setLoadingTablones(true);
    const { data } = await supabase.from('lotes').select('id, nombre, area_hectareas').order('nombre');
    const lista = (data as LoteSimple[]) ?? [];
    setTablones(lista);
    if (lista.length > 0) setTablonId(lista[0].id);
    setLoadingTablones(false);
  }

  function detenerWatch() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }

  function iniciarMedicion() {
    if (!navigator.geolocation) {
      setErrorGps('Este navegador no puede acceder al GPS.');
      return;
    }
    setPuntos([]);
    setDistanciaTotal(0);
    setAreaCalculada(null);
    setErrorGps('');
    setMidiendo(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setPrecisionActual(accuracy);

        if (accuracy > 25) return;

        setPuntos((prev) => {
          const nuevo = { lat: latitude, lng: longitude };
          if (prev.length === 0) return [nuevo];
          const ultimo = prev[prev.length - 1];
          const d = distanciaMetros(ultimo, nuevo);
          if (d < 3) return prev;
          setDistanciaTotal((dt) => dt + d);
          return [...prev, nuevo];
        });
      },
      () => setErrorGps('No se pudo acceder a tu ubicación. Revisa los permisos de GPS del navegador.'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  }

  function terminarYCalcular() {
    detenerWatch();
    setMidiendo(false);
    if (puntos.length < 3) {
      setErrorGps('No se capturaron suficientes puntos. Intenta de nuevo caminando más despacio por el borde.');
      return;
    }
    setAreaCalculada(calcularAreaHectareas(puntos));
  }

  function reintentar() {
    setPuntos([]);
    setDistanciaTotal(0);
    setAreaCalculada(null);
    setErrorGps('');
  }

  async function guardarMedida() {
    if (areaCalculada == null || !tablonId) return;
    setGuardando(true);
    const { error } = await supabase.from('lotes').update({ area_hectareas: Number(areaCalculada.toFixed(2)) }).eq('id', tablonId);
    setGuardando(false);
    if (!error) {
      setMensaje('Área guardada correctamente en el tablón.');
      cargarTablones();
    }
  }

  const tablonActual = tablones.find((t) => t.id === tablonId);

  return (
    <div>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .gps-pulse { animation: pulse 1.4s ease-in-out infinite; }
        .btn-primary { transition: transform 0.15s, box-shadow 0.15s; }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(201,151,76,0.35); }
      `}</style>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: colors.cream, fontSize: '1.75rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Footprints size={26} color={colors.gold} /> Medir tablón con GPS
        </h1>
        <p style={{ color: colors.muted, marginTop: '0.25rem' }}>
          Camina todo el borde del terreno y el sistema calcula el área solo.
        </p>
      </div>

      {loadingTablones ? (
        <p style={{ color: colors.muted }}>Cargando tablones...</p>
      ) : tablones.length === 0 ? (
        <div style={{ ...card, border: `1px dashed ${colors.borderStrong}`, padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: '#D8CBB0' }}>Primero registra el tablón (con su nombre) en la sección Tablones, y luego vuelve aquí a medirlo.</p>
        </div>
      ) : (
        <div style={{ ...card, maxWidth: '480px' }}>
          {!midiendo && areaCalculada == null && (
            <>
              <label style={{ color: '#D8CBB0', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>¿Qué tablón vas a medir?</label>
              <select
                value={tablonId}
                onChange={(e) => setTablonId(e.target.value)}
                style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '10px', border: `1px solid ${colors.border}`, backgroundColor: 'rgba(255,255,255,0.04)', color: colors.cream, fontSize: '1rem', marginBottom: '1.25rem' }}
              >
                {tablones.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}{t.area_hectareas ? ` (actual: ${t.area_hectareas} ha)` : ''}</option>
                ))}
              </select>

              <p style={{ color: colors.muted, fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Párate en cualquier punto del borde del tablón antes de iniciar. Camina despacio, pegado al límite real del terreno, hasta dar la vuelta completa.
              </p>

              {errorGps && <p style={{ color: colors.danger, fontSize: '0.85rem', marginBottom: '1rem' }}>{errorGps}</p>}

              <button onClick={iniciarMedicion} className="btn-primary" style={{ ...buttonPrimary, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <MapPin size={18} /> Iniciar caminata
              </button>
            </>
          )}

          {midiendo && (
            <div style={{ textAlign: 'center' }}>
              <div className="gps-pulse" style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: `${colors.gold}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                <MapPin size={30} color={colors.gold} />
              </div>
              <p style={{ color: colors.cream, fontWeight: 600, marginBottom: '0.25rem' }}>Midiendo — {tablonActual?.nombre}</p>
              <p style={{ color: colors.muted, fontSize: '0.85rem', marginBottom: '1.5rem' }}>Sigue caminando por el borde del tablón</p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1.5rem' }}>
                <div>
                  <p style={{ color: colors.gold, fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>{puntos.length}</p>
                  <p style={{ color: colors.muted, fontSize: '0.75rem' }}>puntos</p>
                </div>
                <div>
                  <p style={{ color: colors.gold, fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>{distanciaTotal.toFixed(0)}</p>
                  <p style={{ color: colors.muted, fontSize: '0.75rem' }}>metros recorridos</p>
                </div>
              </div>

              <p style={{ color: colors.muted, fontSize: '0.78rem', marginBottom: '1.5rem' }}>
                {precisionActual != null ? `Precisión del GPS: ±${precisionActual.toFixed(0)}m` : 'Buscando señal GPS...'}
              </p>

              <button
                onClick={terminarYCalcular}
                style={{ ...buttonPrimary, width: '100%', backgroundColor: colors.danger, background: 'none', border: `2px solid ${colors.danger}`, color: colors.danger }}
              >
                Terminar y calcular área
              </button>
            </div>
          )}

          {areaCalculada != null && (
            <div style={{ textAlign: 'center' }}>
              <Check size={40} color={colors.success} style={{ marginBottom: '0.75rem' }} />
              <p style={{ color: colors.muted, fontSize: '0.85rem', marginBottom: '0.5rem' }}>Área calculada para {tablonActual?.nombre}</p>
              <p style={{ color: colors.gold, fontSize: '2.4rem', fontWeight: 700, margin: '0 0 0.5rem' }}>{areaCalculada.toFixed(2)} <span style={{ fontSize: '1.2rem' }}>ha</span></p>
              {tablonActual?.area_hectareas != null && (
                <p style={{ color: colors.muted, fontSize: '0.8rem', marginBottom: '1.5rem' }}>Valor anterior guardado: {tablonActual.area_hectareas} ha</p>
              )}

              {mensaje ? (
                <>
                  <p style={{ color: colors.success, fontSize: '0.9rem', marginBottom: '1rem' }}>{mensaje}</p>
                  <button onClick={() => router.push('/dashboard/lotes')} style={{ ...buttonSecondary, width: '100%' }}>
                    Volver a Tablones
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={reintentar} style={{ ...buttonSecondary, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                    <RotateCcw size={16} /> Reintentar
                  </button>
                  <button onClick={guardarMedida} disabled={guardando} className="btn-primary" style={{ ...buttonPrimary, flex: 1, opacity: guardando ? 0.7 : 1 }}>
                    {guardando ? 'Guardando...' : 'Guardar esta medida'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}