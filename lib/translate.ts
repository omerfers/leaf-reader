export interface Translation {
  text: string;
  detected?: string;
  provider: "deepl" | "google" | "mymemory";
}

const MAX_CHARS = 4500;

export async function translate(
  text: string,
  target: string,
  source = "auto",
): Promise<Translation> {
  const clean = text.trim().slice(0, MAX_CHARS);
  if (!clean) throw new Error("Nothing to translate");

  // A DeepL key on the server is the biggest quality jump; without one this
  // throws 501 and we use Google's public endpoint.
  try {
    return await viaDeepL(clean, target);
  } catch {
    // fall through
  }

  try {
    return await viaGoogle(clean, target, source);
  } catch {
    return await viaMyMemory(clean, target, source);
  }
}

async function viaDeepL(text: string, target: string): Promise<Translation> {
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, target }),
  });
  if (!res.ok) throw new Error(`deepl ${res.status}`);
  const data = (await res.json()) as { text?: string; detected?: string };
  if (!data.text) throw new Error("empty deepl translation");
  return { text: data.text, detected: data.detected, provider: "deepl" };
}

async function viaGoogle(text: string, target: string, source: string): Promise<Translation> {
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t" +
    `&sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}` +
    `&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google ${res.status}`);
  const data = (await res.json()) as [Array<[string]> | null, unknown, string?];
  const chunks = (data[0] ?? []).map((part) => part?.[0] ?? "").join("");
  if (!chunks) throw new Error("Empty translation");
  return { text: chunks, detected: data[2], provider: "google" };
}

async function viaMyMemory(text: string, target: string, source: string): Promise<Translation> {
  const langpair = `${source === "auto" ? "en" : source}|${target}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
    text.slice(0, 500),
  )}&langpair=${encodeURIComponent(langpair)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MyMemory ${res.status}`);
  const data = (await res.json()) as { responseData?: { translatedText?: string } };
  const translated = data.responseData?.translatedText;
  if (!translated) throw new Error("Empty translation");
  return { text: translated, provider: "mymemory" };
}
