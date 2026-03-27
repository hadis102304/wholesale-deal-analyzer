// Offline deal save queue backed by localStorage.
// Deals are queued here when Supabase is unreachable,
// then flushed automatically when connectivity returns.

import { saveDeal } from './supabase.js';

const KEY = 'deal_analyzer_offline_queue';

export function enqueueOffline(deal) {
  const q = readQueue();
  q.push({ ...deal, _queued_at: new Date().toISOString() });
  writeQueue(q);

  // Register background sync if the browser supports it
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready
      .then((sw) => sw.sync.register('sync-deals'))
      .catch(() => {});
  }
}

export async function flushOfflineQueue() {
  const q = readQueue();
  if (q.length === 0) return;

  const remaining = [];
  for (const item of q) {
    const { _queued_at, ...payload } = item;
    const { error } = await saveDeal(payload);
    if (error) remaining.push(item);
  }
  writeQueue(remaining);
}

export function queueLength() {
  return readQueue().length;
}

function readQueue()       { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); }
function writeQueue(items) { localStorage.setItem(KEY, JSON.stringify(items)); }
