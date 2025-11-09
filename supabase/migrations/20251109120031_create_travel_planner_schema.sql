/*
  # Travel Planner Application Schema

  1. New Tables
    - `saved_routes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `from_location` (text) - Starting point name
      - `to_location` (text) - Destination name
      - `from_coords` (jsonb) - {lat, lng}
      - `to_coords` (jsonb) - {lat, lng}
      - `route_data` (jsonb) - Complete route information
      - `created_at` (timestamptz)
    
    - `favorite_places`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text) - Place name
      - `address` (text)
      - `coords` (jsonb) - {lat, lng}
      - `created_at` (timestamptz)
    
    - `search_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `from_location` (text)
      - `to_location` (text)
      - `searched_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

CREATE TABLE IF NOT EXISTS saved_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  from_location text NOT NULL,
  to_location text NOT NULL,
  from_coords jsonb NOT NULL,
  to_coords jsonb NOT NULL,
  route_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS favorite_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL,
  coords jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  from_location text NOT NULL,
  to_location text NOT NULL,
  searched_at timestamptz DEFAULT now()
);

ALTER TABLE saved_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved routes"
  ON saved_routes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved routes"
  ON saved_routes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved routes"
  ON saved_routes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own favorite places"
  ON favorite_places FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorite places"
  ON favorite_places FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorite places"
  ON favorite_places FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own search history"
  ON search_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search history"
  ON search_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_saved_routes_user_id ON saved_routes(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_places_user_id ON favorite_places(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);