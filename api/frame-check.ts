// Vercel Function: GET /api/frame-check?url=<https://...> ->
// { framable: true | false | null }. Solo lee los headers de la página para
// saber si el chat la puede mostrar en un iframe (ver src/utils/frameCheck.ts).
import { checkFrameable } from '../src/utils/frameCheck'

export async function GET(request: Request): Promise<Response> {
  const target = new URL(request.url).searchParams.get('url') ?? ''
  const framable = await checkFrameable(target)
  return Response.json(
    { framable },
    {
      headers: {
        // Los headers de un sitio cambian poco: cache en el CDN de Vercel.
        'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  )
}
