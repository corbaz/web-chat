import React, { useEffect } from "react";
import Select, { GroupBase, StylesConfig } from "react-select";

import { ColorPalette } from "../../interfaces/temas/temas";
import { groqModels, GroqModel } from "./models/groqModels";

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  theme: ColorPalette;
}

// Interfaz para las opciones del selector
interface ModelOption {
  value: string;
  label: string;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  theme,
}) => {
  // Obtener los desarrolladores únicos de modelos
  const modelDevelopers = [
    ...new Set(groqModels.map((model: GroqModel) => model.developer)),
  ];

  // Preparar las opciones agrupadas para react-select
  const groupedOptions: GroupBase<ModelOption>[] = modelDevelopers.map(
    (developer) => ({
      label: developer.toUpperCase(),
      options: groqModels
        .filter((model) => model.developer === developer)
        .map((model) => ({
          value: model.id,
          label: model.name,
        })),
    }),
  );

  // Log when selectedModel changes to help debug
  useEffect(() => {
    console.log("ModelSelector - Current selected model:", selectedModel);
  }, [selectedModel]);

  // Estilos personalizados para react-select con tipos adecuados
  const customStyles: StylesConfig<
    ModelOption,
    false,
    GroupBase<ModelOption>
  > = {
    control: (provided) => ({
      ...provided,
      border: `3px solid ${theme.messages.ai.background}`,
      borderRadius: "6px",
      padding: "1px",
      backgroundColor: theme.input.background,
      boxShadow: "none",
      "&:hover": {
        border: `3px solid ${"theme.messages.ai.background"}`,
        cursor: "pointer",
      },
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? theme.selectModel.isSelectedBackground
        : theme.selectModel.modelBackground,
      color: state.isSelected
        ? theme.selectModel.isSelectedText
        : theme.selectModel.modelText,
      cursor: "pointer",
      "&:hover": {
        backgroundColor: theme.selectModel.hoverBackground,
        color: theme.selectModel.hoverText,
      },
    }),
    singleValue: (provided) => ({
      ...provided,
      color: theme.selectModel.text,
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: theme.selectModel.empresaBackground,
      zIndex: 9999,
    }),
    group: (provided) => ({
      ...provided,
      paddingTop: "6px",
      paddingBottom: "6px",
    }),
    groupHeading: (provided) => ({
      ...provided,
      color: theme.selectModel.empresaText,
      fontWeight: "bold",
      fontSize: "0.85em",
      marginBottom: "14px",
      textAlign: "center",
      backgroundColor: theme.selectModel.empresaBackground,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }),
  };

  return (
    <Select<ModelOption, false, GroupBase<ModelOption>>
      instanceId="model-selector"
      value={groupedOptions
        .flatMap((group) => group.options)
        .find((option) => option.value === selectedModel)}
      onChange={(option) => {
        if (option) {
          console.log("Model changed to:", option.value);
          onModelChange(option.value);
        }
      }}
      options={groupedOptions}
      styles={customStyles}
      isSearchable={false}
      placeholder="Seleccionar modelo"
      aria-label="Seleccionar modelo de IA"
      className="react-select-container"
      classNamePrefix="react-select"
    />
  );
};

export default ModelSelector;
