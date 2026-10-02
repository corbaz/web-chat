// "Revisar modelos": refresca la lista de cada proveedor habilitado, prueba
// cada modelo con un mensaje mínimo y la API key del usuario (desde su
// navegador), deshabilita los que la cuenta no puede usar y arma el informe
// por proveedor. Reutiliza los chequeos automáticos de Gemini y OpenCode Free
// y no gasta la suscripción de los bridges (solo verifica que respondan).

import { getEnabledProviders } from '../../config/enabledProviders'
import { getApiKeyStorageKey } from '../../config/providers'
import {
  checkServer as checkClaudeServer,
  type ServerCheck,
} from '../claudeBridge/client'
import {
  getClaudeCodePassword,
  getClaudeCodeServerUrl,
} from '../claudeBridge/settings'
import { checkServer as checkCodexServer } from '../codexBridge/client'
import { getCodexPassword, getCodexServerUrl } from '../codexBridge/settings'
import { checkServer as checkGeminiSubServer } from '../geminiBridge/client'
import {
  getGeminiSubPassword,
  getGeminiSubServerUrl,
} from '../geminiBridge/settings'
import { recordFreeModelCheckDone } from '../opencodeLocal/freeModelCheck'
import { probeFreeModels } from '../opencodeLocal/modelProbe'
import {
  getOpenCodeFreePassword,
  getOpenCodeFreeServerUrl,
} from '../opencodeLocal/settings'
import { probeGeminiModels, recordGeminiCheckDone } from './geminiProbe'
import { type ProbeOutcome, probeApiModel } from './modelCheck'
import {
  getAllModels,
  getCatalogModelIds,
  getRefreshError,
  markModelAvailable,
  markModelUnavailable,
  refreshProvider,
} from './store'
import type { ProviderId } from './types'

/** 'subscription' = incluido en la suscripción; 'skipped' = no se prueba. */
export type ModelCheckResult = ProbeOutcome | 'subscription' | 'skipped'

export interface ModelCheckEntry {
  id: string
  name?: string
  result: ModelCheckResult
  message?: string
}

export interface ProviderCheckReport {
  provider: string
  label: string
  models: ModelCheckEntry[]
  /** El proveedor entero no se pudo revisar (sin key, bridge apagado...). */
  error?: string
}

export type CheckProgress = (done: number, total: number) => void

const API_CONCURRENCY = 3
const GEMINI_CHUNK = 3

/** Corre `task` sobre `items` con hasta `limit` en paralelo. */
async function runPool<T>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items]
  const worker = async (): Promise<void> => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
      await task(item)
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, queue.length) }, worker),
  )
}

function readKey(provider: string): string {
  try {
    return localStorage.getItem(getApiKeyStorageKey(provider))?.trim() ?? ''
  } catch {
    return ''
  }
}

// Deshabilita o rehabilita según el resultado; 'unknown' no cambia nada.
function applyMark(
  provider: ProviderId,
  id: string,
  result: ModelCheckResult,
): void {
  if (result === 'ok') markModelAvailable(provider, id)
  else if (result === 'quota' || result === 'unavailable') {
    markModelUnavailable(provider, id, result)
  }
}

const BRIDGE_ERRORS: Record<Exclude<ServerCheck, 'ok'>, string> = {
  unauthorized: 'La contraseña del bridge es incorrecta.',
  unreachable: 'El bridge no responde: revisá que esté encendido.',
}

async function checkBridge(provider: ProviderId): Promise<ServerCheck> {
  if (provider === 'claudecode') {
    return checkClaudeServer(getClaudeCodeServerUrl(), getClaudeCodePassword())
  }
  if (provider === 'geminisub') {
    return checkGeminiSubServer(getGeminiSubServerUrl(), getGeminiSubPassword())
  }
  return checkCodexServer(getCodexServerUrl(), getCodexPassword())
}

/** Revisa todos los proveedores habilitados. Nunca lanza. */
// Una sola revisión a la vez (p. ej. StrictMode monta el modal dos veces en
// desarrollo): una segunda llamada recibe la misma revisión en curso en vez
// de mandar otra tanda de pedidos (y de costo).
let inFlight: Promise<ProviderCheckReport[]> | null = null
const progressListeners = new Set<CheckProgress>()

export function runModelCheck(
  onProgress?: CheckProgress,
): Promise<ProviderCheckReport[]> {
  if (onProgress) progressListeners.add(onProgress)
  if (!inFlight) {
    inFlight = runModelCheckOnce((done, total) => {
      for (const listener of progressListeners) listener(done, total)
    }).finally(() => {
      inFlight = null
      progressListeners.clear()
    })
  }
  return inFlight
}

