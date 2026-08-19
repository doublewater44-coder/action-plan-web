import { createClient } from '@supabase/supabase-js';

async function fetchWithRetry(url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const clone = res.clone();
    const text = await clone.text();
    if (text.includes('schema cache') || text.includes('Retrying')) {
      // PostgRESTが起動中 — 2秒待ってリトライ
      await new Promise(r => setTimeout(r, 2000));
      return fetch(url, init);
    }
  }
  return res;
}

export function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      global: { fetch: fetchWithRetry },
    }
  );
}
