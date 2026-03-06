-- Fix transcripts table: drop and recreate with correct schema
-- Run this in Supabase Dashboard > SQL Editor

-- Ensure UUID extension exists (required for id default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure users table exists (transcripts references it)
-- If you see "relation users does not exist", run init_db.sql first.

-- Drop existing table (you will lose existing rows)
DROP TABLE IF EXISTS transcripts;

-- Recreate with correct schema
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recording_session_id VARCHAR(255) NOT NULL,
  transcript_text TEXT NOT NULL,
  audio_path VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transcripts_user_id ON transcripts(user_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_created_at ON transcripts(created_at DESC);
