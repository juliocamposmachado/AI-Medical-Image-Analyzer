import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Analysis {
  id: string;
  user_id: string;
  image_url: string;
  symptoms: string;
  cell_count: number;
  darker_cells: number;
  larger_cells: number;
  avg_cell_size: number;
  avg_color_diff: number;
  anomaly_level: string;
  diagnosis: string;
  ai_response: string;
  created_at: string;
}

export interface CellDetail {
  id: string;
  analysis_id: string;
  cell_number: number;
  area: number;
  perimeter: number;
  shape_vertices: number;
  color_difference: number;
  size_percentage: number;
  description: string;
  created_at: string;
}
