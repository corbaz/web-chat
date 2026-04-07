import React, { useEffect, useMemo } from "react";
import Select, { GroupBase, StylesConfig } from "react-select";

import { ColorPalette } from "../../interfaces/temas/temas";
import { groqModels } from "./models/groqModels";
import { routellmModels } from "./models/routellmModels";
import { openaiModels } from "./models/openaiModels";
import { anthropicModels } from "./models/anthropicModels";

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  theme: ColorPalette;
  providerFilter?: string;
}

interface ModelOption {
  value: string;
  label: string;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  theme,
  providerFilter,
}) => {
  const allModels = [
    ...groqModels,
    ...routellmModels,
    ...openaiModels,
    ...anthropicModels,
  ];

  const filteredModels = providerFilter
    ? allModels.filter((model) => model.provider === providerFilter)
    : allModels;

  const modelDevelopers = [
    ...new Set(filteredModels.map((model) => model.developer)),
  ];

  const groupedOptions: GroupBase<ModelOption>[] = modelDevelopers.map(
    (developer) => ({
      label: developer.toUpperCase(),
      options: filteredModels
        .filter((model) => model.developer === developer)
        .map((model) => ({
          value: model.id,
          label: model.name,
        })),
    }),
  );

  // Calcular ancho basado en la opción más larga + 20% (10% cada lado)
  const selectorWidth = useMemo(() => {
    const longestLabel = filteredModels.reduce(
      (max, m) => (m.name.length > max.length ? m.name : max),
      "",
    );
    // ~7.5px por carácter a 0.85rem + padding para indicador
    const baseWidth = longestLabel.length * 7.5 + 52;
    const withPadding = Math.round(baseWidth * 1.2);
    return `${Math.max(withPadding, 180)}px`;
  }, [filteredModels]);

  useEffect(() => {
    console.log("ModelSelector - Current selected model:", selectedModel);
  }, [selectedModel]);

  const customStyles: StylesConfig<
    ModelOption,
    false,
    GroupBase<ModelOption>
  > = {
    control: (provided, state) => ({
      ...provided,
      border: "none",
      borderRadius: "12px",
      padding: "4px 8px",
      backgroundColor: theme.background,
      boxShadow: state.menuIsOpen ? theme.shadow.inset : theme.shadow.sm,
      width: selectorWidth,
      maxWidth: "100%",
      transition: "box-shadow 0.25s ease",
      "&:hover": {
        boxShadow: theme.shadow.outer,
        cursor: "pointer",
      },
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: theme.background,
      color: state.isSelected ? theme.accent : theme.text,
      cursor: "pointer",
      borderRadius: "10px",
      margin: "4px auto",
      width: "calc(100% - 4px)",
      padding: "8px 12px",
      fontWeight: state.isSelected ? 600 : 400,
      boxShadow: state.isSelected ? theme.shadow.inset : "none",
      whiteSpace: "nowrap" as const,
      transition: "box-shadow 0.2s ease, color 0.2s ease",
      "&:hover": {
        boxShadow: theme.shadow.sm,
        color: theme.accent,
      },
    }),
    singleValue: (provided) => ({
      ...provided,
      color: theme.text,
      fontWeight: 500,
      fontSize: "0.85rem",
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: theme.background,
      borderRadius: "14px",
      boxShadow: theme.shadow.outer,
      border: "none",
      overflow: "hidden",
      padding: "6px 0",
      width: selectorWidth,
      zIndex: 9999,
    }),
    menuList: (provided) => ({
      ...provided,
      padding: "8px 15px 8px 14px",
      maxHeight: "320px",
      overflowX: "hidden" as const,
    }),
    group: (provided) => ({
      ...provided,
      paddingTop: "6px",
      paddingBottom: "6px",
    }),
    groupHeading: (provided) => ({
      ...provided,
      color: theme.accent,
      fontWeight: 700,
      fontSize: "0.7rem",
      letterSpacing: "0.08em",
      textTransform: "uppercase" as const,
      marginBottom: "6px",
      paddingLeft: "14px",
    }),
    indicatorSeparator: () => ({
      display: "none",
    }),
    dropdownIndicator: (provided, state) => ({
      ...provided,
      color: theme.textMuted,
      transition: "transform 0.25s ease, color 0.25s ease",
      transform: state.selectProps.menuIsOpen
        ? "rotate(180deg)"
        : "rotate(0deg)",
      "&:hover": {
        color: theme.accent,
      },
    }),
    placeholder: (provided) => ({
      ...provided,
      color: theme.textMuted,
      fontSize: "0.85rem",
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
