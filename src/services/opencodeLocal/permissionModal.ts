// Modal de permiso para OpenCode Free (T3). El modelo pidió ejecutar algo
// (bash/edit/webfetch/external_directory, ver Problem en el feature doc) y
// la llamada de chat queda bloqueada hasta responder. Rechazar es la opción
// por defecto (foco inicial): nunca se ejecuta nada sin un "Permitir" explícito.
// T7: el modal en sí (texto, botones, estilo) vive en services/permissionModal.ts,
// compartido con Claude (suscripción); acá solo se traduce la decisión.

import type { ColorPalette } from '../../interfaces/temas/temas'
import { askPermission } from '../permissionModal'
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
  const decision = await askPermission(
    theme,
    isDarkTheme,
    describePermission(permission),
  )
  return decision === 'allow' ? 'once' : 'reject'
}
