
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yysxmzwinvvaduzufcna.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5c3htendpbnZ2YWR1enVmY25hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MzM2MjYsImV4cCI6MjA3OTQwOTYyNn0.2bigggSpvj0AHFrrLaIKR4duAlnPTjS7hgD5mY2yThs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
