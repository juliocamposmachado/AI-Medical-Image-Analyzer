/*
  # Medical Image Analysis Database Schema

  1. New Tables
    - `analyses`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `image_url` (text)
      - `symptoms` (text)
      - `cell_count` (integer)
      - `darker_cells` (integer)
      - `larger_cells` (integer)
      - `avg_cell_size` (numeric)
      - `avg_color_diff` (numeric)
      - `anomaly_level` (text)
      - `diagnosis` (text)
      - `ai_response` (text)
      - `created_at` (timestamptz)
    
    - `cell_details`
      - `id` (uuid, primary key)
      - `analysis_id` (uuid, references analyses)
      - `cell_number` (integer)
      - `area` (numeric)
      - `perimeter` (numeric)
      - `shape_vertices` (integer)
      - `color_difference` (numeric)
      - `size_percentage` (numeric)
      - `description` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can only access their own analyses
*/

CREATE TABLE IF NOT EXISTS analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  image_url text NOT NULL,
  symptoms text DEFAULT '',
  cell_count integer DEFAULT 0,
  darker_cells integer DEFAULT 0,
  larger_cells integer DEFAULT 0,
  avg_cell_size numeric DEFAULT 0,
  avg_color_diff numeric DEFAULT 0,
  anomaly_level text DEFAULT 'Baixo',
  diagnosis text DEFAULT 'Normal',
  ai_response text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cell_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid REFERENCES analyses(id) ON DELETE CASCADE,
  cell_number integer NOT NULL,
  area numeric DEFAULT 0,
  perimeter numeric DEFAULT 0,
  shape_vertices integer DEFAULT 0,
  color_difference numeric DEFAULT 0,
  size_percentage numeric DEFAULT 0,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cell_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analyses"
  ON analyses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses"
  ON analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analyses"
  ON analyses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses"
  ON analyses
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view cell details of own analyses"
  ON cell_details
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = cell_details.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert cell details for own analyses"
  ON cell_details
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = cell_details.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update cell details of own analyses"
  ON cell_details
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = cell_details.analysis_id
      AND analyses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = cell_details.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete cell details of own analyses"
  ON cell_details
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = cell_details.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );