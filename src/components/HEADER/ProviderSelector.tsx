import React, { useEffect, useState } from "react";
import Select, { StylesConfig } from "react-select";
import { ColorPalette } from "../../interfaces/temas/temas";

interface ProviderSelectorProps {
  selectedProvider: string;
  onProviderChange: (providerId: string) => void;
  theme: ColorPalette;
}

interface ProviderOption {
  value: string;
  label: string;
}

const allProviders: ProviderOption[] = [
  { value: "groq", label: "Groq" },
  { value: "routellm", label: "RouteLLM" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
];

const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  selectedProvider,
  onProviderChange,
  theme,
}) => {
  const [refreshToken, setRefreshToken] = useState(0);

  // Escuchar cambios de API keys para refrescar el listado
  useEffect(() => {
    const handler = () => setRefreshToken((v) => v + 1);
    window.addEventListener("apikey-changed", handler);
    return () => window.removeEventListener("apikey-changed", handler);
  }, []);

  // Filtrar solo proveedores que tengan API key configurada
  const providers = allProviders.filter((provider) => {
    const apiKey = localStorage.getItem(`${provider.value}ApiKey`);
    return apiKey && apiKey.trim() !== "";
  });

  // Si el proveedor seleccionado ya no está disponible, cambiar al primero disponible
  useEffect(() => {
    if (providers.length === 0) return;
    const exists = providers.some((p) => p.value === selectedProvider);
    if (!exists && onProviderChange) {
      onProviderChange(providers[0].value);
    }
  }, [providers, selectedProvider, onProviderChange, refreshToken]);
  const customStyles: StylesConfig<ProviderOption, false> = {
    control: (provided) => ({
      ...provided,
      border: `3px solid ${theme.messages.ai.background}`,
      borderRadius: "6px",
      padding: "1px",
      backgroundColor: theme.input.background,
      boxShadow: "none",
      minWidth: "180px",
      "&:hover": {
        border: `3px solid ${theme.messages.ai.background}`,
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
  };

  // Si no hay proveedores disponibles, no mostrar nada
  if (providers.length === 0) {
    return null;
  }

  return (
    <Select<ProviderOption, false>
      instanceId="provider-selector"
      value={providers.find((p) => p.value === selectedProvider)}
      onChange={(option) => {
        if (option) {
          onProviderChange(option.value);
        }
      }}
      options={providers}
      styles={customStyles}
      isSearchable={false}
      placeholder="Proveedor"
      aria-label="Seleccionar proveedor"
      className="react-select-container"
      classNamePrefix="react-select"
    />
  );
};

export default ProviderSelector;
