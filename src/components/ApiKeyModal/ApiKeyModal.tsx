import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { ColorPalette } from '../../interfaces/temas/temas';
import { APP_VERSION } from '../../App';

interface ApiKeyModalProps {
    theme: ColorPalette;
    isDarkTheme: boolean;
    onApiKeyProvided?: () => void;
}

// Proveedores disponibles
const PROVIDERS = [
    { id: 'groq', name: 'Groq', link: 'https://console.groq.com/keys' },
    {
        id: 'routellm',
        name: 'RouteLLM (Abacus.AI)',
        link: 'https://routellm.abacus.ai/',
    },
    {
        id: 'openai',
        name: 'OpenAI',
        link: 'https://platform.openai.com/api-keys',
    },
    {
        id: 'anthropic',
        name: 'Anthropic',
        link: 'https://console.anthropic.com/settings/keys',
    },
] as const;

// Función para validar la API key con el proveedor
const validateApiKey = async (
    apiKey: string,
    provider: string
): Promise<boolean> => {
    const timeout = 8000; // 8 segundos máximo

    try {
        if (provider === 'groq') {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            try {
                const res = await fetch(
                    'https://api.groq.com/openai/v1/models',
                    {
                        headers: { Authorization: `Bearer ${apiKey}` },
                        signal: controller.signal,
                    }
                );
                clearTimeout(timeoutId);
                return res.ok;
            } catch {
                clearTimeout(timeoutId);
                return false;
            }
        } else if (provider === 'openai') {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            try {
                const res = await fetch('https://api.openai.com/v1/models', {
                    headers: { Authorization: `Bearer ${apiKey}` },
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                return res.ok;
            } catch {
                clearTimeout(timeoutId);
                return false;
            }
        } else if (provider === 'anthropic') {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            try {
                const res = await fetch('https://api.anthropic.com/v1/models', {
                    headers: {
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                    },
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                return res.ok;
            } catch {
                clearTimeout(timeoutId);
                return false;
            }
        } else if (provider === 'routellm') {
            // RouteLLM/Abacus.AI: Enviar un prompt de prueba sin especificar modelo
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            try {
                console.log('RouteLLM: Enviando prompt de validación');
                console.log(
                    'Endpoint:',
                    'https://routellm.abacus.ai/v1/chat/completions'
                );
                console.log('API Key:', apiKey.substring(0, 10) + '...');

                const payload = {
                    messages: [
                        {
                            role: 'user',
                            content: 'test',
                        },
                    ],
                    max_tokens: 10,
                    stream: false,
                };

                console.log('Payload:', JSON.stringify(payload, null, 2));

                const res = await fetch(
                    'https://routellm.abacus.ai/v1/chat/completions',
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${apiKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(payload),
                        signal: controller.signal,
                    }
                );

                clearTimeout(timeoutId);
                console.log('RouteLLM Response Status:', res.status);
                console.log('RouteLLM Response OK:', res.ok);

                const responseText = await res.text();
                console.log('RouteLLM Response Body:', responseText);

                // Solo acepta 200 (éxito) o 400 (modelo inválido pero autenticado)
                // Rechaza 401 (credenciales inválidas), 403 (no autorizado)
                const isValid = res.status === 200 || res.status === 400;
                console.log(
                    'RouteLLM Validation Result:',
                    isValid,
                    '(Status:',
                    res.status,
                    ')'
                );
                return isValid;
            } catch (error) {
                clearTimeout(timeoutId);
                console.log(
                    'RouteLLM Error:',
                    error instanceof Error ? error.message : error
                );
                return false;
            }
        }
        return false;
    } catch {
        return false;
    }
};

const ApiKeyModal = ({
    theme,
    isDarkTheme,
    onApiKeyProvided,
}: ApiKeyModalProps) => {
    const [isModalLogicActive, setIsModalLogicActive] = useState(true);
    const [forceShow, setForceShow] = useState(false);
    const [forcedProvider, setForcedProvider] = useState<string | null>(null);

    useEffect(() => {
        const handleRequestModal = (event: Event) => {
            const detail = (event as CustomEvent<{ provider?: string }>).detail;
            if (detail?.provider) {
                setForcedProvider(detail.provider);
            }
            setForceShow(true);
            setIsModalLogicActive(true);
        };

        window.addEventListener('request-apikey-modal', handleRequestModal);
        return () => {
            window.removeEventListener(
                'request-apikey-modal',
                handleRequestModal
            );
        };
    }, []);

    useEffect(() => {
        const manageApiKeyModal = async () => {
            if (!isModalLogicActive) return;

            const hasAnyKey = PROVIDERS.some((p) =>
                localStorage.getItem(`${p.id}ApiKey`)
            );
            if (!hasAnyKey || forceShow) {
                if (Swal.isVisible()) return;
                const storedProvider = localStorage.getItem('selectedProvider');
                const defaultProvider =
                    forcedProvider || storedProvider || PROVIDERS[0].id;
                const defaultProviderLink =
                    PROVIDERS.find((p) => p.id === defaultProvider)?.link ||
                    PROVIDERS[0].link;
                const defaultProviderName =
                    PROVIDERS.find((p) => p.id === defaultProvider)?.name ||
                    PROVIDERS[0].name;
                const optionsHtml = PROVIDERS.map(
                    (p) =>
                        `<option value="${p.id}" ${
                            p.id === defaultProvider ? 'selected' : ''
                        }>${p.name}</option>`
                ).join('');
                const TITULO = `PROMPTING  <span style="font-size: 12px">${APP_VERSION}</span>`;

                const result = await Swal.fire({
                    title: TITULO,
                    html: `
                      <div style="display: grid; grid-template-columns: minmax(0, 1fr); width: 100%; max-width: 420px; margin: 0 auto; padding: 0; overflow: hidden;">
                        <div style="width: 100%; text-align: center; display: grid; place-items: center;">
                          <p style="margin-bottom: 1.5rem; font-size: 1rem; line-height: 1.6; font-weight: 500; letter-spacing: 0.01em; text-align: center; width: 100%;">
                            Selecciona un proveedor de IA e ingresa tu API Key
                          </p>

                        </div>
                        <div style="width: 100%; position: relative; margin-bottom: 1.2rem; display: grid; place-items: center;">
                          <label style="display:block; margin-bottom: 0.4rem; font-size: 1.9rem; font-weight:600; color:${
                              theme.text
                          }; width: 100%; text-align: center;">Proveedor</label>
                          <div style="position: relative; width: 100%;">
                            <select id="swal-select-provider" class="swal2-select" style="width: 100%; padding: 0.8em 3.8em 0.8em 1.2em; background: ${
                                theme.input.background
                            }; color: ${theme.input.text}; border: 2px solid ${
                        theme.accent
                    }; border-radius: 8px; box-sizing: border-box; height: 3.1em; font-size: 1rem; font-family: 'Inter', 'Segoe UI', Arial, sans-serif; font-weight: 500; letter-spacing: 0.01em; transition: all 0.2s ease; outline: none; appearance: none; box-shadow: 0 2px 5px rgba(0,0,0,0.08); text-align: left;">
                              ${optionsHtml}
                            </select>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute; right:12px; top:50%; transform: translateY(-50%); color:${
                                theme.input.text
                            }; pointer-events: none; opacity:0.7;">
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </div>
                        </div>
                        <div style="width: 100%; position: relative; margin-bottom: 1.2rem; display: grid; place-items: center;">
                          <input
                            type="password"
                            id="swal-input-apikey-ue"
                            class="swal2-input"
                            placeholder="Ingresa tu API Key"
                            style="width: 100%; padding: 0.8em 3.8em 0.8em 1.2em; background: ${
                                theme.input.background
                            }; color: ${theme.input.text}; border: 2px solid ${
                        theme.accent
                    }; border-radius: 8px; box-sizing: border-box; height: 3.1em; font-size: 1rem; font-family: 'Inter', 'Segoe UI', Arial, sans-serif; font-weight: 500; letter-spacing: 0.01em; transition: all 0.2s ease; outline: none; text-align: left; box-shadow: 0 2px 5px rgba(0,0,0,0.08);"
                            autocomplete="off"
                            spellcheck="false"
                            required
                          />
                          <div
                            id="toggle-apikey-visibility-ue"
                            style="position: absolute; right: 10px; top: 0; bottom: 0; margin: auto 0; height: 32px; background: ${
                                isDarkTheme
                                    ? 'rgba(255,255,255,0.08)'
                                    : 'rgba(0,0,0,0.03)'
                            }; border: none; cursor: pointer; color: ${
                        theme.text
                    }; width: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s ease;"
                            aria-label="Mostrar/Ocultar API Key"
                            tabindex="-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                              <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
                            </svg>
                          </div>
                        </div>
                        <div style="width: 100%; text-align: center; margin-bottom: 0.2rem; display: grid; place-items: center;">
                        <p style="margin-bottom: 1.5rem; font-size: 0.92rem; line-height: 1.6; color: ${
                            isDarkTheme ? '#b0b8c9' : '#444'
                        }; text-align: center; width: 100%;">
                            Puedes obtenerla en
                            <a id="provider-link" href="${defaultProviderLink}" target="_blank" rel="noopener noreferrer" style="color: ${
                        isDarkTheme ? '#8AB4F8' : '#0066CC'
                    }; font-weight: 600; border-bottom: 2px solid ${
                        isDarkTheme ? '#8AB4F8' : '#0066CC'
                    }; padding-bottom: 1px; transition: border 0.2s;">${defaultProviderName}</a>
                          </p>
                          <span style="font-size: 0.85rem; color: ${
                              isDarkTheme ? '#8AB4F8' : theme.accent
                          }; font-weight: 400; letter-spacing: 0.01em; text-align: center; width: 100%;">Tu clave nunca se envía a ningún servidor, solo se almacena localmente.</span>
                        </div>
                      </div>
                    `,
                    width: 'auto',
                    focusConfirm: false,
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    showCloseButton: hasAnyKey,
                    showCancelButton: false,
                    confirmButtonText: 'Guardar API Key',
                    confirmButtonColor: theme.button.background,
                    background: theme.background,
                    color: theme.text,
                    scrollbarPadding: false,
                    grow: false,
                    customClass: {
                        popup: 'swal-custom-popup api-key-modal-popup',
                        title: 'swal-custom-title api-key-modal-title',
                        htmlContainer: 'swal-custom-html api-key-modal-html',
                        confirmButton:
                            'swal-custom-confirm-button api-key-modal-confirm',
                        input: 'swal-custom-input api-key-modal-input',
                        container: 'swal-container-no-scrollbar',
                    },
                    didOpen: () => {
                        // Fijar ancho y altura del modal para evitar que se expanda con mensajes
                        const modal = document.querySelector(
                            '.swal2-modal'
                        ) as HTMLElement;
                        if (modal) {
                            modal.style.maxWidth = '520px';
                            modal.style.width = '520px';
                        }

                        // Aplicar estilos directamente con CSS para ocultar scrollbars
                        const styleEl = document.createElement('style');
                        styleEl.innerHTML = `
                          .swal2-container, .swal2-html-container, .swal2-popup {
                            overflow: hidden !important;
                            max-width: 100% !important;
                          }
                          .swal2-container::-webkit-scrollbar {
                            display: none !important;
                          }
                          .swal2-html-container::-webkit-scrollbar {
                            display: none !important;
                          }
                          .swal2-popup {
                            width: 520px !important;
                            max-width: 520px !important;
                            min-width: 520px !important;
                            padding: 0.5em 1em !important;
                          }
                          .swal2-html-container {
                            padding: 0.5em 0.2em !important;
                            margin: 0 !important;
                            font-size: 1em !important;
                            display: grid !important;
                            place-items: center !important;
                          }
                          .swal2-title {
                            padding: 0.8em 0 0 !important;
                            margin-bottom: 0.3em !important;
                            text-align: center !important;
                          }
                          .swal2-actions {
                            margin: 1em auto 0.5em !important;
                          }
                          .swal2-input {
                            margin: 0 auto !important;
                          }
                          .swal2-validation-message {
                            word-wrap: break-word !important;
                            white-space: normal !important;
                          }
                        `;
                        document.head.appendChild(styleEl);

                        const input = document.getElementById(
                            'swal-input-apikey-ue'
                        ) as HTMLInputElement | null;
                        const select = document.getElementById(
                            'swal-select-provider'
                        ) as HTMLSelectElement | null;
                        const link = document.getElementById(
                            'provider-link'
                        ) as HTMLAnchorElement | null;
                        const toggleButton = document.getElementById(
                            'toggle-apikey-visibility-ue'
                        );
                        if (select && link && input) {
                            // Preseleccionar proveedor requerido o guardado y precargar API key si existe
                            const persistedProvider =
                                localStorage.getItem('selectedProvider');
                            const initialProvider =
                                forcedProvider ||
                                persistedProvider ||
                                PROVIDERS[0].id;
                            select.value = initialProvider;
                            const providerMeta =
                                PROVIDERS.find(
                                    (pr) => pr.id === initialProvider
                                ) || PROVIDERS[0];
                            link.href = providerMeta.link;
                            link.textContent = providerMeta.name;
                            input.placeholder = `Ingresa tu API Key de ${providerMeta.name}`;
                            const savedKey = localStorage.getItem(
                                `${initialProvider}ApiKey`
                            );
                            if (savedKey) {
                                input.value = savedKey;
                            }
                            select.addEventListener('change', () => {
                                const p =
                                    PROVIDERS.find(
                                        (pr) => pr.id === select.value
                                    ) || PROVIDERS[0];
                                link.href = p.link;
                                link.textContent = p.name;
                                input.placeholder = `Ingresa tu API Key de ${p.name}`;
                                const existing = localStorage.getItem(
                                    `${p.id}ApiKey`
                                );
                                input.value = existing || '';
                            });
                        }
                        if (input && toggleButton) {
                            // Posicionar el cursor al inicio del campo y asegurar alineación izquierda
                            setTimeout(() => {
                                input.focus();
                                // No es necesario setSelectionRange aquí ya que el campo está vacío
                                // y el cursor aparecerá naturalmente al inicio con text-align: left
                            }, 100);

                            toggleButton.addEventListener('click', () => {
                                const type =
                                    input.getAttribute('type') === 'password'
                                        ? 'text'
                                        : 'password';
                                input.setAttribute('type', type);

                                // Actualizar el icono SVG según el estado
                                if (type === 'password') {
                                    toggleButton.innerHTML = `
                                        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="currentColor" viewBox="0 0 16 16">
                                          <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                                          <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
                                        </svg>
                                    `;
                                } else {
                                    toggleButton.innerHTML = `
                                        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="currentColor" viewBox="0 0 16 16">
                                          <path d="m10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7.029 7.029 0 0 0 2.79-.588zM5.21 3.088A7.028 7.028 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474L5.21 3.089z"/>
                                          <path d="M5.525 7.646a2.5 2.5 0 0 0 2.829 2.829l-2.83-2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6-12-12 .708-.708 12 12-.708.708z"/>
                                        </svg>
                                    `;
                                }
                            });

                            // Efecto hover para el botón
                            toggleButton.addEventListener('mouseenter', () => {
                                toggleButton.style.background = isDarkTheme
                                    ? 'rgba(255,255,255,0.15)'
                                    : 'rgba(0,0,0,0.08)';
                            });
                            toggleButton.addEventListener('mouseleave', () => {
                                toggleButton.style.background = isDarkTheme
                                    ? 'rgba(255,255,255,0.08)'
                                    : 'rgba(0,0,0,0.03)';
                            });
                        }
                    },
                    preConfirm: async () => {
                        // Función auxiliar para aplicar estilos al mensaje de error
                        const applyErrorStyles = () => {
                            setTimeout(() => {
                                const validationMessage =
                                    document.querySelector(
                                        '.swal2-validation-message'
                                    );
                                if (validationMessage) {
                                    validationMessage.setAttribute(
                                        'style',
                                        `
                      background: ${
                          isDarkTheme
                              ? 'rgba(255, 60, 60, 0.1)'
                              : 'rgba(255, 0, 0, 0.05)'
                      };
                      color: ${isDarkTheme ? '#ff9999' : '#d32f2f'};
                      border-color: ${
                          isDarkTheme
                              ? 'rgba(255, 60, 60, 0.3)'
                              : 'rgba(255, 0, 0, 0.2)'
                      };
                      padding: 0.75em;
                      margin-top: 0.75em;
                      border-radius: 6px;
                      font-weight: 500;
                      letter-spacing: 0.01em;
                      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
                      font-size: 0.95rem;
                      line-height: 1.4;
                      text-align: center;
                    `
                                    );
                                }
                            }, 0);
                        };

                        const apiKeyInput = document.getElementById(
                            'swal-input-apikey-ue'
                        ) as HTMLInputElement | null;
                        const select = document.getElementById(
                            'swal-select-provider'
                        ) as HTMLSelectElement | null;
                        const apiKey = apiKeyInput?.value;
                        const provider = select?.value || PROVIDERS[0].id;

                        // Validar que no esté vacío
                        if (!apiKey || apiKey.trim() === '') {
                            Swal.showValidationMessage(
                                `Por favor, ingresa una API Key válida`
                            );
                            applyErrorStyles();
                            apiKeyInput?.focus();
                            return false;
                        }

                        // Validar longitud mínima
                        if (apiKey.trim().length < 20) {
                            Swal.showValidationMessage(
                                `La API Key parece demasiado corta. Verifica que sea correcta`
                            );
                            applyErrorStyles();
                            apiKeyInput?.focus();
                            return false;
                        }

                        // Mostrar loading mientras valida con el proveedor
                        Swal.showLoading();

                        // Validar con el proveedor
                        const isValid = await validateApiKey(
                            apiKey.trim(),
                            provider
                        );

                        if (!isValid) {
                            Swal.hideLoading();
                            Swal.showValidationMessage(
                                `API Key inválida. Por favor, verifica e intenta de nuevo.`
                            );
                            applyErrorStyles();
                            apiKeyInput!.value = '';
                            apiKeyInput?.focus();
                            return false;
                        }

                        // Si es válida, guardar
                        localStorage.setItem(
                            `${provider}ApiKey`,
                            apiKey.trim()
                        );
                        localStorage.setItem('selectedProvider', provider);
                        window.dispatchEvent(new Event('apikey-changed'));

                        return { apiKey: apiKey.trim(), provider };
                    },
                });

                if (result.isConfirmed && result.value) {
                    const { provider } = result.value as {
                        apiKey: string;
                        provider: string;
                    };

                    // Limpiar estado
                    setIsModalLogicActive(false);
                    setForceShow(false);
                    setForcedProvider(null);

                    // Mostrar confirmación de guardado
                    Swal.fire({
                        title: '¡Guardada!',
                        text: `Tu API Key de ${
                            PROVIDERS.find((p) => p.id === provider)?.name ||
                            provider
                        } ha sido guardada.`,
                        icon: 'success',
                        background: theme.background,
                        color: theme.text,
                        confirmButtonColor: theme.button.background,
                        timer: 1500,
                        timerProgressBar: true,
                    });

                    if (onApiKeyProvided) {
                        onApiKeyProvided();
                    }
                } else if (result.isDismissed) {
                    setIsModalLogicActive(false);
                    setForceShow(false);
                    setForcedProvider(null);
                }
            } else {
                setIsModalLogicActive(false);
                if (onApiKeyProvided) {
                    onApiKeyProvided();
                }
            }
        };

        manageApiKeyModal();
    }, [
        isModalLogicActive,
        onApiKeyProvided,
        theme,
        isDarkTheme,
        forceShow,
        forcedProvider,
    ]);

    return null;
};

export default ApiKeyModal;
