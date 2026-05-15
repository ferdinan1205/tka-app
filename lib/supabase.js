import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mrqqxaqvinvehfbpyoel.supabase.co'
const supabaseKey = 'sb_publishable_8T2jmsIT6iFcryl71--5qw_ipGU8J8m'

export const supabase = createClient(supabaseUrl, supabaseKey)