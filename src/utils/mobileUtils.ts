/**
 * Utilidades para mejorar la experiencia en dispositivos móviles
 */

/**
 * Configura los eventos necesarios para cerrar el teclado virtual en dispositivos móviles
 * después de enviar un mensaje.
 */
export const setupMobileKeyboardHandler = (): void => {
  // Esperamos a que el DOM esté completamente cargado
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initKeyboardHandler);
  } else {
    initKeyboardHandler();
  }
};

/**
 * Inicializa el manejador del teclado
 */
const initKeyboardHandler = (): void => {
  // Observar cambios en el DOM para detectar cuando se añade el componente DeepChat
  const observer = new MutationObserver(() => {
    const sendButton = document.querySelector('.dc-send-button-container button');
    const textInput = document.querySelector('.dc-text-input');
    
    if (sendButton && textInput) {
      // Añadir evento al botón de envío
      sendButton.addEventListener('click', closeKeyboard);
      
      // Añadir evento para detectar cuando se presiona Enter en el input
      textInput.addEventListener('keydown', (e: Event) => {
        const keyEvent = e as KeyboardEvent;
        if (keyEvent.key === 'Enter' && !keyEvent.shiftKey) {
          // Pequeño retraso para asegurar que el mensaje se envíe primero
          setTimeout(closeKeyboard, 50);
        }
      });
      
      // Añadir evento para detectar cuando se toca el botón de envío en móviles
      sendButton.addEventListener('touchend', (e: Event) => {
        e.preventDefault();
        closeKeyboard();
        // Simular clic después de cerrar el teclado
        setTimeout(() => {
          (sendButton as HTMLElement).click();
        }, 50);
      });
      
      observer.disconnect(); // Dejar de observar una vez que se han configurado los eventos
    }
  });
  
  // Comenzar a observar el documento con la configuración establecida
  observer.observe(document.body, { childList: true, subtree: true });
  
  // También configurar un observador para cuando cambie de conversación o se recargue el componente
  setInterval(() => {
    const sendButton = document.querySelector('.dc-send-button-container button');
    if (sendButton && !sendButton.hasAttribute('data-keyboard-handler')) {
      sendButton.setAttribute('data-keyboard-handler', 'true');
      sendButton.addEventListener('click', closeKeyboard);
      sendButton.addEventListener('touchend', (e: Event) => {
        e.preventDefault();
        closeKeyboard();
        // Simular clic después de cerrar el teclado
        setTimeout(() => {
          (sendButton as HTMLElement).click();
        }, 50);
      });
    }
    
    // También verificar el input
    const textInput = document.querySelector('.dc-text-input');
    if (textInput && !textInput.hasAttribute('data-keyboard-handler')) {
      textInput.setAttribute('data-keyboard-handler', 'true');
      textInput.addEventListener('keydown', (e: Event) => {
        const keyEvent = e as KeyboardEvent;
        if (keyEvent.key === 'Enter' && !keyEvent.shiftKey) {
          setTimeout(closeKeyboard, 50);
        }
      });
    }
  }, 1000);
};

/**
 * Cierra el teclado virtual desenfocando el elemento activo
 */
const closeKeyboard = (): void => {
  // Desenfocar cualquier elemento activo para cerrar el teclado
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  
  // Solución adicional para iOS
  // Crear un input temporal, enfocarlo y desenfocarlo inmediatamente
  const tempInput = document.createElement('input');
  tempInput.style.position = 'absolute';
  tempInput.style.opacity = '0';
  tempInput.style.height = '0';
  tempInput.style.fontSize = '16px'; // iOS no hace zoom con 16px o más
  
  document.body.appendChild(tempInput);
  tempInput.focus();
  tempInput.blur();
  
  // Eliminar el input temporal después de un breve retraso
  setTimeout(() => {
    document.body.removeChild(tempInput);
  }, 100);
  
  // Solución específica para Android
  // En algunos dispositivos Android, necesitamos forzar el cierre del teclado
  if (window.navigator.userAgent.match(/Android/i)) {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    document.documentElement.style.height = '100%';
    setTimeout(() => {
      document.documentElement.style.height = '';
    }, 100);
  }
};
