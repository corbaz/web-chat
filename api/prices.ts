// Vercel Function: GET /api/prices -> precios de los modelos de la app (USD
// por millón de tokens), reducidos de models.dev (~5 MB) a unos pocos KB y
// cacheados 24 h en el CDN (ver src/services/pricing/pricing.ts).
import { compactPricing } from '../src/services/pricing/pricing.js'

const MODELS_DEV_URL = 'https://models.dev/api.json'

export async function GET(): Promise<Response> {
  try {
    const response = await fetch(MODELS_DEV_URL, {
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) {
      return Response.json(
        { error: `models.dev respondió ${response.status}` },
        { status: 502 },
      )
    }
    const prices = compactPricing(await response.json())
    return Response.json(
      { fetchedAt: Date.now(), prices },
      {
        headers: {
          'cache-control': 'public, s-maxage=86400, stale-while-revalidate=86400',
        },
      },
    )
  } catch {
    return Response.json(
      { error: 'No se pudo leer models.dev' },
      { status: 502 },
    )
  }
}
