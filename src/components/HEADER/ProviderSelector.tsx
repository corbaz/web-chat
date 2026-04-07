import React, { useEffect, useState, useMemo } from "react";
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

  useEffect(() => {
    const handler = () => setRefreshToken((v) => v + 1);
    window.addEventListener("apikey-changed", handler);
    return () => window.removeEventListener("apikey-changed", handler);
  }, []);

  const providers = allProviders.filter((provider) => {
    const apiKey = localStorage.getItem(`${provider.value}ApiKey`);
    return apiKey && apiKey.trim() !== "";
  });

  useEffect(() => {
    if (providers.length === 0) return;
    const exists = providers.some((p) => p.value === selectedProvider);
    if (!exists && onProviderChange) {
      onProviderChange(providers[0].value);
    }
  }, [providers, selectedProvider, onProviderChange, refreshToken]);

  // Calcular ancho basado en la opción más larga + 20% (10% cada lado)
  const selectorWidth = useMemo(() => {
    const longestLabel = providers.reduce(
      (max, p) => (p.label.length > max.length ? p.label : max),
      "",
    );
    const baseWidth = longestLabel.length * 7.5 + 52;
    const withPadding = Math.round(baseWidth * 1.2);
    return `${Math.max(withPadding, 140)}px`;
  }, [providers]);

  const customStyles: StylesConfig<ProviderOption, false> = {
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
