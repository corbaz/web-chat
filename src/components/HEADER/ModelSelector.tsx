import type React from 'react'
import { useEffect, useMemo } from 'react'
import Select, {
  components,
  type GroupBase,
  type OptionProps,
  type SingleValue,
  type SingleValueProps,
  type StylesConfig,
} from 'react-select'

import { supportsVision } from '../../config/vision'
import { supportsWebSearch } from '../../config/webSearch'
import type { ColorPalette } from '../../interfaces/temas/temas'
import { useModelCatalog } from '../../services/modelCatalog/useModelCatalog'

interface ModelSelectorProps {
  selectedModel: string
  onModelChange: (modelId: string) => void
  theme: ColorPalette
  providerFilter?: string
}

interface ModelOption {
  value: string
  label: string
  provider?: string
}

const GlobeIcon: React.FC<{ className?: string }> = ({
  className = 'size-3.5',
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
)

// Ojo: marca los modelos que aceptan imágenes (ver config/vision.ts).
const EyeIcon: React.FC<{ className?: string }> = ({
  className = 'size-3.5',
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  theme,
  providerFilter,
}) => {
  const allModels = useModelCatalog()

  const filteredModels = providerFilter
    ? allModels.filter((model) => model.provider === providerFilter)
    : allModels

  const groupedOptions: GroupBase<ModelOption>[] = Array.from(
    filteredModels.reduce((groups, model) => {
      const options = groups.get(model.developer) ?? []
      options.push({
        value: model.id,
        label: model.name,
        provider: model.provider,
      })
      groups.set(model.developer, options)
      return groups
    }, new Map<string, ModelOption[]>()),
    ([developer, options]) => ({
      label: developer.toUpperCase(),
      options,
    }),
  )

  // Calcular ancho basado en la opción más larga + 20% (10% cada lado)
  const selectorWidth = useMemo(() => {
    const longestLabel = filteredModels.reduce(
      (max, m) => (m.name.length > max.length ? m.name : max),
      '',
    )
    // ~7.5px por carácter a 0.85rem + padding para indicador
    const baseWidth = longestLabel.length * 7.5 + 52 + 36 // +36: íconos de visión y búsqueda
    const withPadding = Math.round(baseWidth * 1.2)
    return `${Math.max(withPadding, 180)}px`
  }, [filteredModels])

  useEffect(() => {
    console.log('ModelSelector - Current selected model:', selectedModel)
  }, [selectedModel])

  const customStyles: StylesConfig<
    ModelOption,
    false,
    GroupBase<ModelOption>
  > = {
    control: (provided, state) => ({
      ...provided,
      border: 'none',
      borderRadius: '12px',
      padding: '4px 8px',
      backgroundColor: theme.background,
      boxShadow: state.menuIsOpen ? theme.shadow.inset : theme.shadow.sm,
      width: selectorWidth,
      maxWidth: '100%',
      transition: 'box-shadow 0.25s ease',
      '&:hover': {
        boxShadow: theme.shadow.outer,
        cursor: 'pointer',
      },
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: theme.background,
      color: state.isSelected ? theme.accent : theme.text,
      cursor: 'pointer',
      borderRadius: '10px',
      margin: '4px auto',
      width: 'calc(100% - 4px)',
      padding: '8px 12px',
      fontWeight: state.isSelected ? 600 : 400,
      boxShadow: state.isSelected ? theme.shadow.inset : 'none',
      whiteSpace: 'nowrap' as const,
      transition: 'box-shadow 0.2s ease, color 0.2s ease',
      '&:hover': {
        boxShadow: theme.shadow.sm,
        color: theme.accent,
      },
    }),
    singleValue: (provided) => ({
      ...provided,
      color: theme.text,
      fontWeight: 500,
      fontSize: '0.85rem',
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: theme.background,
      borderRadius: '14px',
      boxShadow: theme.shadow.outer,
      border: 'none',
      overflow: 'hidden',
      padding: '6px 0',
      width: selectorWidth,
      zIndex: 9999,
    }),
    menuList: (provided) => ({
      ...provided,
      padding: '8px 15px 8px 14px',
      maxHeight: '320px',
      overflowX: 'hidden' as const,
    }),
    group: (provided) => ({
      ...provided,
      paddingTop: '6px',
      paddingBottom: '6px',
    }),
    groupHeading: (provided) => ({
      ...provided,
      color: theme.accent,
      fontWeight: 700,
      fontSize: '0.7rem',
      letterSpacing: '0.08em',
      textTransform: 'uppercase' as const,
      marginBottom: '6px',
      paddingLeft: '14px',
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
    dropdownIndicator: (provided, state) => ({
      ...provided,
      color: theme.textMuted,
      transition: 'transform 0.25s ease, color 0.25s ease',
      transform: state.selectProps.menuIsOpen
        ? 'rotate(180deg)'
        : 'rotate(0deg)',
      '&:hover': {
        color: theme.accent,
      },
    }),
    placeholder: (provided) => ({
      ...provided,
      color: theme.textMuted,
      fontSize: '0.85rem',
    }),
  }

  return (
    <Select<ModelOption, false, GroupBase<ModelOption>>
      instanceId="model-selector"
      inputId="model-selector-input"
      name="selectedModel"
      value={groupedOptions
        .flatMap((group) => group.options)
        .find((option) => option.value === selectedModel)}
      onChange={(option: SingleValue<ModelOption>) => {
        if (option) {
          console.log('Model changed to:', option.value)
          onModelChange(option.value)
        }
      }}
      options={groupedOptions}
      styles={customStyles}
      isSearchable={false}
      placeholder="Seleccionar modelo"
      aria-label="Seleccionar modelo de IA"
      className="react-select-container"
      classNamePrefix="react-select"
      components={{
        Option: (
          props: OptionProps<ModelOption, false, GroupBase<ModelOption>>,
        ) => {
          const hasSearch = supportsWebSearch(
            props.data.value,
            props.data.provider,
          )
          const hasVision = supportsVision(
            props.data.value,
            props.data.provider,
          )
          return (
            <components.Option {...props}>
              <div className="flex items-center justify-between w-full">
                <span>{props.data.label}</span>
                <span className="ml-2 flex items-center gap-1 shrink-0">
                  {hasVision && (
                    <span
                      className="flex items-center"
                      style={{ color: theme.accentAlt }}
                      title="Acepta imágenes"
                    >
                      <EyeIcon />
                    </span>
                  )}
                  {hasSearch && (
                    <span
                      className="flex items-center"
                      style={{ color: theme.accent }}
                      title="Búsqueda web nativa disponible"
                    >
                      <GlobeIcon />
                    </span>
                  )}
                </span>
              </div>
            </components.Option>
          )
        },
        SingleValue: (
          props: SingleValueProps<ModelOption, false, GroupBase<ModelOption>>,
        ) => {
          const hasSearch = supportsWebSearch(
            props.data.value,
            props.data.provider,
          )
          const hasVision = supportsVision(
            props.data.value,
            props.data.provider,
          )
          return (
            <components.SingleValue {...props}>
              <div className="flex items-center gap-1.5">
                <span>{props.data.label}</span>
                {hasVision && (
                  <span
                    className="flex items-center shrink-0"
                    style={{ color: theme.accentAlt }}
                    title="Acepta imágenes"
                  >
                    <EyeIcon className="size-3" />
                  </span>
                )}
                {hasSearch && (
                  <span
                    className="flex items-center shrink-0"
                    style={{ color: theme.accent }}
                    title="Búsqueda web nativa disponible"
                  >
                    <GlobeIcon className="size-3" />
                  </span>
                )}
              </div>
            </components.SingleValue>
          )
        },
      }}
    />
  )
}

export default ModelSelector
