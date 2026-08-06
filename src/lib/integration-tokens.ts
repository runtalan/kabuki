import crypto from 'crypto';

// Plaintext tokens are shown to the user exactly once, at generation time —
// only a SHA-256 hash is ever persisted, so a leaked database dump doesn't
// hand out working credentials.
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Prefixed so a token is recognizable at a glance (in a Shortcut, a log
// line, etc.) without being guessable — 24 random bytes of entropy after it.
export function generateToken(): string {
  return `kab_${crypto.randomBytes(24).toString('hex')}`;
}
