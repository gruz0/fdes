import { copyFileSync, mkdirSync, rmSync } from 'node:fs'

// The game is a single self-contained HTML file, so the Pages site is that file plus its Open Graph preview.
rmSync('dist', { recursive: true, force: true })
mkdirSync('dist/showcase', { recursive: true })
copyFileSync('index.html', 'dist/index.html')
copyFileSync('showcase/og-image.png', 'dist/showcase/og-image.png')

console.log('Pages site written to dist')
