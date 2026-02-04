-- CSV Collaboration Platform Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'user');
CREATE TYPE user_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE row_status AS ENUM ('pending', 'working', 'completed', 'blocked');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  user_color TEXT DEFAULT '#3B82F6',
  role user_role DEFAULT 'user',
  status user_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CSV Files table
CREATE TABLE public.csv_files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  total_rows INTEGER DEFAULT 0,
  completed_rows INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CSV Rows table
CREATE TABLE public.csv_rows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  file_id UUID REFERENCES public.csv_files(id) ON DELETE CASCADE NOT NULL,
  row_index INTEGER NOT NULL,
  data JSONB NOT NULL,
  status row_status DEFAULT 'pending',
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  locked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  locked_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(file_id, row_index)
);

-- Activity Log table
CREATE TABLE public.activity_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Statistics table
CREATE TABLE public.user_statistics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  total_completed INTEGER DEFAULT 0,
  total_working INTEGER DEFAULT 0,
  total_blocked INTEGER DEFAULT 0,
  avg_completion_time INTERVAL,
  last_active TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_status ON public.profiles(status);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_csv_rows_file_id ON public.csv_rows(file_id);
CREATE INDEX idx_csv_rows_status ON public.csv_rows(status);
CREATE INDEX idx_csv_rows_assigned_to ON public.csv_rows(assigned_to);
CREATE INDEX idx_csv_rows_locked_by ON public.csv_rows(locked_by);
CREATE INDEX idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csv_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csv_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_statistics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view approved profiles"
  ON public.profiles FOR SELECT
  USING (status = 'approved' OR auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for csv_files
CREATE POLICY "Approved users can view active files"
  ON public.csv_files FOR SELECT
  USING (
    is_active AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND status = 'approved'
    )
  );

CREATE POLICY "Admins can manage files"
  ON public.csv_files FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for csv_rows
CREATE POLICY "Approved users can view rows"
  ON public.csv_rows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND status = 'approved'
    )
  );

CREATE POLICY "Users can update rows they're working on"
  ON public.csv_rows FOR UPDATE
  USING (
    assigned_to = auth.uid() OR locked_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for activity_log
CREATE POLICY "Users can view own activity"
  ON public.activity_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all activity"
  ON public.activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "All approved users can insert activity"
  ON public.activity_log FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND status = 'approved'
    )
  );

-- RLS Policies for user_statistics
CREATE POLICY "Users can view own statistics"
  ON public.user_statistics FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all statistics"
  ON public.user_statistics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Functions and Triggers

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_csv_files_updated_at BEFORE UPDATE ON public.csv_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_csv_rows_updated_at BEFORE UPDATE ON public.csv_rows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_statistics_updated_at BEFORE UPDATE ON public.user_statistics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  INSERT INTO public.user_statistics (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update file statistics
CREATE OR REPLACE FUNCTION update_file_statistics()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.csv_files
  SET 
    completed_rows = (
      SELECT COUNT(*) FROM public.csv_rows
      WHERE file_id = COALESCE(NEW.file_id, OLD.file_id)
      AND status = 'completed'
    )
  WHERE id = COALESCE(NEW.file_id, OLD.file_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update file statistics when row status changes
CREATE TRIGGER update_file_stats_on_row_change
  AFTER INSERT OR UPDATE OR DELETE ON public.csv_rows
  FOR EACH ROW EXECUTE FUNCTION update_file_statistics();

-- Function to update user statistics
CREATE OR REPLACE FUNCTION update_user_statistics()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_statistics
  SET 
    total_completed = (
      SELECT COUNT(*) FROM public.csv_rows
      WHERE assigned_to = COALESCE(NEW.assigned_to, OLD.assigned_to)
      AND status = 'completed'
    ),
    total_working = (
      SELECT COUNT(*) FROM public.csv_rows
      WHERE assigned_to = COALESCE(NEW.assigned_to, OLD.assigned_to)
      AND status = 'working'
    ),
    total_blocked = (
      SELECT COUNT(*) FROM public.csv_rows
      WHERE assigned_to = COALESCE(NEW.assigned_to, OLD.assigned_to)
      AND status = 'blocked'
    ),
    last_active = NOW()
  WHERE user_id = COALESCE(NEW.assigned_to, OLD.assigned_to);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user statistics
CREATE TRIGGER update_user_stats_on_row_change
  AFTER INSERT OR UPDATE OR DELETE ON public.csv_rows
  FOR EACH ROW EXECUTE FUNCTION update_user_statistics();

-- Grant access to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Insert first admin user (you'll need to update this with your user ID after signup)
-- Get your user ID from: SELECT id FROM auth.users WHERE email = 'your-email@example.com';
-- Then run: UPDATE public.profiles SET role = 'admin', status = 'approved' WHERE id = 'your-user-id';
