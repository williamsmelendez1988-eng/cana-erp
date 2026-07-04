export type TasaBCV = {
  usd: number;
  fecha: string;
};

export async function getTasaBCV(): Promise<TasaBCV | null> {
  try {
    const res = await fetch('https://rates.dolarvzla.com/bcv/current.json', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.current?.usd) return null;
    return { usd: data.current.usd, fecha: data.current.date };
  } catch {
    return null;
  }
}