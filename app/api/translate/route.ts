import { NextResponse } from "next/server";

/**
 * Optional DeepL proxy. Without DEEPL_API_KEY the client falls back to the
 * public Google endpoint, so the app works out of the box.
 */
export async function POST(request: Request) {
  const key = process.env.DEEPL_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "not_configured" }, { status: 501 });
  }

  let payload: { text?: string; target?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const text = (payload.text ?? "").trim().slice(0, 4500);
  const target = (payload.target ?? "tr").slice(0, 5);
  if (!text) {
    return NextResponse.json({ error: "empty" }, { status: 400 });
  }

  const endpoint = key.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";

  const body = new URLSearchParams({ text, target_lang: target.toUpperCase() });

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!res.ok) {
      return NextResponse.json({ error: `deepl_${res.status}` }, { status: 502 });
    }
    const data = (await res.json()) as {
      translations?: Array<{ text?: string; detected_source_language?: string }>;
    };
    const first = data.translations?.[0];
    if (!first?.text) {
      return NextResponse.json({ error: "empty_translation" }, { status: 502 });
    }
    return NextResponse.json({
      text: first.text,
      detected: first.detected_source_language?.toLowerCase(),
      provider: "deepl",
    });
  } catch {
    return NextResponse.json({ error: "deepl_unreachable" }, { status: 502 });
  }
}
