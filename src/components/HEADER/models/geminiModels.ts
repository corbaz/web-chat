export interface GeminiModel {
  id: string;
  name: string;
  developer: string;
  provider: "gemini";
  contextWindow?: string;
}

export const geminiModels: GeminiModel[] = [
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", developer: "Google", provider: "gemini", contextWindow: "1000000" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", developer: "Google", provider: "gemini", contextWindow: "2000000" },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", developer: "Google", provider: "gemini", contextWindow: "1000000" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", developer: "Google", provider: "gemini", contextWindow: "2000000" }
];
