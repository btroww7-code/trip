/*
  # Routes Cache Schema
  
  1. New Tables
    - `routes_cache`
      - `id` (uuid, primary key)
      - `origin` (text) - starting location
      - `destination` (text) - ending location
      - `route_data` (jsonb) - complete route information
      - `created_at` (timestamptz)
      - `expires_at` (timestamptz) - cache expiration
    
    - `favorite_routes`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - reference to auth.users
      - `name` (text) - user-given name
      - `origin` (text)
      - `destination` (text)
      - `created_at` (timestamptz)
    
    - `recent_searches`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - reference to auth.users
      - `origin` (text)
      - `destination` (text)
      - `searched_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Public read access to routes_cache
    - Users can manage their own favorites and searches
*/

CREATE TABLE IF NOT EXISTS routes_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin text NOT NULL,
  destination text NOT NULL,
  route_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '1 hour')
);

CREATE INDEX IF NOT EXISTS idx_routes_cache_lookup ON routes_cache(origin, destination);
CREATE INDEX IF NOT EXISTS idx_routes_cache_expires ON routes_cache(expires_at);

ALTER TABLE routes_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read routes cache"
  ON routes_cache FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert routes cache"
  ON routes_cache FOR INSERT
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS favorite_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  origin text NOT NULL,
  destination text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE favorite_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own favorites"
  ON favorite_routes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites"
  ON favorite_routes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON favorite_routes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS recent_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  origin text NOT NULL,
  destination text NOT NULL,
  searched_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recent_searches_user ON recent_searches(user_id, searched_at DESC);

ALTER TABLE recent_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own searches"
  ON recent_searches FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own searches"
  ON recent_searches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
