ALTER TABLE offers ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS seela_validated_at TIMESTAMPTZ;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS leaser_confirmed_at TIMESTAMPTZ;

-- Store user email in profiles for server-side access without service role key
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
