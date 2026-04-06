-- users 테이블
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) UNIQUE NOT NULL,
  password   VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ddays 테이블
CREATE TABLE IF NOT EXISTS ddays (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(100) NOT NULL,
  category    VARCHAR(50) NOT NULL,
  target_date DATE NOT NULL,
  is_public   BOOLEAN DEFAULT FALSE,
  share_token VARCHAR(21) UNIQUE,
  share_theme VARCHAR(50),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
