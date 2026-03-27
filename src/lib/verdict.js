export const VERDICT_ORDER = {
  'STRONG BUY':  0,
  'GOOD DEAL':   1,
  'THIN MARGIN': 2,
  'NO DEAL':     3,
};

export function getVerdict(mao, arv) {
  const ratio = arv > 0 ? mao / arv : 0;
  if (mao <= 0)          return { verdict: 'NO DEAL',     color: '#ef4444', icon: '✕' };
  if (ratio < 0.55)      return { verdict: 'STRONG BUY',  color: '#22c55e', icon: '▲' };
  if (ratio < 0.65)      return { verdict: 'GOOD DEAL',   color: '#84cc16', icon: '●' };
  return                        { verdict: 'THIN MARGIN',  color: '#f59e0b', icon: '◆' };
}

export const fmt    = (v) => Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
export const fmtDay = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
