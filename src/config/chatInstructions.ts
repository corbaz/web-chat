// Regla común para todos los proveedores (app, bridges de Claude y Codex y
// agente "chat" de OpenCode Free): los links de mapas se ven como mapa dentro
// del chat y las imágenes de markdown se muestran con vista previa (ver
// src/utils/embedUrl.ts y MarkdownRenderer.tsx). Sin URLs ni caracteres
// especiales a propósito: la misma frase va dentro de un JSON en mac.sh,
// install-mac.sh y windows.bat (ahí sin tildes).
export const LINKS_AND_IMAGES_RULE =
  'Si el usuario pide un mapa, una ubicación o una dirección, incluí un link de Google Maps en markdown con esa dirección en la búsqueda: la app lo muestra como mapa dentro del chat. No podés generar imágenes ni capturas de pantalla; si tenés la URL directa de una imagen pública real, mostrala como imagen markdown. Nunca inventes URLs de imágenes.'
