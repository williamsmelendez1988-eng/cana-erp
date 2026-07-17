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

function mensajeErrorGps(codigo: number): string {
  if (codigo === 1) {
    return 'Le negaste el permiso de ubicación a esta página. Revisa en Ajustes de tu teléfono → Privacidad → Localización, que el navegador tenga permiso. Si abriste este link desde WhatsApp, cópialo y pégalo directo en Safari o Chrome.';
  }
  if (codigo === 2) {
    return 'El teléfono no pudo obtener tu ubicación ahora mismo. Sal a un espacio abierto, lejos de techos o árboles densos, e intenta de nuevo.';
  }
  if (codigo === 3) {
    return 'Se tardó demasiado buscando señal GPS. Intenta de nuevo a cielo abierto.';
  }
  return 'No se pudo acceder a tu ubicación en este momento.';
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
  const puntosRef = useRef<Punto[]>([]);

  useEffect(() => {
    cargarTablones();
    return () => detenerWatch();
  }, []);

  useEffect(() => {
    puntosRef.current = puntos;
  }, [puntos]);

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
    puntosRef.current = [];
    setDistanciaTotal(0);
    setAreaCalculada(null);
    setErrorGps('');
    setPrecisionActual(null);
    setMidiendo(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setPrecisionActual(accuracy);
        setErrorGps('');

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
      (err) => setErrorGps(mensajeErrorGps(err.code)),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  }

  function cancelarMedicion() {
    if (puntosRef.current.length >= 3) {
      const confirmar = window.confirm(`Llevas ${puntosRef.current.length} puntos caminados. Si cancelas, se pierden. ¿Seguro que quieres cancelar?`);
      if (!confirmar) return;
    }
    detenerWatch();
    setMidiendo(false);
    setErrorGps('');
  }

  function terminarYCalcular() {
    detenerWatch();
    setMidiendo(false);
    if (puntosRef.current.length < 3) {
      setErrorGps('No se capturaron suficientes puntos. Intenta de nuevo caminando más despacio por el borde.');
      return;
    }
    setAreaCalculada(calcularAreaHectareas(puntosRef.current));
  }

  function reintentar() {
    setPuntos([]);
    puntosRef.current = [];
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
        .btn-primary:active { transform: scale(0.97); }
        .link-cancelar { background: none; border: none; color: #94a3b8; font-size: 0.85rem; cursor: pointer; text-decoration: underline; padding: 0.5rem; }
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
                Párate en cualquier punto del borde del tablón antes de iniciar. Camina despacio, pegado al límite real del terreno, hasta dar la vuelta completa. Para probar, elige un espacio grande y abierto — un terreno chico como una casa da un número casi invisible en hectáreas.
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

              <p style={{ color: colors.muted, fontSize: '0.78rem', marginBottom: '1rem' }}>
                {precisionActual != null ? `Precisión del GPS: ±${precisionActual.toFixed(0)}m` : 'Buscando señal GPS...'}
              </p>

              {errorGps && (
                <p style={{ color: colors.danger, fontSize: '0.85rem', marginBottom: '1.25rem', backgroundColor: `${colors.danger}15`, padding: '0.7rem 0.9rem', borderRadius: '8px', textAlign: 'left' }}>
                  {errorGps}
                </p>
              )}

              <button
                onClick={terminarYCalcular}
                disabled={puntos.length < 3}
                className="btn-primary"
                style={{
                  ...buttonPrimary,
                  width: '100%',
                  fontSize: '1.05rem',
                  padding: '1rem',
                  marginBottom: '1rem',
                  opacity: puntos.length < 3 ? 0.5 : 1,
                  cursor: puntos.length < 3 ? 'not-allowed' : 'pointer',
                }}
              >
                ✓ Terminar y calcular área
              </button>

              <button onClick={cancelarMedicion} className="link-cancelar">
                Cancelar medición
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