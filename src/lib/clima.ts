export type ClimaHoy = {
  temperaturaMax: number;
  temperaturaMin: number;
  probabilidadLluvia: number;
  precipitacionMm: number;
};

export async function getClimaHoy(lat: number, lon: number): Promise<ClimaHoy | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum&timezone=auto&forecast_days=1`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.daily) return null;
    return {
      temperaturaMax: data.daily.temperature_2m_max[0],
      temperaturaMin: data.daily.temperature_2m_min[0],
      probabilidadLluvia: data.daily.precipitation_probability_max[0],
      precipitacionMm: data.daily.precipitation_sum[0],
    };
  } catch {
    return null;
  }
}