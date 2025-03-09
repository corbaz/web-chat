import React from "react";
import { ColorPalette } from "../interfaces/temas/temas";

// Definición de los modelos de Groq
export const groqModels = [
  // Meta
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B Versatile",
    developer: "Meta",
    contextWindow: "128K",
  },
  {
    id: "llama3-8b-8192",
    name: "Llama 3 8B",
    developer: "Meta",
    contextWindow: "8,192",
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B Instant",
    developer: "Meta",
    contextWindow: "128K",
  },
  {
    id: "llama-guard-3-8b",
    name: "Llama Guard 3 8B",
    developer: "Meta",
    contextWindow: "8,192",
  },
  {
    id: "llama3-70b-8192",
    name: "Llama 3 70B",
    developer: "Meta",
    contextWindow: "8,192",
  },
  {
    id: "llama-3.3-70b-specdec",
    name: "Llama 3.3 70B SpecDec",
    developer: "Meta",
    contextWindow: "8,192",
  },
  {
    id: "llama-3.2-1b-preview",
    name: "Llama 3.2 1B Preview",
    developer: "Meta",
    contextWindow: "128K",
  },
  {
    id: "llama-3.2-3b-preview",
    name: "Llama 3.2 3B Preview",
    developer: "Meta",
    contextWindow: "128K",
  },
  {
    id: "llama-3.2-11b-vision-preview",
    name: "Llama 3.2 11B Vision Preview",
    developer: "Meta",
    contextWindow: "128K",
  },
  {
    id: "llama-3.2-90b-vision-preview",
    name: "Llama 3.2 90B Vision Preview",
    developer: "Meta",
    contextWindow: "128K",
  },

  // Mistral AI
  {
    id: "mixtral-8x7b-32768",
    name: "Mixtral 8x7B",
    developer: "Mistral AI",
    contextWindow: "32,768",
  },
  {
    id: "mistral-saba-24b",
    name: "Mistral Saba 24B",
    developer: "Mistral AI",
    contextWindow: "32K",
  },

  // Google
  {
    id: "gemma2-9b-it",
    name: "Gemma 2 9B IT",
    developer: "Google",
    contextWindow: "8,192",
  },

  // Alibaba Cloud
  {
    id: "qwen-qwq-32b",
    name: "Qwen QWQ 32B",
    developer: "Alibaba Cloud",
    contextWindow: "128K",
  },
  {
    id: "qwen-2.5-coder-32b",
    name: "Qwen 2.5 Coder 32B",
    developer: "Alibaba Cloud",
    contextWindow: "128K",
  },
  {
    id: "qwen-2.5-32b",
    name: "Qwen 2.5 32B",
    developer: "Alibaba Cloud",
    contextWindow: "128K",
  },

  // DeepSeek / Alibaba Cloud
  {
    id: "deepseek-r1-distill-qwen-32b",
    name: "Deepseek R1 Distill Qwen 32B",
    developer: "DeepSeek / Alibaba Cloud",
    contextWindow: "128K",
  },

  // DeepSeek / Meta
  {
    id: "deepseek-r1-distill-llama-70b",
    name: "Deepseek R1 Distill Llama 70B",
    developer: "DeepSeek / Meta",
    contextWindow: "128K",
  },
  {
    id: "deepseek-r1-distill-llama-70b-specdec",
    name: "Deepseek R1 Distill Llama 70B SpecDec",
    developer: "DeepSeek / Meta",
    contextWindow: "128K",
  },

  // OpenAI
  {
    id: "whisper-large-v3",
    name: "Whisper Large v3",
    developer: "OpenAI",
    contextWindow: "-",
  },
  {
    id: "whisper-large-v3-turbo",
    name: "Whisper Large v3 Turbo",
    developer: "OpenAI",
    contextWindow: "-",
  },
  {
    id: "distil-whisper-large-v3-en",
    name: "Distil Whisper Large v3 (EN)",
    developer: "HuggingFace",
    contextWindow: "-",
  },
];

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  theme: ColorPalette;
  isDarkTheme: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  theme,
  isDarkTheme,
}) => {
  // Obtener los desarrolladores únicos de modelos
  const modelDevelopers = [...new Set(groqModels.map((model) => model.developer))];

  return (
    <select
      value={selectedModel}
      onChange={(e) => onModelChange(e.target.value)}
      style={{
        padding: "6px 10px",
        borderRadius: "4px",
        border: `1px solid ${theme.chat.border}`,
        backgroundColor: isDarkTheme ? "#2a2a2a" : "#f5f5f5",
        color: theme.text,
        fontSize: "14px",
        marginRight: "15px",
        cursor: "pointer",
      }}
      title="Seleccionar modelo de IA"
    >
      {modelDevelopers.map((developer) => (
        <optgroup key={developer} label={developer}>
          {groqModels
            .filter((model) => model.developer === developer)
            .map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.contextWindow})
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
};

export default ModelSelector;
