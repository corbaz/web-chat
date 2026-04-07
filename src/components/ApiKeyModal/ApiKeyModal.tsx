import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { ColorPalette } from "../../interfaces/temas/temas";
import { APP_VERSION } from "../../App";

interface ApiKeyModalProps {
  theme: ColorPalette;
  isDarkTheme: boolean;
  onApiKeyProvided?: () => void;
}

// Proveedores disponibles
const PROVIDERS = [
  { id: "groq", name: "Groq", link: "https://console.groq.com/keys" },
  {
    id: "routellm",
    name: "RouteLLM (Abacus.AI)",
    link: "https://routellm.abacus.ai/",
  },
  {
    id: "openai",
    name: "OpenAI",
    link: "https://platform.openai.com/api-keys",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    link: "https://console.anthropic.com/settings/keys",
  },
] as const;

// Función para validar la API key con el proveedor
const validateApiKey = async (
  apiKey: string,
  provider: string,
): Promise<boolean> => {
  const timeout = 8000; // 8 segundos máximo

  try {
    if (provider === "groq") {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      try {
        const res = await fetch("https://api.groq.com/openai/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return res.ok;
      } catch {
        clearTimeout(timeoutId);
        return false;
      }
    } else if (provider === "openai") {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      try {
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return res.ok;
      } catch {
        clearTimeout(timeoutId);
        return false;
      }
    } else if (provider === "anthropic") {
      // Anthropic bloquea peticiones CORS desde el navegador,
      // por lo que validamos solo el formato de la clave.
      // Las claves de Anthropic siempre comienzan con "sk-ant-"
      return apiKey.startsWith("sk-ant-") && apiKey.length >= 40;
    } else if (provider === "routellm") {
      // RouteLLM/Abacus.AI: Enviar un prompt de prueba sin especificar modelo
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      try {
        console.log("RouteLLM: Enviando prompt de validación");
        console.log(
          "Endpoint:",
          "https://routellm.abacus.ai/v1/chat/completions",
        );
        console.log("API Key:", apiKey.substring(0, 10) + "...");

        const payload = {
          messages: [
            {
              role: "user",
              content: "test",
            },
          ],
          max_tokens: 10,
          stream: false,
        };

        console.log("Payload:", JSON.stringify(payload, null, 2));

        const res = await fetch(
          "https://routellm.abacus.ai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
          },
        );

        clearTimeout(timeoutId);
        console.log("RouteLLM Response Status:", res.status);
        console.log("RouteLLM Response OK:", res.ok);

        const responseText = await res.text();
        console.log("RouteLLM Response Body:", responseText);

        // Solo acepta 200 (éxito) o 400 (modelo inválido pero autenticado)
        // Rechaza 401 (credenciales inválidas), 403 (no autorizado)
        const isValid = res.status === 200 || res.status === 400;
        console.log(
          "RouteLLM Validation Result:",
          isValid,
          "(Status:",
          res.status,
          ")",
        );
        return isValid;
      } catch (error) {
        clearTimeout(timeoutId);
        console.log(
          "RouteLLM Error:",
          error instanceof Error ? error.message : error,
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

    window.addEventListener("request-apikey-modal", handleRequestModal);
    return () => {
      window.removeEventListener("request-apikey-modal", handleRequestModal);
    };
  }, []);

  useEffect(() => {
    const manageApiKeyModal = async () => {
      if (!isModalLogicActive) return;

      const hasAnyKey = PROVIDERS.some((p) =>
        localStorage.getItem(`${p.id}ApiKey`),
      );
      if (!hasAnyKey || forceShow) {
        if (Swal.isVisible()) return;
        const storedProvider = localStorage.getItem("selectedProvider");
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
              p.id === defaultProvider ? "selected" : ""
            }>${p.name}</option>`,
        ).join("");
        const TITULO = `PROMPTING  <span style="font-size: 12px">${APP_VERSION}</span>`;

        const result = await Swal.fire({
          title: TITULO,
          html: `
                      <div style="display: grid; grid-template-columns: minmax(0, 1fr); width: 100%; max-width: 420px; margin: 0 auto; padding: 0; overflow: visible;">
                        <div style="width: 100%; text-align: center; display: grid; place-items: center;">
                          <p style="margin-bottom: 1.5rem; font-size: 0.85rem; line-height: 1.6; font-weight: 500; letter-spacing: 0.04em; color: ${theme.textMuted}; text-align: center; width: 100%;">
                            Selecciona un proveedor de IA e ingresa tu API Key
                          </p>
                        </div>
                        <div style="width: 100%; position: relative; margin-bottom: 3rem; display: grid; place-items: center;">
                          <label style="display:block; margin-bottom: 1.2rem; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${theme.accent}; width: 100%; text-align: left;">Proveedor</label>
                          <!-- Hidden native select for form value -->
                          <select id="swal-select-provider" style="display:none;">
                            ${optionsHtml}
                          </select>
                          <!-- Custom neumorphic dropdown (react-select style) -->
                          <div id="nm-provider-dropdown" style="position: relative; width: 100%;">
                            <div id="nm-provider-trigger" style="width: 100%; padding: 4px 8px; background: ${theme.background}; color: ${theme.text}; border: none; border-radius: 12px; box-sizing: border-box; font-size: 0.85rem; font-family: inherit; font-weight: 500; letter-spacing: 0.01em; transition: box-shadow 0.25s ease; outline: none; box-shadow: ${theme.shadow.sm}; text-align: left; cursor: pointer; display: flex; align-items: center; justify-content: space-between; user-select: none; min-height: 36px;">
                              <span id="nm-provider-label" style="flex: 1;">${defaultProviderName}</span>
                            </div>
                            <svg id="nm-provider-arrow" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute; right:12px; top:50%; transform: translateY(-50%); color:${theme.textMuted}; pointer-events: none; transition: transform 0.25s ease, color 0.25s ease;">
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                            <div id="nm-provider-menu" style="display: none; position: absolute; top: calc(100% + 8px); left: 0; right: 0; background: ${theme.background}; border-radius: 14px; border: 1px solid ${theme.accent}30; box-shadow: ${theme.shadow.outer}; padding: 10px 0; z-index: 999999; overflow: visible;">
                              <div style="padding: 10px 14px 10px 14px;">
                                ${PROVIDERS.map(
                                  (p) =>
                                    `<div class="nm-provider-option" data-value="${p.id}" style="padding: 8px 12px; margin: 6px auto; width: calc(100% - 4px); border-radius: 10px; cursor: pointer; font-size: 0.85rem; font-weight: 400; color: ${theme.text}; background: ${theme.background}; transition: box-shadow 0.2s ease, color 0.2s ease, font-weight 0.2s ease; box-shadow: none; white-space: nowrap;">${p.name}</div>`,
                                ).join("")}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div style="width: 100%; position: relative; margin-bottom: 2rem; display: grid; place-items: center;">
                          <input
                            type="password"
                            id="swal-input-apikey-ue"
                            class="swal2-input"
                            placeholder="Ingresa tu API Key"
                            style="width: 100%; padding: 0.75em 3em 0.75em 1.2em; background: ${theme.background}; color: ${theme.text}; border: none; border-radius: 12px; box-sizing: border-box; height: 3.1em; font-size: 0.9rem; font-family: inherit; font-weight: 500; letter-spacing: 0.01em; transition: box-shadow 0.25s ease; outline: none; text-align: left; box-shadow: ${theme.shadow.inset};"
                            autocomplete="off"
                            spellcheck="false"
                            required
                          />
                          <div
                            id="toggle-apikey-visibility-ue"
                            style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); height: 30px; width: 30px; background: ${theme.background}; border: none; cursor: pointer; color: ${theme.textMuted}; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: box-shadow 0.25s ease, color 0.25s ease; box-shadow: ${theme.shadow.sm};"
                            aria-label="Mostrar/Ocultar API Key"
                            tabindex="-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                              <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
                            </svg>
                          </div>
                        </div>
                        <div style="width: 100%; text-align: center; margin-bottom: 1rem; display: grid; place-items: center;">
                          <p style="margin-bottom: 1rem; font-size: 0.88rem; line-height: 1.6; color: ${theme.textMuted}; text-align: center; width: 100%;">
                            Puedes obtenerla en
                            <a id="provider-link" href="${defaultProviderLink}" target="_blank" rel="noopener noreferrer" style="color: ${theme.accent}; font-weight: 600; border-bottom: 1px solid ${theme.accent}; padding-bottom: 1px; transition: opacity 0.2s;">${defaultProviderName}</a>
                          </p>
                          <span style="font-size: 0.8rem; color: ${theme.accent}; font-weight: 400; letter-spacing: 0.01em; text-align: center; width: 100%; opacity: 0.7;">Tu clave nunca se envía a ningún servidor, solo se almacena localmente.</span>
                        </div>
                      </div>
                    `,
          width: "auto",
          focusConfirm: false,
          allowOutsideClick: false,
          allowEscapeKey: false,
          showCloseButton: hasAnyKey,
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
            confirmButton: "swal-custom-confirm-button api-key-modal-confirm",
            input: "swal-custom-input api-key-modal-input",
            container: "swal-container-no-scrollbar",
          },
          didOpen: () => {
            const modal = document.querySelector(".swal2-modal") as HTMLElement;
            if (modal) {
              modal.style.maxWidth = "520px";
              modal.style.width = "520px";
            }

            const styleEl = document.createElement("style");
            styleEl.innerHTML = `
                          .swal2-container {
                            overflow: hidden !important;
                            max-width: 100% !important;
                          }
                          .swal2-html-container, .swal2-popup {
                            overflow: visible !important;
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
                            padding: 1.5em 2em !important;
                            border-radius: 20px !important;
                            border: none !important;
                            box-shadow: ${theme.shadow.outer} !important;
                          }
                          .swal2-html-container {
                            padding: 0.5em 0.2em !important;
                            margin: 0 !important;
                            font-size: 1em !important;
                            display: grid !important;
                            place-items: center !important;
                          }
                          .swal2-title {
                            padding: 0.5em 0 0 !important;
                            margin-bottom: 0.2em !important;
                            text-align: center !important;
                            font-weight: 800 !important;
                            letter-spacing: 0.04em !important;
                            color: ${theme.title.color} !important;
                          }
                          .swal2-actions {
                            margin: 2em auto 0.8em !important;
                          }
                          .swal2-confirm {
                            background: ${theme.background} !important;
                            color: ${theme.text} !important;
                            border: none !important;
                            border-radius: 12px !important;
                            box-shadow: ${theme.shadow.outer} !important;
                            font-weight: 600 !important;
                            font-size: 0.9rem !important;
                            padding: 0.75em 2em !important;
                            transition: box-shadow 0.25s ease, transform 0.15s ease !important;
                            letter-spacing: 0.02em !important;
                          }
                          .swal2-confirm:hover {
                            box-shadow: ${theme.shadow.sm} !important;
                          }
                          .swal2-confirm:active {
                            box-shadow: ${theme.shadow.inset} !important;
                            transform: scale(0.97) !important;
                          }
                          .swal2-close {
                            color: ${theme.textMuted} !important;
                            background: ${theme.background} !important;
                            border-radius: 10px !important;
                            box-shadow: ${theme.shadow.sm} !important;
                            width: 32px !important;
                            height: 32px !important;
                            font-size: 1.2rem !important;
                            top: 12px !important;
                            right: 12px !important;
                            transition: box-shadow 0.25s ease !important;
                          }
                          .swal2-close:hover {
                            color: ${theme.accent} !important;
                            box-shadow: ${theme.shadow.inset} !important;
                          }
                          .swal2-input {
                            margin: 0 auto !important;
                          }
                          #swal-input-apikey-ue {
                            background: ${theme.background} !important;
                            color: ${theme.text} !important;
                            border: none !important;
                            outline: none !important;
                            box-shadow: ${theme.shadow.inset}, inset 0 1px 3px rgba(0,0,0,0.4), inset 0 -1px 3px rgba(255,255,255,0.1) !important;
                            caret-color: ${theme.text} !important;
                            transition-delay: 5000s !important;
                            border-radius: 12px !important;
                          }
                          #swal-input-apikey-ue:hover:not(:focus) {
                            box-shadow: ${theme.shadow.sm}, inset 0 1px 3px rgba(0,0,0,0.4), inset 0 -1px 3px rgba(255,255,255,0.1) !important;
                          }
                          #swal-input-apikey-ue::placeholder {
                            color: ${theme.textMuted} !important;
                          }
                          /* Prevent browser autofill background override - aggressive approach */
                          #swal-input-apikey-ue:-webkit-autofill {
                            -webkit-box-shadow: 0 0 0 1000px ${theme.background} inset, ${theme.shadow.inset}, inset 0 1px 3px rgba(0,0,0,0.4), inset 0 -1px 3px rgba(255,255,255,0.1) !important;
                            -webkit-text-fill-color: ${theme.text} !important;
                            box-shadow: 0 0 0 1000px ${theme.background} inset, ${theme.shadow.inset}, inset 0 1px 3px rgba(0,0,0,0.4), inset 0 -1px 3px rgba(255,255,255,0.1) !important;
                            color: ${theme.text} !important;
                            background-color: ${theme.background} !important;
                            border: none !important;
                            outline: none !important;
                            border-radius: 12px !important;
                          }
                          #swal-input-apikey-ue:-webkit-autofill:hover {
                            -webkit-box-shadow: 0 0 0 1000px ${theme.background} inset, ${theme.shadow.outer}, inset 0 1px 3px rgba(0,0,0,0.4), inset 0 -1px 3px rgba(255,255,255,0.1) !important;
                            -webkit-text-fill-color: ${theme.text} !important;
                            box-shadow: 0 0 0 1000px ${theme.background} inset, ${theme.shadow.outer}, inset 0 1px 3px rgba(0,0,0,0.4), inset 0 -1px 3px rgba(255,255,255,0.1) !important;
                            color: ${theme.text} !important;
                            background-color: ${theme.background} !important;
                            border: none !important;
                            outline: none !important;
                          }
                          #swal-input-apikey-ue:-webkit-autofill:focus {
                            -webkit-box-shadow: 0 0 0 1000px ${theme.background} inset, ${theme.shadow.outer}, 0 0 0 2px ${theme.accent}40, inset 0 1px 3px rgba(0,0,0,0.4), inset 0 -1px 3px rgba(255,255,255,0.1) !important;
                            -webkit-text-fill-color: ${theme.text} !important;
                            box-shadow: 0 0 0 1000px ${theme.background} inset, ${theme.shadow.outer}, 0 0 0 2px ${theme.accent}40, inset 0 1px 3px rgba(0,0,0,0.4), inset 0 -1px 3px rgba(255,255,255,0.1) !important;
                            color: ${theme.text} !important;
                            background-color: ${theme.background} !important;
                            border: none !important;
                            outline: none !important;
                          }
                          #swal-input-apikey-ue:focus {
                            box-shadow: ${theme.shadow.outer}, 0 0 0 2px ${theme.accent}40, inset 0 1px 3px rgba(0,0,0,0.4), inset 0 -1px 3px rgba(255,255,255,0.1) !important;
                            border: none !important;
                            outline: none !important;
                          }
                        `;
            document.head.appendChild(styleEl);

            const input = document.getElementById(
              "swal-input-apikey-ue",
            ) as HTMLInputElement | null;
            const select = document.getElementById(
              "swal-select-provider",
            ) as HTMLSelectElement | null;
            const link = document.getElementById(
              "provider-link",
            ) as HTMLAnchorElement | null;
            const toggleButton = document.getElementById(
              "toggle-apikey-visibility-ue",
            );
            const trigger = document.getElementById("nm-provider-trigger");
            const menu = document.getElementById("nm-provider-menu");
            const labelEl = document.getElementById("nm-provider-label");
            const arrow = document.getElementById("nm-provider-arrow");
            const options = document.querySelectorAll(".nm-provider-option");

            // Shadow values cached for DOM manipulation
            const nmShadowInset = theme.shadow.inset;
            const nmShadowSm = theme.shadow.sm;
            const nmAccent = theme.accent;
            const nmText = theme.text;
            const nmTextMuted = theme.textMuted;

            if (
              select &&
              link &&
              input &&
              trigger &&
              menu &&
              labelEl &&
              arrow
            ) {
              const persistedProvider =
                localStorage.getItem("selectedProvider");
              const initialProvider =
                forcedProvider || persistedProvider || PROVIDERS[0].id;
              select.value = initialProvider;
              const providerMeta =
                PROVIDERS.find((pr) => pr.id === initialProvider) ||
                PROVIDERS[0];
              labelEl.textContent = providerMeta.name;
              link.href = providerMeta.link;
              link.textContent = providerMeta.name;
              input.placeholder = "Ingresa tu API Key de " + providerMeta.name;
              const savedKey = localStorage.getItem(initialProvider + "ApiKey");
              if (savedKey) {
                input.value = savedKey;
              }

              // Highlight selected option
              const updateOptionStyles = () => {
                options.forEach((opt) => {
                  const el = opt as HTMLElement;
                  if (el.dataset.value === select.value) {
                    el.style.boxShadow = nmShadowInset;
                    el.style.color = nmAccent;
                    el.style.fontWeight = "600";
                  } else {
                    el.style.boxShadow = "none";
                    el.style.color = nmText;
                    el.style.fontWeight = "400";
                  }
                });
              };
              updateOptionStyles();

              let isOpen = false;
              const toggleMenu = () => {
                isOpen = !isOpen;
                menu.style.display = isOpen ? "block" : "none";
                trigger.style.boxShadow = isOpen ? nmShadowInset : nmShadowSm;
                arrow.style.transform = isOpen
                  ? "translateY(-50%) rotate(180deg)"
                  : "translateY(-50%) rotate(0deg)";
                arrow.style.color = isOpen ? nmAccent : nmTextMuted;
              };

              trigger.addEventListener("click", (e) => {
                e.stopPropagation();
                toggleMenu();
              });

              // Option click
              options.forEach((opt) => {
                const el = opt as HTMLElement;
                el.addEventListener("click", (e) => {
                  e.stopPropagation();
                  const val = el.dataset.value || PROVIDERS[0].id;
                  select.value = val;
                  const p =
                    PROVIDERS.find((pr) => pr.id === val) || PROVIDERS[0];
                  labelEl.textContent = p.name;
                  link.href = p.link;
                  link.textContent = p.name;
                  input.placeholder = "Ingresa tu API Key de " + p.name;
                  const existing = localStorage.getItem(p.id + "ApiKey");
                  input.value = existing || "";
                  updateOptionStyles();
                  toggleMenu();
                });
                // Hover effects (react-select style)
                el.addEventListener("mouseenter", () => {
                  if (el.dataset.value !== select.value) {
                    el.style.boxShadow = nmShadowSm;
                    el.style.color = nmAccent;
                  }
                });
                el.addEventListener("mouseleave", () => {
                  if (el.dataset.value !== select.value) {
                    el.style.boxShadow = "none";
                    el.style.color = nmText;
                  }
                });
              });

              // Close on click outside
              document.addEventListener("click", () => {
                if (isOpen) toggleMenu();
              });
            }
            if (input && toggleButton) {
              setTimeout(() => {
                input.focus();
              }, 100);

              toggleButton.addEventListener("click", () => {
                const type =
                  input.getAttribute("type") === "password"
                    ? "text"
                    : "password";
                input.setAttribute("type", type);

                const eyeOpen =
                  '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 16 16"><path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/><path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/></svg>';
                const eyeClosed =
                  '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 16 16"><path d="m10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7.029 7.029 0 0 0 2.79-.588zM5.21 3.088A7.028 7.028 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474L5.21 3.089z"/><path d="M5.525 7.646a2.5 2.5 0 0 0 2.829 2.829l-2.83-2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6-12-12 .708-.708 12 12-.708.708z"/></svg>';
                toggleButton.innerHTML =
                  type === "password" ? eyeOpen : eyeClosed;

                // Reapply all styling including shadows after type change
                setTimeout(() => {
                  forceInputStyling();
                }, 0);
              });

              toggleButton.addEventListener("mouseenter", () => {
                toggleButton.style.boxShadow = nmShadowInset;
                toggleButton.style.color = nmAccent;
              });
              toggleButton.addEventListener("mouseleave", () => {
                toggleButton.style.boxShadow = nmShadowSm;
                toggleButton.style.color = nmTextMuted;
              });

              // Force autofill styling - watch for changes and apply theme
              const forceInputStyling = () => {
                input.style.backgroundColor = theme.background;
                input.style.color = theme.text;
                input.style.boxShadow = `${theme.shadow.inset}, inset 0 1px 3px rgba(0,0,0,0.4), inset 0 -1px 3px rgba(255,255,255,0.1)`;
              };

              input.addEventListener("change", forceInputStyling);
              input.addEventListener("input", forceInputStyling);
              input.addEventListener("autofill", forceInputStyling);
              input.addEventListener("blur", forceInputStyling);

              // Hover effect - raised but with depth
              input.addEventListener("mouseenter", () => {
                if (document.activeElement !== input) {
                  input.style.boxShadow = `${theme.shadow.sm}, inset 0 1px 3px rgba(0,0,0,0.4), inset 0 -1px 3px rgba(255,255,255,0.1)`;
                }
              });

              input.addEventListener("mouseleave", () => {
                if (document.activeElement !== input) {
                  forceInputStyling();
                }
              });

              // On focus, enhance the shadow
              input.addEventListener("focus", () => {
                input.style.boxShadow = `${theme.shadow.outer}, 0 0 0 2px ${theme.accent}40, inset 0 1px 3px rgba(0,0,0,0.4), inset 0 -1px 3px rgba(255,255,255,0.1)`;
              });

              // Monitor for autofill with interval
              const autofillChecker = setInterval(() => {
                const computed = window.getComputedStyle(input);
                if (
                  computed.boxShadow &&
                  computed.boxShadow.includes("rgb(255")
                ) {
                  // Autofill detected, force styling
                  forceInputStyling();
                }
              }, 100);

              // Clean up on modal close
              const observer = new MutationObserver(() => {
                if (!document.body.contains(input)) {
                  clearInterval(autofillChecker);
                  observer.disconnect();
                }
              });
              observer.observe(document.body, {
                childList: true,
                subtree: true,
              });
            }
          },
          preConfirm: async () => {
            // Función auxiliar para aplicar estilos al mensaje de error
            const applyErrorStyles = () => {
              setTimeout(() => {
                const validationMessage = document.querySelector(
                  ".swal2-validation-message",
                );
                if (validationMessage) {
                  validationMessage.setAttribute(
                    "style",
                    `
                      background: ${
                        isDarkTheme
                          ? "rgba(255, 60, 60, 0.1)"
                          : "rgba(255, 0, 0, 0.05)"
                      };
                      color: ${isDarkTheme ? "#ff9999" : "#d32f2f"};
                      border-color: ${
                        isDarkTheme
                          ? "rgba(255, 60, 60, 0.3)"
                          : "rgba(255, 0, 0, 0.2)"
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
                    `,
                  );
                }
              }, 0);
            };

            const apiKeyInput = document.getElementById(
              "swal-input-apikey-ue",
            ) as HTMLInputElement | null;
            const select = document.getElementById(
              "swal-select-provider",
            ) as HTMLSelectElement | null;
            const apiKey = apiKeyInput?.value;
            const provider = select?.value || PROVIDERS[0].id;

            // Validar que no esté vacío
            if (!apiKey || apiKey.trim() === "") {
              Swal.showValidationMessage(
                `Por favor, ingresa una API Key válida`,
              );
              applyErrorStyles();
              apiKeyInput?.focus();
              return false;
            }

            // Validar longitud mínima
            if (apiKey.trim().length < 20) {
              Swal.showValidationMessage(
                `La API Key parece demasiado corta. Verifica que sea correcta`,
              );
              applyErrorStyles();
              apiKeyInput?.focus();
              return false;
            }

            // Mostrar loading mientras valida con el proveedor
            Swal.showLoading();

            // Validar con el proveedor
            const isValid = await validateApiKey(apiKey.trim(), provider);

            if (!isValid) {
              Swal.hideLoading();
              const errorMsg =
                provider === "anthropic"
                  ? `API Key de Anthropic inválida. Debe comenzar con "sk-ant-". Por favor, verifica e intenta de nuevo.`
                  : `API Key inválida. Por favor, verifica e intenta de nuevo.`;
              Swal.showValidationMessage(errorMsg);
              applyErrorStyles();
              apiKeyInput!.value = "";
              apiKeyInput?.focus();
              return false;
            }

            // Si es válida, guardar
            localStorage.setItem(`${provider}ApiKey`, apiKey.trim());
            localStorage.setItem("selectedProvider", provider);
            window.dispatchEvent(new Event("apikey-changed"));

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
            title: "¡Guardada!",
            text: `Tu API Key de ${
              PROVIDERS.find((p) => p.id === provider)?.name || provider
            } ha sido guardada.`,
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
