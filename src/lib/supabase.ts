import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vnthlghfqllpmwuioycf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZudGhsZ2hmcWxscG13dWlveWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzE5NjUsImV4cCI6MjA5NzA0Nzk2NX0.xLwqGfQGX_ZUP-Fv6oDs9iysSzgpMe0d7YjZ1bbOWPo";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type Subscription = {
  plan: "free" | "ads_pro";
  status: "active" | "canceled" | "past_due";
  current_period_end: string | null;
};
