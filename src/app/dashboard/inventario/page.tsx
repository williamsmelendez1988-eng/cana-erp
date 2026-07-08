'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type ItemInventario = {
  id: string;
  nombre: string;
  categoria: string;
  unidad_medida: string;
  stock_actual: number;
  stock_minimo: number | null;
};

type LoteSimple = { id: string; nombre: string };

type MovimientoConLote = {
  id: string;
  tipo: 'entrada' | 'salida';
  cantidad: number;
  proveedor: string | null;
  responsable: string | null;
  fecha: string;
  notas: string | null;
  lotes: { nombre: string } | null;
};

const CATEGORIA_LABELS: Record<string, string> = {
  fertilizante: 'Fertilizante',
  herbicida: 'Herbicida',
  insecticida: 'Insecticida',
  combustible: 'Combustible',
  herramienta: 'Herramienta',
  implemento: 'Implemento de tractor',
  equipo_proteccion: 'Equipo de protección',
  repuesto: 'Repuesto',
  semilla: 'Semilla',
  material: 'Material',
};

const UNIDADES = ['kg', 'litros', 'sacos', 'unidad', 'galones', 'toneladas', 'metros'];

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

export default function InventarioPage() {
  const [items, setItems] = useState<ItemInventario[]>([]);
  const [lotes, setLotes] = useState<LoteSimple[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ItemInventario | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('fertilizante');
  const [unidadMedida, setUnidadMedida] = useState('kg');
  const [stockMinimo, setStockMinimo] = useState('');
  const [stockInicial, setStockInicial] = useState('');

  const [movModalOpen, setMovModalOpen] = useState(false);
  const [movItem, setMovItem] = useState<ItemInventario | null>(null);
  const [movTipo, setMovTipo] = useState<'entrada' | 'salida'>('entrada');
  const [movCantidad, setMovCantidad] = useState('');
  const [movLote, setMovLote] = useState('');
  const [movProveedor, setMovProveedor] = useState('');
  const [movResponsable, setMovResponsable] = useState('');
  const [movFecha, setMovFecha] = useState(hoy());
  const [movNotas, setMovNotas] = useState('');
  const [movSaving, setMovSaving] = useState(false);
  const [movError, setMovError] = useState('');

  const [historialOpen, setHistorialOpen] = useState(false);
  const [historialItem, setHistorialItem] = useState<ItemInventario | null>(null);
  const [historialMovs, setHistorialMovs] = useState<MovimientoConLote[]>([]);
  const [historialLoading, setHistorialLoading] = useState(false);

  useEffect(() => {
    cargarItems();
    cargarLotes();
  }, []);

  async function cargarItems() {
    setLoading(true);
    const { data, error } = await supabase.from('inventario_items').select('*').order('nombre');
    if (!error && data) setItems(data as ItemInventario[]);
    setLoading(false);
  }

  async function cargarLotes() {
    const { data } = await supabase.from('lotes').select('id, nombre').order('nombre');
    setLotes((data as LoteSimple[]) ?? []);
  }

  function abrirNuevo() {
    setEditing(null);
    setNombre('');
    setCategoria('fertilizante');
    setUnidadMedida('kg');
    setStockMinimo('');
    setStockInicial('');
    setError('');
    setModalOpen(true);
  }

  function abrirEditar(item: ItemInventario) {
    setEditing(item);
    setNombre(item.nombre);
    setCategoria(item.categoria);
    setUnidadMedida(item.unidad_medida);
    setStockMinimo(item.stock_minimo?.toString() ?? '');
    setStockInicial('');
    setError('');
    setModalOpen(true);
  }

  async function handleGuardarItem(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      nombre,
      categoria,
      unidad_medida: unidadMedida,
      stock_minimo: stockMinimo ? parseFloat(stockMinimo) : 0,
    };

    if (editing) {
      const { error } = await supabase.from('inventario_items').update(payload).eq('id', editing.id);
      setSaving(false);
      if (error) {
        setError(`Error: ${error.message}`);
        return;
      }
    } else {
      const { data, error } = await supabase.from('inventario_items').insert(payload).select().single();
      if (error) {
        setSaving(false);
        setError(`Error: ${error.message}`);
        return;
      }
      if (stockInicial && parseFloat(stockInicial) > 0 && data) {
        const { error: movErr } = await supabase.from('movimientos_inventario').insert({
          item_id: data.id,
          tipo: 'entrada',
          cantidad: parseFloat(stockInicial),
          proveedor: 'Stock inicial',
          notas: 'Registro inicial al crear el artículo',
        });
        if (movErr) {
          setSaving(false);
          setError(`Artículo creado, pero hubo un error registrando el stock inicial: ${movErr.message}`);
          return;
        }
      }
      setSaving(false);
    }

    setModalOpen(false);
    cargarItems();
  }

  function abrirMovimiento(item: ItemInventario, tipo: 'entrada' | 'salida') {
    setMovItem(item);
    setMovTipo(tipo);
    setMovCantidad('');
    setMovLote('');
    setMovProveedor('');
    setMovResponsable('');
    setMovFecha(hoy());
    setMovNotas('');
    setMovError('');
    setMovModalOpen(true);
  }

  async function handleGuardarMovimiento(e: React.FormEvent) {
    e.preventDefault();
    setMovError('');

    const cantidadNum = parseFloat(movCantidad);
    if (!cantidadNum || cantidadNum <= 0) {
      setMovError('Ingresa una cantidad válida.');
      return;
    }
    if (movTipo === 'salida' && movItem && cantidadNum > movItem.stock_actual) {
      setMovError(`No hay suficiente stock. Disponible: ${movItem.stock_actual} ${movItem.unidad_medida}.`);
      return;
    }

    setMovSaving(true);

    const { error } = await supabase.from('movimientos_inventario').insert({
      item_id: movItem!.id,
      tipo: movTipo,
      cantidad: cantidadNum,
      lote_id: movLote || null,
      proveedor: movTipo === 'entrada' ? movProveedor || null : null,
      responsable: movResponsable || null,
      fecha: movFecha,
      notas: movNotas || null,
    });

    setMovSaving(false);

    if (error) {
      setMovError(`Error: ${error.message}`);
      return;
    }

    setMovModalOpen(false);
    cargarItems();
  }

  async function abrirHistorial(item: ItemInventario) {
    setHistorialItem(item);
    setHistorialOpen(true);
    setHistorialLoading(true);
    const { data, error } = await supabase
      .from('movimientos_inventario')
      .select('id, tipo, cantidad, proveedor, responsable, fecha, notas, lotes(nombre)')
      .eq('item_id', item.id)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false });
    if (!error && data) setHistorialMovs(data as unknown as MovimientoConLote[]);
    setHistorialLoading(false);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: '#F3ECDD', fontSize: '1.75rem', margin: 0 }}>Inventario</h1>
          <p style={{ color: '#94a3b8', marginTop: '0.25rem' }}>Fertilizantes, herramientas, combustible y más.</p>
        </div>
        <button
          onClick={abrirNuevo}
          style={{ padding: '0.7rem 1.4rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #E8C77E 0%, #C9974C 100%)', color: '#1F3326', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
        >
          + Nuevo artículo
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Cargando inventario...</p>
      ) : items.length === 0 ? (
        <div style={{ backgroundColor: '#1F3326', border: '1px dashed rgba(232,199,126,0.3)', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#D8CBB0', marginBottom: '1rem' }}>Todavía no has registrado ningún artículo.</p>
          <button
            onClick={abrirNuevo}
            style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid #E8C77E', backgroundColor: 'transparent', color: '#E8C77E', cursor: 'pointer', fontWeight: 600 }}
          >
            Registrar el primero
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {items.map((item) => {
            const bajo = item.stock_minimo != null && item.stock_actual < item.stock_minimo;
            return (
              <div
                key={item.id}
                style={{
                  backgroundColor: '#1F3326',
                  border: bajo ? '1px solid rgba(248,113,113,0.4)' : '1px solid rgba(232,199,126,0.15)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                }}
              >
                <div onClick={() => abrirEditar(item)} style={{ cursor: 'pointer', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ color: '#F3ECDD', fontSize: '1.1rem', margin: 0 }}>{item.nombre}</h3>
                    {bajo && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px', color: '#F87171', backgroundColor: 'rgba(248,113,113,0.15)' }}>
                        Stock bajo
                      </span>
                    )}
                  </div>
                  <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0.2rem 0' }}>{CATEGORIA_LABELS[item.categoria] ?? item.categoria}</p>
                  <p style={{ color: '#E8C77E', fontSize: '1.3rem', fontWeight: 700, margin: '0.5rem 0 0' }}>
                    {item.stock_actual} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#94a3b8' }}>{item.unidad_medida}</span>
                  </p>
                  {item.stock_minimo != null && item.stock_minimo > 0 && (
                    <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: '0.2rem 0' }}>Mínimo: {item.stock_minimo} {item.unidad_medida}</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <button
                    onClick={() => abrirMovimiento(item, 'entrada')}
                    style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(74,222,128,0.3)', backgroundColor: 'rgba(74,222,128,0.1)', color: '#4ADE80', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                  >
                    + Entrada
                  </button>
                  <button
                    onClick={() => abrirMovimiento(item, 'salida')}
                    style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.3)', backgroundColor: 'rgba(248,113,113,0.1)', color: '#F87171', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                  >
                    − Salida
                  </button>
                </div>
                <button
                  onClick={() => abrirHistorial(item)}
                  style={{ width: '100%', padding: '0.4rem', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}
                >
                  Ver historial de movimientos
                </button>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div onClick={() => setModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleGuardarItem}
            style={{ backgroundColor: '#1F3326', border: '1px solid rgba(232,199,126,0.2)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <h2 style={{ color: '#F3ECDD', fontSize: '1.3rem', margin: 0 }}>{editing ? 'Editar artículo' : 'Nuevo artículo'}</h2>

            {editing && (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                Stock actual: <strong style={{ color: '#E8C77E' }}>{editing.stock_actual} {editing.unidad_medida}</strong> — para cambiarlo usa los botones de Entrada/Salida, no se edita aquí.
              </p>
            )}

            <Campo label="Nombre">
              <input required value={nombre} onChange={(e) => setNombre(e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Categoría">
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={inputStyle}>
                {Object.entries(CATEGORIA_LABELS).map(([valor, label]) => (
                  <option key={valor} value={valor}>{label}</option>
                ))}
              </select>
            </Campo>

            <Campo label="Unidad de medida">
              <select value={unidadMedida} onChange={(e) => setUnidadMedida(e.target.value)} style={inputStyle}>
                {UNIDADES.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </Campo>

            <Campo label="Stock mínimo (para alertas)">
              <input type="number" step="0.01" min="0" value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)} style={inputStyle} />
            </Campo>

            {!editing && (
              <Campo label="Stock inicial (opcional)">
                <input type="number" step="0.01" min="0" value={stockInicial} onChange={(e) => setStockInicial(e.target.value)} placeholder="Si ya tienes existencias" style={inputStyle} />
              </Campo>
            )}

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

      {movModalOpen && movItem && (
        <div onClick={() => setMovModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleGuardarMovimiento}
            style={{ backgroundColor: '#1F3326', border: '1px solid rgba(232,199,126,0.2)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <h2 style={{ color: '#F3ECDD', fontSize: '1.3rem', margin: 0 }}>
              {movTipo === 'entrada' ? 'Registrar entrada' : 'Registrar salida'} — {movItem.nombre}
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
              Stock actual: <strong style={{ color: '#E8C77E' }}>{movItem.stock_actual} {movItem.unidad_medida}</strong>
            </p>

            <Campo label={`Cantidad (${movItem.unidad_medida})`}>
              <input type="number" step="0.01" min="0" required value={movCantidad} onChange={(e) => setMovCantidad(e.target.value)} style={inputStyle} />
            </Campo>

            {movTipo === 'salida' && (
              <Campo label="Tablón destino (opcional)">
                <select value={movLote} onChange={(e) => setMovLote(e.target.value)} style={inputStyle}>
                  <option value="">Sin tablón específico</option>
                  {lotes.map((l) => (
                    <option key={l.id} value={l.id}>{l.nombre}</option>
                  ))}
                </select>
              </Campo>
            )}

            {movTipo === 'entrada' && (
              <Campo label="Proveedor (opcional)">
                <input value={movProveedor} onChange={(e) => setMovProveedor(e.target.value)} style={inputStyle} />
              </Campo>
            )}

            <Campo label="Responsable">
              <input value={movResponsable} onChange={(e) => setMovResponsable(e.target.value)} placeholder="Quién lo entregó o recibió" style={inputStyle} />
            </Campo>

            <Campo label="Fecha">
              <input type="date" value={movFecha} onChange={(e) => setMovFecha(e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Notas">
              <textarea value={movNotas} onChange={(e) => setMovNotas(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </Campo>

            {movError && <p style={{ color: '#F5A3A3', fontSize: '0.85rem', margin: 0 }}>{movError}</p>}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setMovModalOpen(false)} style={{ flex: 1, padding: '0.7rem', borderRadius: '10px', border: '1px solid rgba(216,203,176,0.25)', backgroundColor: 'transparent', color: '#D8CBB0', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button
                type="submit"
                disabled={movSaving}
                style={{
                  flex: 1,
                  padding: '0.7rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: movTipo === 'entrada' ? 'linear-gradient(135deg, #86EFAC 0%, #4ADE80 100%)' : 'linear-gradient(135deg, #FCA5A5 0%, #F87171 100%)',
                  color: '#1F3326',
                  fontWeight: 700,
                  cursor: movSaving ? 'not-allowed' : 'pointer',
                  opacity: movSaving ? 0.7 : 1,
                }}
              >
                {movSaving ? 'Guardando...' : movTipo === 'entrada' ? 'Registrar entrada' : 'Registrar salida'}
              </button>
            </div>
          </form>
        </div>
      )}

      {historialOpen && historialItem && (
        <div onClick={() => setHistorialOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: '#1F3326', border: '1px solid rgba(232,199,126,0.2)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '560px', maxHeight: '85vh', overflowY: 'auto' }}
          >
            <h2 style={{ color: '#F3ECDD', fontSize: '1.3rem', margin: '0 0 1rem' }}>Historial — {historialItem.nombre}</h2>

            {historialLoading ? (
              <p style={{ color: '#94a3b8' }}>Cargando historial...</p>
            ) : historialMovs.length === 0 ? (
              <p style={{ color: '#94a3b8' }}>Todavía no hay movimientos registrados para este artículo.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {historialMovs.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      borderLeft: m.tipo === 'entrada' ? '3px solid #4ADE80' : '3px solid #F87171',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: m.tipo === 'entrada' ? '#4ADE80' : '#F87171', fontWeight: 700, fontSize: '0.85rem' }}>
                        {m.tipo === 'entrada' ? '+ Entrada' : '− Salida'} de {m.cantidad} {historialItem.unidad_medida}
                      </span>
                      <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{m.fecha}</span>
                    </div>
                    <p style={{ color: '#D8CBB0', fontSize: '0.8rem', margin: '0.3rem 0 0' }}>
                      {m.lotes?.nombre && <>Tablón: {m.lotes.nombre} · </>}
                      {m.proveedor && <>Proveedor: {m.proveedor} · </>}
                      {m.responsable && <>Responsable: {m.responsable}</>}
                    </p>
                    {m.notas && <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: '0.2rem 0 0', fontStyle: 'italic' }}>{m.notas}</p>}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setHistorialOpen(false)}
              style={{ marginTop: '1.25rem', width: '100%', padding: '0.6rem', borderRadius: '10px', border: '1px solid rgba(216,203,176,0.25)', backgroundColor: 'transparent', color: '#D8CBB0', cursor: 'pointer' }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}