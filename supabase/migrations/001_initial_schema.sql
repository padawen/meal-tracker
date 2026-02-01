-- Combined Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON COLUMN profiles.is_approved IS 'Whether the user has been approved by an admin. Admins are always considered approved.';

-- Create meal_records table
CREATE TABLE meal_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date DATE NOT NULL,
    had_meal BOOLEAN NOT NULL,
    meal_name TEXT,
    reason TEXT,
    recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    team TEXT CHECK (team IN ('A', 'B')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date)
);

COMMENT ON COLUMN meal_records.team IS 'Team responsible: A = Zs team, B = Reni team';

-- Create holidays table
CREATE TABLE holidays (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE holidays IS 'Holidays that should be excluded from statistics';

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
    ON profiles FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
      )
    );

-- Meal records policies
CREATE POLICY "Anyone can view meal records"
    ON meal_records FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert meal records for today or past"
    ON meal_records FOR INSERT
    WITH CHECK (
      auth.uid() = recorded_by 
      AND date <= CURRENT_DATE
    );

CREATE POLICY "Anyone can update meal records for today or past"
    ON meal_records FOR UPDATE
    USING (date <= CURRENT_DATE);

CREATE POLICY "Anyone can delete today or past meal records"
    ON meal_records FOR DELETE
    USING (date <= CURRENT_DATE);

-- Holidays policies
CREATE POLICY "Anyone can view holidays"
    ON holidays FOR SELECT
    USING (true);

CREATE POLICY "Admins can insert holidays"
    ON holidays FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
      )
    );

CREATE POLICY "Admins can update holidays"
    ON holidays FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
      )
    );

CREATE POLICY "Admins can delete holidays"
    ON holidays FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
      )
    );

-- Indexes
CREATE INDEX idx_meal_records_date ON meal_records(date DESC);
CREATE INDEX idx_meal_records_recorded_by ON meal_records(recorded_by);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_holidays_date ON holidays(date DESC);

-- Functions & Triggers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_records_updated_at
    BEFORE UPDATE ON meal_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_holidays_updated_at
    BEFORE UPDATE ON holidays
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
