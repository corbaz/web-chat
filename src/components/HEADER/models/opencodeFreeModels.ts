export interface OpenCodeFreeModel {
  id: string;
  name: string;
  developer: string;
  provider: "opencodefree";
  contextWindow?: string;
}

export const opencodeFreeModels: OpenCodeFreeModel[] = [
  {
    id: "mimo-v2.5-free",
    name: "MiMo V2.5 Free",
    developer: "MiMo AI",
    provider: "opencodefree",
    contextWindow: "128000",
  },
  {
    id: "deepseek-v4-flash-free",
    name: "DeepSeek V4 Flash Free",
    developer: "DeepSeek",
    provider: "opencodefree",
    contextWindow: "128000",
  },
  {
    id: "nemotron-3-ultra-free",
    name: "Nemotron 3 Ultra Free",
    developer: "NVIDIA",
    provider: "opencodefree",
    contextWindow: "128000",
  },
  {
    id: "north-mini-code-free",
    name: "North Mini Code Free",
    developer: "Cohere",
    provider: "opencodefree",
    contextWindow: "128000",
  },
  {
    id: "big-pickle",
    name: "Big Pickle Free",
    developer: "Stealth",
    provider: "opencodefree",
    contextWindow: "128000",
  },
];
