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
    const modelDevelopers = [
        ...new Set(groqModels.map((model: GroqModel) => model.developer)),
    ];

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
                border: `1px solid ${isDarkTheme ? theme.input.text : theme.input.background}`,
                backgroundColor: isDarkTheme
                    ? theme.input.background
                    : theme.input.text,
                color: isDarkTheme ? theme.input.text : theme.input.background,
                fontWeight: "bold",
                fontSize: "14px",
                marginRight: "15px",
                cursor: "pointer",
            }}
            title="Seleccionar modelo de IA"
        >
            {modelDevelopers.map((developer: string) => (
                <optgroup
                    key={developer}
                    label={developer.toUpperCase()}
                    style={{ color: "red" }}
                >
                    {groqModels
                        .filter(
                            (model: GroqModel) => model.developer === developer
                        )
                        .map((model: GroqModel) => (
                            <option
                                key={model.id}
                                value={model.id}
                                style={{ color: "blue" }}
                            >
                                {model.name}
                            </option>
                        ))}
                </optgroup>
            ))}
        </select>
    );
};

export default ModelSelector;
