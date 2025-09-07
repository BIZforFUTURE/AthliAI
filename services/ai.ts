import { Platform } from "react-native";

export type ContentPart = { type: "text"; text: string } | { type: "image"; image: string };
export type CoreMessage =
  | { role: "system"; content: string | Array<ContentPart> }
  | { role: "user"; content: string | Array<ContentPart> }
  | { role: "assistant"; content: string | Array<ContentPart> };

export interface AnalyzeFoodResult {
  name: string;
  normalizedPortion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface AnalyzeActivityResult {
  name: string;
  minutes: number;
  caloriesBurned: number;
}

export async function callAI(messages: CoreMessage[]): Promise<string> {
  try {
    console.log("AI: sending messages", { count: messages.length, platform: Platform.OS });
    const res = await fetch("https://toolkit.rork.com/text/llm/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("AI: HTTP error", res.status, t);
      throw new Error("AI request failed");
    }
    const json = (await res.json()) as { completion?: string };
    const completion = json?.completion ?? "";
    console.log("AI: completion length", completion.length);
    return completion;
  } catch (e) {
    console.error("AI: call failed", e);
    throw e;
  }
}

export async function analyzeFoodText(input: string): Promise<AnalyzeFoodResult> {
  const system = "You are a nutrition expert. Always respond with strict JSON. No prose.";
  const user = `Estimate nutrition for: "${input}". Return JSON with keys: name, normalizedPortion, calories, protein, carbs, fat. Units: grams for macros, kcal for calories. If portion unspecified, assume common serving. Avoid nulls; use 0 when unknown. Output only JSON.`;
  const completion = await callAI([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);

  const sanitize = (raw: string): string => {
    let s = raw.trim();
    s = s.replace(/```json|```/g, "");
    s = s.replace(/[\u2018\u2019\u201C\u201D]/g, '"');
    const firstBrace = s.indexOf("{");
    const lastBrace = s.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      s = s.slice(firstBrace, lastBrace + 1);
    }
    s = s.replace(/,(\s*[}\]])/g, "$1");
    return s.trim();
  };

  try {
    const jsonStr = sanitize(completion);
    console.log("AI: sanitized JSON candidate", jsonStr);
    const parsed = JSON.parse(jsonStr) as Partial<AnalyzeFoodResult>;
    const result: AnalyzeFoodResult = {
      name: parsed.name ?? input,
      normalizedPortion: parsed.normalizedPortion ?? "1 serving",
      calories: Number(parsed.calories ?? 0),
      protein: Number(parsed.protein ?? 0),
      carbs: Number(parsed.carbs ?? 0),
      fat: Number(parsed.fat ?? 0),
    };
    return result;
  } catch (e) {
    console.error("ERROR AI: JSON parse failed, fallback zeros", e);
    return { name: input, normalizedPortion: "1 serving", calories: 0, protein: 0, carbs: 0, fat: 0 };
  }
}

export async function analyzeActivityText(input: string): Promise<AnalyzeActivityResult> {
  const system = "You are a fitness coach. Always respond with strict JSON. No prose.";
  const user = `Estimate calories burned for the activity: "${input}". Return JSON with keys: name, minutes, caloriesBurned. If duration or intensity not provided, infer a reasonable average for adults. Use kcal for calories. Avoid nulls; use 0 when unknown. Output only JSON.`;
  const completion = await callAI([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);

  const sanitize = (raw: string): string => {
    let s = raw.trim();
    s = s.replace(/```json|```/g, "");
    s = s.replace(/[\u2018\u2019\u201C\u201D]/g, '"');
    const firstBrace = s.indexOf("{");
    const lastBrace = s.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      s = s.slice(firstBrace, lastBrace + 1);
    }
    s = s.replace(/,(\s*[}\]])/g, "$1");
    return s.trim();
  };

  try {
    const jsonStr = sanitize(completion);
    console.log("AI: activity JSON candidate", jsonStr);
    const parsed = JSON.parse(jsonStr) as Partial<AnalyzeActivityResult>;
    const result: AnalyzeActivityResult = {
      name: parsed.name ?? input,
      minutes: Number(parsed.minutes ?? 0),
      caloriesBurned: Number(parsed.caloriesBurned ?? 0),
    };
    return result;
  } catch (e) {
    console.error("ERROR AI: Activity JSON parse failed, fallback zeros", e);
    return { name: input, minutes: 0, caloriesBurned: 0 };
  }
}
