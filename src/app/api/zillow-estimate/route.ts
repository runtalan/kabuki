import { getUser } from '@/lib/auth';

// Zillow does not offer a public, self-serve API for individual home-value
// (Zestimate) lookups — that data requires an approved Zillow Partner/MLS
// integration, which this app doesn't have. Rather than scraping their site
// (against ToS) or fabricating a number, we return an honest "unavailable"
// response so the UI can prompt for a manual value instead.
export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { address } = await request.json();
    if (!address || !address.trim()) {
      return Response.json({ error: 'Address is required' }, { status: 400 });
    }

    return Response.json(
      {
        error:
          "Zillow doesn't offer a public API for home-value lookups — that requires Zillow Partner access this app doesn't have. Enter the value manually for now.",
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error in Zillow estimate route:', error);
    return Response.json({ error: 'Zillow lookup unavailable' }, { status: 500 });
  }
}
