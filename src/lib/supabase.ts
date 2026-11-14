import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://nnicnxwzuvinaqvxuvsh.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaWNueHd6dXZpbmFxdnh1dnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MzgxNTYsImV4cCI6MjA5ODExNDE1Nn0.c_s_9DZ4qEX47xzNluAPG9HXHsiAnFGTZ8EeXz38yqU";

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = envUrl && envUrl.trim() !== "" ? envUrl : DEFAULT_SUPABASE_URL;
const supabaseAnonKey = envAnonKey && envAnonKey.trim() !== "" ? envAnonKey : DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
