import React, { useEffect } from "react";

import { ColorPalette } from "../interfaces/temas/temas";
import { groqModels, GroqModel } from "../components/models/groqModels";

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
  const modelDevelopers = [...new Set(groqModels.map((model: GroqModel) => model.developer))];
  
  // Log when selectedModel changes to help debug
  useEffect(() => {
    console.log("ModelSelector - Current selected model:", selectedModel);
  }, [selectedModel]);

  return (
    <select
      value={selectedModel}
      onChange={(e) => {
        console.log("Model changed to:", e.target.value);
        onModelChange(e.target.value);
      }}
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
      {modelDevelopers.map((developer: string) => (
        <optgroup key={developer} label={developer}>
          {groqModels
            .filter((model: GroqModel) => model.developer === developer)
            .map((model: GroqModel) => (
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
