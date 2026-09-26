// Modal de permiso para OpenCode Free (T3). El modelo pidió ejecutar algo
// (bash/edit/webfetch/external_directory, ver Problem en el feature doc) y
// la llamada de chat queda bloqueada hasta responder. Rechazar es la opción
// por defecto (foco inicial): nunca se ejecuta nada sin un "Permitir" explícito.

import Swal from 'sweetalert2'
import type { ColorPalette } from '../../interfaces/temas/temas'
import type { PendingPermission, PermissionResponse } from './client'

function describePermission(permission: PendingPermission): string {
  const command = permission.metadata?.command
  if (typeof command === 'string' && command.trim()) return command.trim()

  const patterns = Array.isArray(permission.patterns)
    ? permission.patterns.filter((p) => typeof p === 'string')
    : []
  return patterns.length > 0
    ? `${permission.permission} (${patterns.join(', ')})`
    : permission.permission
}

export async function askOpenCodeFreePermission(
  theme: ColorPalette,
  isDarkTheme: boolean,
  permission: PendingPermission,
): Promise<PermissionResponse> {
  const result = await Swal.fire({
    title: 'Permiso solicitado',
    text: `El modelo quiere ejecutar: ${describePermission(permission)}`,
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

  return result.isConfirmed ? 'once' : 'reject'
}
