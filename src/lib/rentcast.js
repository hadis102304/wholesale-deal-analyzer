// RentCast API — AVM + comparable sales
// Docs: https://developers.rentcast.io/reference/value-estimate

const API_KEY = import.meta.env.VITE_RENTCAST_API_KEY ?? '';
const BASE    = 'https://api.rentcast.io/v1';

function daysAgoFrom(dateStr) {
  if (!dateStr) return null;
  return Math.max(1, Math.round((Date.now() - new Date(dateStr).getTime()) / 86_400_000));
}

function shortAddress(full = '') {
  return full.split(',')[0] ?? full;
}

export async function fetchComps(address) {
  if (!API_KEY) throw new Error('VITE_RENTCAST_API_KEY not set in .env');

  const params = new URLSearchParams({
    address,
    propertyType: 'Single Family',
    compCount: '5',
  });

  const res = await fetch(`${BASE}/avm/value?${params}`, {
    headers: { 'X-Api-Key': API_KEY, Accept: 'application/json' },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? `RentCast ${res.status}`);
  }

  const data = await res.json();

  const comps = (data.comparables ?? []).slice(0, 5).map((c) => ({
    address:     shortAddress(c.formattedAddress ?? c.address ?? 'Unknown'),
    beds:        c.bedrooms      ?? '—',
    baths:       c.bathrooms     ?? '—',
    sqft:        c.squareFootage ?? 0,
    soldPrice:   c.price         ?? 0,
    daysAgo:     daysAgoFrom(c.removedDate ?? c.listedDate) ?? '—',
    distance:    c.distance != null ? `${c.distance.toFixed(1)} mi` : '—',
    correlation: c.correlation   ?? null,
  }));

  return {
    comps,
    avm:     data.price          ?? null,
    avmLow:  data.priceRangeLow  ?? null,
    avmHigh: data.priceRangeHigh ?? null,
  };
}
