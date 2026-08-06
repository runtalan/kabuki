-- Add email column to users table and make passwordHash optional (for Google OIDC migration)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email varchar(255);

-- Populate email for existing users
-- Mapping: renato -> renatountalan@gmail.com, claudia -> claudiapuente00@outlook.com
UPDATE users SET email = 'renatountalan@gmail.com' WHERE username = 'renato' AND email IS NULL;
UPDATE users SET email = 'claudiapuente00@outlook.com' WHERE username = 'claudia' AND email IS NULL;

-- Make email NOT NULL and UNIQUE
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email);

-- Make password_hash optional for Google OIDC migration
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
