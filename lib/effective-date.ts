import { createClient } from './supabase/server'

export async function getEffectiveDate(): Promise<Date> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'effective_date')
      .maybeSingle()

    if (data?.value) {
      const d = new Date(data.value)
      if (!isNaN(d.getTime())) return d
    }
  } catch {}
  return new Date()
}

export async function getEffectiveDateISO(): Promise<string> {
  return (await getEffectiveDate()).toISOString()
}

export async function getRawEffectiveDate(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'effective_date')
      .maybeSingle()
    return data?.value ?? null
  } catch {
    return null
  }
}
