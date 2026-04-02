-- ============================================
-- CURSUS DATABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- ============================================

-- OTP Verifications (for custom auth)
create table if not exists otp_verifications (
  id uuid default gen_random_uuid() primary key,
  identifier text not null unique,  -- email or phone
  method text not null,             -- 'email' | 'phone'
  otp_code text not null,
  expires_at timestamptz not null,
  role text,
  created_at timestamptz default now()
);

-- Clean up expired OTPs automatically
create or replace function cleanup_expired_otps() returns void as $$
  delete from otp_verifications where expires_at < now();
$$ language sql;

-- Profiles
create table if not exists profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade unique not null,
  full_name text,
  avatar_url text,
  role text default 'university_student',
  university text,
  faculty text,
  department text,
  level text,
  is_pro boolean default false,
  pro_expires_at timestamptz,
  created_at timestamptz default now()
);

-- Courses
create table if not exists courses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  course_code text not null,
  course_name text not null,
  semester text default 'current',
  created_at timestamptz default now()
);

-- Notes
create table if not exists notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  course_id uuid references courses(id) on delete set null,
  title text default 'Untitled note',
  raw_content text default '',
  ai_expanded_content text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger notes_updated_at
  before update on notes
  for each row execute function update_updated_at();

-- Recordings
create table if not exists recordings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  course_id uuid references courses(id) on delete set null,
  title text default 'Untitled recording',
  audio_url text,
  transcript text,
  ai_notes text,
  duration_seconds integer default 0,
  created_at timestamptz default now()
);

-- Documents (PDFs)
create table if not exists documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  course_id uuid references courses(id) on delete set null,
  title text not null,
  file_url text,
  file_type text default 'pdf',
  summary text,
  created_at timestamptz default now()
);

-- Exam Prep sessions
create table if not exists exam_preps (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  course_id uuid references courses(id) on delete set null,
  title text not null,
  materials_urls text[] default '{}',
  materials_text text,
  ai_concentration_areas text,
  ai_reading_plan text,
  ai_notes text,
  exam_date timestamptz,
  created_at timestamptz default now()
);

-- Essays / Research
create table if not exists essays (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  course_id uuid references courses(id) on delete set null,
  title text not null,
  topic text,
  essay_type text default 'essay',
  outline text,
  content text,
  citations text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger essays_updated_at
  before update on essays
  for each row execute function update_updated_at();

-- Snap queries
create table if not exists snap_queries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  course_id uuid references courses(id) on delete set null,
  image_url text,
  question text not null,
  ai_response text,
  created_at timestamptz default now()
);

-- Waitlist
create table if not exists waitlist (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  role text,
  created_at timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table profiles enable row level security;
alter table courses enable row level security;
alter table notes enable row level security;
alter table recordings enable row level security;
alter table documents enable row level security;
alter table exam_preps enable row level security;
alter table essays enable row level security;
alter table snap_queries enable row level security;

-- Profiles: users can only see/edit their own
create policy "profiles_own" on profiles
  for all using (auth.uid() = user_id);

-- Courses
create policy "courses_own" on courses
  for all using (auth.uid() = user_id);

-- Notes
create policy "notes_own" on notes
  for all using (auth.uid() = user_id);

-- Recordings
create policy "recordings_own" on recordings
  for all using (auth.uid() = user_id);

-- Documents
create policy "documents_own" on documents
  for all using (auth.uid() = user_id);

-- Exam preps
create policy "exam_preps_own" on exam_preps
  for all using (auth.uid() = user_id);

-- Essays
create policy "essays_own" on essays
  for all using (auth.uid() = user_id);

-- Snap queries
create policy "snap_queries_own" on snap_queries
  for all using (auth.uid() = user_id);

-- ============================================
-- STORAGE BUCKETS
-- Run these in Supabase dashboard → Storage
-- ============================================

-- Create buckets (run via Supabase dashboard or API):
-- avatars     (public)
-- recordings  (private)
-- documents   (private)
-- exam-materials (private)
-- snaps       (private)

-- Storage policies (after creating buckets):
-- Allow authenticated users to upload to their own folder
-- Folder structure: {user_id}/{filename}
