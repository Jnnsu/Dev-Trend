import { createServerClient } from './supabase/server'

export async function getCached<T>(key: string): Promise<T | null> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('trending_cache')
    .select('data')
    .eq('cache_key', key)
    .gt('expires_at', new Date().toISOString())
    .single()
  return (data?.data as T) ?? null
}

export async function setCached(key: string, data: unknown, ttlMinutes: number) {
  const supabase = await createServerClient()
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString()
  await supabase.from('trending_cache').upsert({ cache_key: key, data, expires_at: expiresAt })
}
