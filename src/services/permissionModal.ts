// Modal de permiso genérico (T7, ver odd/tasks/claude-subscription-bridge.md):
// el modelo quiere ejecutar algo en la máquina local y la llamada de chat
// queda bloqueada hasta responder. Rechazar es la opción por defecto (foco
// inicial): nunca se ejecuta nada sin un "Permitir" explícito. Usado por
// Claude (suscripción) directamente y por OpenCode Free a través de su
// propio wrapper (services/opencodeLocal/permissionModal.ts), que solo
// traduce la decisión a su formato ('once' | 'reject').

import Swal from 'sweetalert2'
import type { ColorPalette } from '../interfaces/temas/temas'

export type PermissionDecision = 'allow' | 'deny'

export async function askPermission(
  theme: ColorPalette,
  isDarkTheme: boolean,
  description: string,
): Promise<PermissionDecision> {
  const result = await Swal.fire({
    title: 'Permiso solicitado',
    text: `El modelo quiere ejecutar: ${description}`,
    icon: 'warning',
    iconColor: theme.accent,
    showCancelButton: true,
    reverseButtons: true,
    focusCancel: true,
    confirmButtonText: 'Permitir una vez',
    confirmButtonColor: theme.accent,
    cancelButtonText: 'Rechazar',
    cancelButtonColor: isDarkTheme ? theme.surface : theme.secondary,
    background: theme.background,
    color: theme.text,
    allowOutsideClick: false,
    allowEscapeKey: false,
  })

  return result.isConfirmed ? 'allow' : 'deny'
}