async function runModelCheckOnce(
  onProgress?: CheckProgress,
): Promise<ProviderCheckReport[]> {
  let done = 0
  let total = 0
  const addTotal = (count: number): void => {
    total += count
    onProgress?.(done, total)
  }
  const addDone = (count = 1): void => {
    done += count
    onProgress?.(done, total)
  }

  const checkProvider = async (
    value: string,
    label: string,
  ): Promise<ProviderCheckReport> => {
    const provider = value as ProviderId
    const report: ProviderCheckReport = { provider: value, label, models: [] }
    try {
      await refreshProvider(provider)
      const refreshError = getRefreshError(provider)
      if (refreshError) {
        report.error = `No se pudo actualizar la lista de modelos (${refreshError}): se revisa la última lista guardada, que puede estar incompleta.`
      }
      const ids = getCatalogModelIds(provider)
      const names = new Map(
        getAllModels()
          .filter((model) => model.provider === provider)
          .map((model) => [model.id, model.name]),
      )
      const results = new Map<string, Omit<ModelCheckEntry, 'id' | 'name'>>()
      addTotal(ids.length)

      if (
        provider === 'claudecode' ||
        provider === 'codexsub' ||
        provider === 'geminisub'
      ) {
        const status = await checkBridge(provider)
        if (status === 'ok') {
          for (const id of ids) results.set(id, { result: 'subscription' })
        } else {
          report.error = BRIDGE_ERRORS[status]
        }
        addDone(ids.length)
      } else if (provider === 'routellm') {
        for (const id of ids) {
          results.set(id, {
            result: 'skipped',
            message: 'Los ids de RouteLLM son rutas: no se prueban.',
          })
        }
        addDone(ids.length)
      } else if (provider === 'opencodefree') {
        const password = getOpenCodeFreePassword()
        if (!password) {
          report.error = 'Falta la contraseña del servidor local.'
          addDone(ids.length)
        } else {
          const probed = await probeFreeModels(
            getOpenCodeFreeServerUrl(),
            password,
            ids,
          )
          for (const id of ids) {
            results.set(id, { result: probed[id] ?? 'unknown' })
          }
          if (ids.some((id) => results.get(id)?.result !== 'unknown')) {
            recordFreeModelCheckDone()
          }
          addDone(ids.length)
        }
      } else {
        const apiKey = readKey(provider)
        if (!apiKey) {
          report.error = 'Falta la API key.'
          addDone(ids.length)
        } else if (provider === 'gemini') {
          for (let i = 0; i < ids.length; i += GEMINI_CHUNK) {
            const chunk = ids.slice(i, i + GEMINI_CHUNK)
            const probed = await probeGeminiModels(apiKey, chunk)
            for (const id of chunk) {
              results.set(id, { result: probed[id] ?? 'unknown' })
            }
            addDone(chunk.length)
          }
          if ([...results.values()].some((r) => r.result !== 'unknown')) {
            recordGeminiCheckDone(apiKey)
          }
        } else {
          await runPool(ids, API_CONCURRENCY, async (id) => {
            results.set(id, await probeApiModel(provider, id, apiKey))
            addDone()
          })
        }
      }

      // Si TODOS los modelos fallan como "no disponible" (p. ej. un 404 del
      // proxy o del proveedor entero), el problema no es de cada modelo: no
      // se deshabilita ninguno y se informa como no comprobado.
      const entries = ids
        .map((id) => results.get(id))
        .filter((entry): entry is NonNullable<typeof entry> => !!entry)
      const providerWide =
        entries.length > 1 &&
        entries.every((entry) => entry.result === 'unavailable')
      if (providerWide) {
        report.error =
          'Todos los modelos fallaron igual: parece un problema del proveedor o de la conexión, no de cada modelo. No se deshabilitó ninguno.'
      }
      for (const id of ids) {
        const entry = results.get(id)
        if (!entry) continue
        const effective = providerWide
          ? { ...entry, result: 'unknown' as const }
          : entry
        applyMark(provider, id, effective.result)
        report.models.push({ id, name: names.get(id), ...effective })
      }
    } catch (error) {
      report.error =
        error instanceof Error ? error.message : 'No se pudo revisar.'
    }
    return report
  }

  return Promise.all(
    getEnabledProviders().map(({ value, label }) =>
      checkProvider(value, label),
    ),
  )
}
