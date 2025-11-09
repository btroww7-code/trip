import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface SavedRoute {
  id: string;
  user_id: string;
  from_location: string;
  to_location: string;
  from_coords: { lat: number; lng: number };
  to_coords: { lat: number; lng: number };
  route_data: any;
  created_at: string;
}

export interface FavoritePlace {
  id: string;
  user_id: string;
  name: string;
  address: string;
  coords: { lat: number; lng: number };
  created_at: string;
}

export interface SearchHistoryEntry {
  id: string;
  user_id: string;
  from_location: string;
  to_location: string;
  searched_at: string;
}
