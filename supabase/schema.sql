-- ============================================================
-- TEAM TASK MANAGER — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─────────────────────────────────────────
-- 1. EXTENSIONS
-- ─────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ─────────────────────────────────────────
-- 2. ENUM TYPES
-- ─────────────────────────────────────────
CREATE TYPE user_role      AS ENUM ('admin', 'manager', 'member');
CREATE TYPE task_status    AS ENUM ('todo', 'in_progress', 'in_review', 'done');
CREATE TYPE task_priority  AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE member_role    AS ENUM ('manager', 'member');


-- ─────────────────────────────────────────
-- 3. PROFILES
-- Mirrors auth.users — one row per user
-- ─────────────────────────────────────────
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT        NOT NULL,
  email       TEXT        NOT NULL UNIQUE,
  role        user_role   NOT NULL DEFAULT 'member',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create a profile row whenever a user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown'),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'member')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─────────────────────────────────────────
-- 4. PROJECTS
-- ─────────────────────────────────────────
CREATE TABLE projects (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT        NOT NULL,
  description TEXT,
  owner_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  color       TEXT        NOT NULL DEFAULT '#6366f1',   -- hex for UI badge
  is_archived BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─────────────────────────────────────────
-- 5. PROJECT MEMBERS
-- Who belongs to a project and in what role
-- ─────────────────────────────────────────
CREATE TABLE project_members (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        member_role NOT NULL DEFAULT 'member',
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);

-- Index for fast lookups
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user    ON project_members(user_id);


-- ─────────────────────────────────────────
-- 6. TASKS
-- ─────────────────────────────────────────
CREATE TABLE tasks (
  id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT          NOT NULL,
  description  TEXT,
  project_id   UUID          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  creator_id   UUID          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assignee_id  UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  status       task_status   NOT NULL DEFAULT 'todo',
  priority     task_priority NOT NULL DEFAULT 'medium',
  due_date     DATE,
  position     INTEGER       NOT NULL DEFAULT 0,   -- for drag-and-drop ordering
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_project    ON tasks(project_id);
CREATE INDEX idx_tasks_assignee   ON tasks(assignee_id);
CREATE INDEX idx_tasks_status     ON tasks(status);
CREATE INDEX idx_tasks_due_date   ON tasks(due_date);

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─────────────────────────────────────────
-- 7. TASK COMMENTS
-- ─────────────────────────────────────────
CREATE TABLE task_comments (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id    UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_comments_task ON task_comments(task_id);

CREATE TRIGGER task_comments_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─────────────────────────────────────────
-- 8. ACTIVITY LOG  (audit trail)
-- ─────────────────────────────────────────
CREATE TABLE activity_log (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID        REFERENCES projects(id) ON DELETE CASCADE,
  task_id     UUID        REFERENCES tasks(id)    ON DELETE CASCADE,
  actor_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action      TEXT        NOT NULL,   -- e.g. 'task.created', 'task.status_changed'
  meta        JSONB,                  -- e.g. { from: 'todo', to: 'in_progress' }
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_project ON activity_log(project_id);
CREATE INDEX idx_activity_task    ON activity_log(task_id);


-- ─────────────────────────────────────────
-- 9. HELPER VIEWS
-- ─────────────────────────────────────────

-- Tasks enriched with assignee name and project name
CREATE VIEW tasks_detail AS
SELECT
  t.*,
  p.full_name  AS assignee_name,
  p.avatar_url AS assignee_avatar,
  pr.name      AS project_name,
  pr.color     AS project_color
FROM tasks t
LEFT JOIN profiles p  ON p.id  = t.assignee_id
LEFT JOIN projects pr ON pr.id = t.project_id;

-- Per-project task counts (used on dashboard)
CREATE VIEW project_task_stats AS
SELECT
  project_id,
  COUNT(*)                                             AS total,
  COUNT(*) FILTER (WHERE status = 'todo')              AS todo,
  COUNT(*) FILTER (WHERE status = 'in_progress')       AS in_progress,
  COUNT(*) FILTER (WHERE status = 'in_review')         AS in_review,
  COUNT(*) FILTER (WHERE status = 'done')              AS done,
  COUNT(*) FILTER (WHERE due_date < CURRENT_DATE
                     AND status != 'done')             AS overdue
FROM tasks
GROUP BY project_id;


-- ─────────────────────────────────────────
-- 10. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────

ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log    ENABLE ROW LEVEL SECURITY;


-- ── profiles ──────────────────────────────
-- Everyone can read profiles (needed for assignee dropdowns)
CREATE POLICY "profiles: read all"
  ON profiles FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles: update own"
  ON profiles FOR UPDATE USING (auth.uid() = id);


-- ── projects ──────────────────────────────
-- Members can see projects they belong to; admins see all
CREATE POLICY "projects: read if member or admin"
  ON projects FOR SELECT USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = projects.id AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins and managers can create projects
CREATE POLICY "projects: insert admin or manager"
  ON projects FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Owner or admin can update/delete
CREATE POLICY "projects: update owner or admin"
  ON projects FOR UPDATE USING (
    auth.uid() = owner_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "projects: delete owner or admin"
  ON projects FOR DELETE USING (
    auth.uid() = owner_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ── project_members ───────────────────────
CREATE POLICY "project_members: read if in project"
  ON project_members FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM project_members pm2
      WHERE pm2.project_id = project_members.project_id AND pm2.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "project_members: manage if manager or admin"
  ON project_members FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_members pm2
      WHERE pm2.project_id = project_members.project_id
        AND pm2.user_id = auth.uid()
        AND pm2.role = 'manager'
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );


-- ── tasks ─────────────────────────────────
CREATE POLICY "tasks: read if project member"
  ON tasks FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = tasks.project_id AND user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "tasks: insert if project member"
  ON tasks FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = tasks.project_id AND user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Assignee can update status; manager/admin can update everything
CREATE POLICY "tasks: update assignee or manager"
  ON tasks FOR UPDATE USING (
    auth.uid() = assignee_id
    OR auth.uid() = creator_id
    OR EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = tasks.project_id AND user_id = auth.uid() AND role = 'manager'
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "tasks: delete creator or manager"
  ON tasks FOR DELETE USING (
    auth.uid() = creator_id
    OR EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = tasks.project_id AND user_id = auth.uid() AND role = 'manager'
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ── task_comments ─────────────────────────
CREATE POLICY "comments: read if project member"
  ON task_comments FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id
      WHERE t.id = task_comments.task_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "comments: insert if project member"
  ON task_comments FOR INSERT WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id
      WHERE t.id = task_comments.task_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "comments: delete own"
  ON task_comments FOR DELETE USING (auth.uid() = author_id);


-- ── activity_log ──────────────────────────
CREATE POLICY "activity: read if project member"
  ON activity_log FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = activity_log.project_id AND user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "activity: insert authenticated"
  ON activity_log FOR INSERT WITH CHECK (auth.uid() = actor_id);


-- ─────────────────────────────────────────
-- 11. SEED: First admin user helper
-- After signing up, run this once to promote yourself to admin:
--   UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
-- ─────────────────────────────────────────