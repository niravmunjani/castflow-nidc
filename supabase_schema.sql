-- ═══════════════════════════════════════════════════════
-- CastFlow NIDC — Complete Supabase Database Schema
-- Run this in Supabase SQL Editor (one time)
-- ═══════════════════════════════════════════════════════

-- Jobs table: all casting schedule data
CREATE TABLE IF NOT EXISTS jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  machine TEXT NOT NULL,
  shop_order TEXT DEFAULT '',
  part TEXT NOT NULL,
  die TEXT DEFAULT '',
  balance INTEGER DEFAULT 0,
  total_on_job INTEGER DEFAULT 0,
  completed INTEGER DEFAULT 0,
  pct_complete NUMERIC(5,3) DEFAULT 0,
  avg_per_shift INTEGER DEFAULT 0,
  shifts_left INTEGER DEFAULT 0,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'pending',
  assigned_caster TEXT DEFAULT '',
  assigned_haas TEXT DEFAULT '',
  needs_haas BOOLEAN DEFAULT false,
  needs_paint BOOLEAN DEFAULT false,
  is_down BOOLEAN DEFAULT false,
  notes TEXT DEFAULT '',
  profit_per_unit NUMERIC(10,2) DEFAULT 0,
  due_date DATE,
  shifts JSONB DEFAULT '[[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]]',
  week_start DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Week schedule metadata
CREATE TABLE IF NOT EXISTS week_schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE NOT NULL,
  week_dates JSONB DEFAULT '[]',
  file_name TEXT DEFAULT '',
  uploaded_by TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Crew assignments: operators and supervisors per machine per shift
CREATE TABLE IF NOT EXISTS crew_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  machine TEXT NOT NULL,
  shift INTEGER NOT NULL DEFAULT 1,
  role TEXT NOT NULL DEFAULT 'operator',
  name TEXT DEFAULT '',
  week_start DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Daily production actuals
CREATE TABLE IF NOT EXISTS daily_actuals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  machine TEXT DEFAULT '',
  date DATE NOT NULL,
  shift INTEGER DEFAULT 1,
  actual_pcs INTEGER DEFAULT 0,
  scrap_pcs INTEGER DEFAULT 0,
  good_pcs INTEGER DEFAULT 0,
  hours NUMERIC(5,1) DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Machine notes (persistent notes per machine)
CREATE TABLE IF NOT EXISTS machine_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  machine TEXT NOT NULL UNIQUE,
  notes TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE week_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_actuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_notes ENABLE ROW LEVEL SECURITY;

-- Open access policies (add auth later)
CREATE POLICY "Allow all" ON jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON week_schedule FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON crew_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON daily_actuals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON machine_notes FOR ALL USING (true) WITH CHECK (true);

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE crew_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_actuals;

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_updated BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER crew_updated BEFORE UPDATE ON crew_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER notes_updated BEFORE UPDATE ON machine_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_machine ON jobs(machine);
CREATE INDEX IF NOT EXISTS idx_jobs_week ON jobs(week_start);
CREATE INDEX IF NOT EXISTS idx_crew_machine ON crew_assignments(machine);
CREATE INDEX IF NOT EXISTS idx_actuals_date ON daily_actuals(date);
