export interface GeminiModel {
  id: string;
  name: string;
  developer: string;
  provider: "gemini";
  contextWindow?: string;
}

export const geminiModels: GeminiModel[] = [
  { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", developer: "Google", provider: "gemini", contextWindow: "1000000" },
  { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro (Preview)", developer: "Google", provider: "gemini", contextWindow: "1000000" },
  { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite", developer: "Google", provider: "gemini", contextWindow: "1000000" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", developer: "Google", provider: "gemini", contextWindow: "1000000" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", developer: "Google", provider: "gemini", contextWindow: "1000000" }
];
