import { createClient } from '@supabase/supabase-js';

async function fetchWithRetry(url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  for (let i = 0; i < 6; i++) {
    const res = await fetch(url, init);
    if (!res.ok) {
      const clone = res.clone();
      const text = await clone.text();
      if (text.includes('schema cache') || text.includes('Retrying')) {
        if (i < 5) {
          // PostgRESTが起動中 — 3秒待ってリトライ（最大18秒）
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
      }
    }
    return res;
  }
  return fetch(url, init);
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
