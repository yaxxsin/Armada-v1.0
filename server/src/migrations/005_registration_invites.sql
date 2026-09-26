-- One-time registration invitations for admin-managed onboarding.
CREATE TABLE IF NOT EXISTS registration_invites (
  id          BIGSERIAL PRIMARY KEY,
  code_hash   TEXT NOT NULL UNIQUE,
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  used_by     INT REFERENCES users(id) ON DELETE SET NULL,
  created_by  INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registration_invites_active
  ON registration_invites (code_hash, expires_at)
  WHERE used_at IS NULL;
