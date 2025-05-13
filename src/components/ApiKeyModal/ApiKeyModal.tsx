import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { ColorPalette } from "../../interfaces/temas/temas";
import { APP_VERSION } from "../../App";

interface ApiKeyModalProps {
    theme: ColorPalette;
    isDarkTheme: boolean;
    onApiKeyProvided?: () => void;
}

const ApiKeyModal = ({
    theme,
    isDarkTheme,
    onApiKeyProvided,
}: ApiKeyModalProps) => {
    const [isModalLogicActive, setIsModalLogicActive] = useState(true);

    useEffect(() => {
        const manageApiKeyModal = async () => {
            if (!isModalLogicActive) return;

            const savedApiKey = localStorage.getItem("groqApiKey");
            if (!savedApiKey) {
                if (Swal.isVisible()) return;
                const TITULO = `PROMPTING  <span style="font-size: 12px">${APP_VERSION}</span>`;

                const result = await Swal.fire({
                    title: TITULO,
                    html: `
                      <div style="display: grid; grid-template-columns: minmax(0, 1fr); width: 100%; max-width: 350px; margin: 0 auto; padding: 0; overflow: hidden;">
                        <div style="width: 100%; text-align: center; display: grid; place-items: center;">
                          <p style="margin-bottom: 1.5rem; font-size: 1rem; line-height: 1.6; font-weight: 500; letter-spacing: 0.01em; text-align: center; width: 100%;">
                            Para utilizar la aplicación, es necesario obtener previamente una clave de API key proporcionada por Groq.
                          </p>
                          
                        </div>
                        <div style="width: 100%; position: relative; margin-bottom: 1.2rem; display: grid; place-items: center;">
                          <input
                            type="password"
                            id="swal-input-apikey-ue"
                            class="swal2-input"
                            placeholder="Ingresa tu API Key de Groq"
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
                                    ? "rgba(255,255,255,0.08)"
                                    : "rgba(0,0,0,0.03)"
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
                            isDarkTheme ? "#b0b8c9" : "#444"
                        }; text-align: center; width: 100%;">
                            Puedes obtenerla en
                            <a
                              href="https://console.groq.com/keys"
                              target="_blank"
                              rel="noopener noreferrer"
                              style="color: ${
                                  isDarkTheme ? "#8AB4F8" : "#0066CC"
                              }; font-weight: 600; border-bottom: 2px solid ${
                        isDarkTheme ? "#8AB4F8" : "#0066CC"
                    }; padding-bottom: 1px; transition: border 0.2s;"
                            >
                              console.groq.com/keys
                            </a>
                          </p>
                          <span style="font-size: 0.85rem; color: ${
                              isDarkTheme ? "#8AB4F8" : theme.accent
                          }; font-weight: 400; letter-spacing: 0.01em; text-align: center; width: 100%;">Tu clave nunca se envía a ningún servidor, solo se almacena localmente.</span>
                        </div>
                      </div>
                    `,
                    width: "auto",
                    focusConfirm: false,
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    showCancelButton: false,
                    confirmButtonText: "Guardar API Key",
                    confirmButtonColor: theme.button.background,
                    background: theme.background,
                    color: theme.text,
                    scrollbarPadding: false,
                    grow: false,
                    customClass: {
                        popup: "swal-custom-popup api-key-modal-popup",
                        title: "swal-custom-title api-key-modal-title",
                        htmlContainer: "swal-custom-html api-key-modal-html",
                        confirmButton:
                            "swal-custom-confirm-button api-key-modal-confirm",
                        input: "swal-custom-input api-key-modal-input",
                        container: "swal-container-no-scrollbar",
                    },
                    didOpen: () => {
                        // Aplicar estilos directamente con CSS para ocultar scrollbars
                        const styleEl = document.createElement("style");
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
                            width: auto !important;
                            max-width: 90% !important;
                            min-width: 300px !important;
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
                        `;
                        document.head.appendChild(styleEl);

                        const input = document.getElementById(
                            "swal-input-apikey-ue"
                        ) as HTMLInputElement | null;
                        const toggleButton = document.getElementById(
                            "toggle-apikey-visibility-ue"
                        );
                        if (input && toggleButton) {
                            // Posicionar el cursor al inicio del campo y asegurar alineación izquierda
                            setTimeout(() => {
                                input.focus();
                                // No es necesario setSelectionRange aquí ya que el campo está vacío
                                // y el cursor aparecerá naturalmente al inicio con text-align: left
                            }, 100);

                            toggleButton.addEventListener("click", () => {
                                const type =
                                    input.getAttribute("type") === "password"
                                        ? "text"
                                        : "password";
                                input.setAttribute("type", type);

                                // Actualizar el icono SVG según el estado
                                if (type === "password") {
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
                            toggleButton.addEventListener("mouseenter", () => {
                                toggleButton.style.background = isDarkTheme
                                    ? "rgba(255,255,255,0.15)"
                                    : "rgba(0,0,0,0.08)";
                            });
                            toggleButton.addEventListener("mouseleave", () => {
                                toggleButton.style.background = isDarkTheme
                                    ? "rgba(255,255,255,0.08)"
                                    : "rgba(0,0,0,0.03)";
                            });
                        }
                    },
                    preConfirm: () => {
                        const apiKeyInput = document.getElementById(
                            "swal-input-apikey-ue"
                        ) as HTMLInputElement | null;
                        const apiKey = apiKeyInput?.value;
                        if (!apiKey || apiKey.trim() === "") {
                            Swal.showValidationMessage(
                              `Por favor, ingresa una API Key válida`
                            );
                            // Apply styles to the validation message
                            const validationMessage = document.querySelector('.swal2-validation-message');
                            if (validationMessage) {
                              validationMessage.setAttribute('style', `
                                background: ${isDarkTheme ? 'rgba(255, 60, 60, 0.1)' : 'rgba(255, 0, 0, 0.05)'};
                                color: ${isDarkTheme ? '#ff9999' : '#d32f2f'};
                                border-color: ${isDarkTheme ? 'rgba(255, 60, 60, 0.3)' : 'rgba(255, 0, 0, 0.2)'};
                                padding: 0.75em;
                                margin-top: 0.75em;
                                border-radius: 6px;
                                font-weight: 500;
                                letter-spacing: 0.01em;
                                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
                              `);
                            }
                            apiKeyInput?.focus();
                            return false;
                        }

                        // Validación adicional: verifica que la clave tenga al menos 20 caracteres (típico para API keys)
                        if (apiKey.trim().length < 20) {
                            Swal.showValidationMessage(
                                `La API Key parece demasiado corta. Verifica que sea correcta`
                            );
                            apiKeyInput?.focus();
                            return false;
                        }

                        return apiKey.trim();
                    },
                });

                if (result.isConfirmed && result.value) {
                    const apiKey = result.value;
                    localStorage.setItem("groqApiKey", apiKey);
                    setIsModalLogicActive(false);
                    Swal.fire({
                        title: "¡Guardada!",
                        text: "Tu API Key de Groq ha sido guardada.",
                        icon: "success",
                        background: theme.background,
                        color: theme.text,
                        confirmButtonColor: theme.button.background,
                        timer: 1500,
                        timerProgressBar: true,
                    });
                    if (onApiKeyProvided) {
                        onApiKeyProvided();
                    }
                }
            } else {
                setIsModalLogicActive(false);
                if (onApiKeyProvided) {
                    onApiKeyProvided();
                }
            }
        };

        manageApiKeyModal();
    }, [isModalLogicActive, onApiKeyProvided, theme, isDarkTheme]);

    return null;
};

export default ApiKeyModal;
