import { getUser } from "@/lib/auth";
import { saveAlpacaSettings, getAlpacaSettings } from "@/lib/alpaca-settings";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getAlpacaSettings(user.id);
  return NextResponse.json({
    hasSettings: !!settings,
    apiKeyId: settings?.apiKeyId || "",
  });
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { apiKeyId, apiSecretKey } = await request.json();

  if (!apiKeyId || !apiSecretKey) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    await saveAlpacaSettings(user.id, apiKeyId, apiSecretKey);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save Alpaca settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
