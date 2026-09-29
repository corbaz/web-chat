import type React from 'react'
import { useState } from 'react'
import type { ColorPalette } from '../../interfaces/temas/temas'
import { ClaudeCodeStatus } from './ClaudeCodeStatus'
import { CodexSubStatus } from './CodexSubStatus'
import EffortSelector from './EffortSelector'
import ModelSelector from './ModelSelector'
import MenuButton from './menu/MenuButton'
import Title from './menu/Title'
import { OpenCodeFreeStatus } from './OpenCodeFreeStatus'
import ProviderSelector from './ProviderSelector'
import YoloToggle from './YoloToggle'

interface HeaderProps {
  title: string
  version: string
  selectedModel: string
  onModelChange: (modelId: string) => void
  theme: ColorPalette
  isDarkTheme: boolean
  onToggleLeftMenu: () => void
  onToggleRightMenu: () => void
  chatId?: string
  onUpdateChatTitle?: (chatId: string, newTitle: string) => void
  editable?: boolean
  selectedProvider?: string
  onProviderChange?: (providerId: string) => void
  yoloEnabled?: boolean
  onYoloChange?: (next: boolean) => void
  // T4 (ver odd/tasks/chat-rooms.md): las 10 cajitas de salas, ya armadas
  // por App (necesitan el estado de todas las salas, no solo el de esta).
  roomTabs?: React.ReactNode
}

const Header: React.FC<HeaderProps> = ({
  title,
  version,
  selectedModel,
  onModelChange,
  theme,
  isDarkTheme,
  onToggleLeftMenu,
  onToggleRightMenu,
  chatId,
  onUpdateChatTitle,
  editable = false,
  selectedProvider: externalProvider,
  onProviderChange: externalOnProviderChange,
  yoloEnabled = false,
  onYoloChange,
  roomTabs,
}) => {
  const [internalProvider, setInternalProvider] = useState<string>(() => {
    if (!externalProvider) {
      const providers = [
        'groq',
        'routellm',
        'openai',
        'anthropic',
        'claudecode',
        'codexsub',
        'opengo',
        'opencodezen',
        'opencodefree',
        'gemini',
      ]
      for (const provider of providers) {
        const apiKey = localStorage.getItem(`${provider}ApiKey`)
        if (apiKey && apiKey.trim() !== '') return provider
      }
    }
    return 'groq'
  })

  const selectedProvider = externalProvider || internalProvider

  const handleProviderChange = (providerId: string) => {
    setInternalProvider(providerId)
    if (externalOnProviderChange) externalOnProviderChange(providerId)
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-65 w-full px-4 py-3"
      style={{
        backgroundColor: theme.background,
        boxShadow: `0 4px 16px ${
          theme.background === '#1e2235'
            ? 'rgba(0,0,0,0.45)'
            : 'rgba(0,0,0,0.12)'
        }, ${theme.shadow.sm}`,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Menú hamburguesa — historial */}
        <MenuButton
          onClick={onToggleLeftMenu}
          ariaLabel="Abrir menú de historial"
          theme={theme}
        />

        {/* Título + selectores */}
        <div className="flex flex-col items-center flex-1 min-w-0 gap-1.5">
          <Title
            title={title}
            version={version}
            theme={theme}
            chatId={chatId}
            onUpdateChatTitle={onUpdateChatTitle}
            editable={editable}
          />

          <div className="flex gap-4 w-full flex-col items-center sm:flex-row sm:justify-center">
            {/* Orden: Proveedor | Effort slider | Modelo */}
            <div className="w-auto flex items-center gap-1.5">
              <ProviderSelector
                selectedProvider={selectedProvider}
                onProviderChange={handleProviderChange}
                theme={theme}
              />
              <OpenCodeFreeStatus
                active={selectedProvider === 'opencodefree'}
                theme={theme}
              />
              <ClaudeCodeStatus
                active={selectedProvider === 'claudecode'}
                theme={theme}
              />
              <CodexSubStatus
                active={selectedProvider === 'codexsub'}
                theme={theme}
              />
            </div>
            <div className="w-auto flex items-center gap-1.5">
              <EffortSelector
                selectedProvider={selectedProvider}
                selectedModel={selectedModel}
                theme={theme}
              />
              <YoloToggle
                selectedProvider={selectedProvider}
                enabled={yoloEnabled}
                onChange={(next) => onYoloChange?.(next)}
                theme={theme}
                isDarkTheme={isDarkTheme}
              />
            </div>
            {/* Modelo y cajitas de salas en la misma fila: en el celular los
                selectores se apilan y el alto del header es fijo
                (layoutConstants), así que las salas no suman otra fila. */}
            <div className="w-auto max-w-full flex items-center gap-1.5">
              <ModelSelector
                selectedModel={selectedModel}
                onModelChange={onModelChange}
                theme={theme}
                providerFilter={selectedProvider}
              />
              {roomTabs}
            </div>
          </div>
        </div>

        {/* Menú hamburguesa — configuración */}
        <MenuButton
          onClick={onToggleRightMenu}
          ariaLabel="Abrir menú de configuración"
          theme={theme}
        />
      </div>
    </header>
  )
}

export default Header
