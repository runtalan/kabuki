// Password reset is deprecated after migration to Google OIDC authentication.
// All authentication now uses Google OAuth — users should sign in with Google instead.

export async function POST(request: Request) {
  return new Response(
    JSON.stringify({
      error: 'Password reset is no longer supported. Please sign in with Google.',
    }),
    {
      status: 410, // Gone
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

export async function PUT(request: Request) {
  return new Response(
    JSON.stringify({
      error: 'Password reset is no longer supported. Please sign in with Google.',
    }),
    {
      status: 410, // Gone
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
