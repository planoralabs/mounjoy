// Supabase Edge Function: analyze-meal-photo
//
// Receives a base64 photo of a meal, calls the Gemini API server-side (the
// GEMINI_API_KEY secret never reaches the client bundle), and returns a
// structured list of detected food items with estimated grams. The image
// itself is never persisted anywhere — it only exists in memory for the
// duration of this request. See mobile_documentation.md section 7 for the
// full feature design.
//
// Deploy: supabase functions deploy analyze-meal-photo
// Secret:  supabase secrets set GEMINI_API_KEY=your-key-here

import { createClient } from "jsr:@supabase/supabase-js@2";

const GEMINI_MODEL = "gemini-flash-lite-latest";

// Anti-abuse limits — tune here if legitimate users start hitting them.
const DAILY_SCAN_LIMIT = 20;
const MIN_SECONDS_BETWEEN_SCANS = 5;
// Base64 is ~4/3 the size of the raw bytes; 7,000,000 chars ≈ 5.2MB image.
const MAX_BASE64_LENGTH = 7_000_000;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// App UI languages (src/i18n/resolve.js SUPPORTED_LANGUAGES) → the name the
// prompt uses. Unknown / missing codes fall back to English.
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  pt: "Brazilian Portuguese",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
};

const PROMPT = `You are a nutrition-estimation assistant. Identify every distinct food item visible in this photo of a meal.

For each item, estimate its weight in grams based on typical portion sizes and visual cues (plate size, comparison to utensils, etc), and estimate its typical macronutrients PER 100 GRAMS (not for the estimated portion — per 100g, like a nutrition label) based on your general nutrition knowledge for that kind of food.

Respond with ONLY a JSON array (no markdown, no prose), in this exact shape:
[{ "name": string, "category": string, "estimatedGrams": number, "confidence": number, "caloriesPer100g": number, "proteinPer100g": number, "carbsPer100g": number, "fatPer100g": number }]

- "name": short, common food name, written in {{LANGUAGE}}.
- "category": one of "protein", "carb", "vegetable", "fruit", "dairy", "fat", "beverage", "other".
- "estimatedGrams": your best estimate of the portion size shown, a positive number.
- "confidence": 0 to 1, how confident you are in the identification (not the weight or the macros).
- "caloriesPer100g", "proteinPer100g" (grams), "carbsPer100g" (grams), "fatPer100g" (grams): typical values for this food PER 100 GRAMS, using your general nutrition knowledge — these should stay roughly the same regardless of the portion size shown.

If no food is visible, respond with an empty array: []`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    // ⚠️ TEMPORARY (2026-08-25): auth is optional right now so guest mode
    // can be tested without wiring up anonymous sign-in yet. This disables
    // the per-user rate limit for unauthenticated callers — anyone with the
    // public anon key can call this function and spend Gemini quota with no
    // throttling. Re-enable before any real/store release: either make
    // authHeader required again (see git history for the strict version) or
    // wire up supabase.auth.signInAnonymously() on the client so guests get
    // a real JWT — see mobile_documentation.md section 7.9.
    const authHeader = req.headers.get("Authorization");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      authHeader ? { global: { headers: { Authorization: authHeader } } } : undefined,
    );

    let user = null;
    if (authHeader) {
      const { data } = await supabaseClient.auth.getUser();
      user = data.user;
    }

    // Rate limit BEFORE touching the request body — reject cheaply, without
    // even parsing a potentially large payload, once a caller is over quota.
    // Only enforced for authenticated callers right now (see warning above).
    if (user) {
      const { data: usage, error: usageError } = await supabaseClient.rpc(
        "check_and_increment_meal_scan_usage",
        { daily_limit: DAILY_SCAN_LIMIT, min_interval_seconds: MIN_SECONDS_BETWEEN_SCANS },
      );
      if (usageError) {
        console.error("Rate-limit check failed:", usageError);
        return jsonResponse({ error: "Internal error" }, 500);
      }
      if (!usage?.allowed) {
        return jsonResponse(
          {
            error: usage?.reason === "too_frequent"
              ? "Aguarde alguns segundos antes de escanear outro prato."
              : `Limite diário de ${usage?.limit ?? DAILY_SCAN_LIMIT} análises atingido. Tente novamente amanhã.`,
            // The app translates `reason` (+ `limit`) itself; `error` stays
            // as a Portuguese fallback for older app builds.
            reason: usage?.reason,
            limit: usage?.limit ?? DAILY_SCAN_LIMIT,
          },
          429,
        );
      }
    }

    const { imageBase64, mimeType, totalWeightHintGrams, language } = await req.json();
    const languageName = LANGUAGE_NAMES[language] || LANGUAGE_NAMES.en;
    const prompt = PROMPT.replace("{{LANGUAGE}}", languageName);
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return jsonResponse({ error: "imageBase64 is required" }, 400);
    }
    if (imageBase64.length > MAX_BASE64_LENGTH) {
      return jsonResponse({ error: "Image too large" }, 413);
    }
    if (mimeType && !ALLOWED_MIME_TYPES.has(mimeType)) {
      return jsonResponse({ error: "Unsupported image type" }, 415);
    }
    const weightHint = typeof totalWeightHintGrams === "number" && totalWeightHintGrams > 0 && totalWeightHintGrams <= 5000
      ? Math.round(totalWeightHintGrams)
      : null;

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return jsonResponse({ error: "GEMINI_API_KEY not configured on the server" }, 500);
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: weightHint
                  ? `${prompt}\n\nThe user says the whole plate weighs approximately ${weightHint}g total — use this as ground truth to calibrate your per-item gram estimates so they roughly sum to this total.`
                  : prompt,
              },
              { inline_data: { mime_type: mimeType || "image/jpeg", data: imageBase64 } },
            ],
          }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      },
    );

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      console.error("Gemini API error:", geminiRes.status, errBody);
      return jsonResponse({ error: "Vision analysis failed" }, 502);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";

    let items;
    try {
      items = JSON.parse(rawText);
    } catch {
      console.error("Failed to parse Gemini JSON output:", rawText);
      return jsonResponse({ error: "Could not parse analysis result" }, 502);
    }

    if (!Array.isArray(items)) {
      return jsonResponse({ error: "Unexpected analysis result shape" }, 502);
    }

    // Basic shape validation — never trust the model's output blindly.
    const positiveNumber = (v: unknown) => (typeof v === "number" && v >= 0 ? v : 0);
    const cleanItems = items
      .filter((item) =>
        item && typeof item.name === "string" &&
        typeof item.estimatedGrams === "number" && item.estimatedGrams > 0
      )
      .map((item) => ({
        name: String(item.name).slice(0, 100),
        category: typeof item.category === "string" ? item.category : "other",
        estimatedGrams: Math.round(item.estimatedGrams),
        confidence: typeof item.confidence === "number" ? Math.max(0, Math.min(1, item.confidence)) : 0.5,
        // AI-estimated macros per 100g — a fallback source, used until the
        // item is found in our own food_items table (more authoritative
        // once seeded). See mobile_documentation.md 7.10.
        caloriesPer100g: positiveNumber(item.caloriesPer100g),
        proteinPer100g: positiveNumber(item.proteinPer100g),
        carbsPer100g: positiveNumber(item.carbsPer100g),
        fatPer100g: positiveNumber(item.fatPer100g),
      }));

    return jsonResponse({ items: cleanItems });
  } catch (err) {
    console.error("analyze-meal-photo error:", err);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
