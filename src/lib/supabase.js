// src/lib/supabase.js
//
// ── Supabase Setup ───────────────────────────────────────────────────────────
// 1. Go to https://supabase.com → New project
// 2. In SQL Editor, run the SQL below ONCE:
//
// create table if not exists deals (
//   id          uuid        default gen_random_uuid() primary key,
//   created_at  timestamptz default now(),
//   address     text        not null,
//   arv         integer     not null,
//   repairs     integer     not null,
//   fee         integer     not null,
//   mao         integer     not null,
//   verdict     text        not null,
//   avm         integer,
//   comps       jsonb       default '[]'
// );
// alter table deals enable row level security;
// create policy "anon_all" on deals for all using (true) with check (true);
//
// 3. Copy URL + anon key into your .env
// ────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

const url     = import.meta.env.VITE_SUPABASE_URL      ?? '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabase = (url && anonKey) ? createClient(url, anonKey) : null;

export async function saveDeal(deal) {
  if (!supabase) return { data: null, error: new Error('Supabase not configured — check .env') };
  return supabase.from('deals').insert([deal]).select().single();
}

export async function fetchDeals() {
  if (!supabase) return { data: [], error: new Error('Supabase not configured — check .env') };
  return supabase.from('deals').select('*').order('created_at', { ascending: false }).limit(200);
}
