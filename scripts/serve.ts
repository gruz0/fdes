import { resolve, sep } from 'node:path'

const root = resolve(import.meta.dir, '..')

/** Serves the repository root over HTTP so the game runs the same way it does on GitHub Pages. */
export function startServer(port = 0) {
  return Bun.serve({
    hostname: '127.0.0.1',
    port,
    async fetch(request) {
      const { pathname } = new URL(request.url)
      const path = resolve(root, `.${decodeURIComponent(pathname)}`)
      if (path !== root && !path.startsWith(root + sep)) return new Response('Forbidden', { status: 403 })

      const file = Bun.file(pathname.endsWith('/') ? `${path}/index.html` : path)
      return (await file.exists()) ? new Response(file) : new Response('Not found', { status: 404 })
    },
  })
}

if (import.meta.main) {
  const server = startServer(Number(process.env.PORT ?? 4173))
  console.log(`Just One More Feature is running at ${server.url}`)
}
