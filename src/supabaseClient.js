import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://tkkgxfotzknomaktktuu.supabase.co'
const SUPABASE_PUBLIC_KEY = 'sb_publishable_c4Xkcxby7RwG8MwnKofhLA_aneHRrvO'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY)
