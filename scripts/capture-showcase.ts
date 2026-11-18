import { type Browser, chromium, type Page } from 'playwright-core'
import { startServer } from './serve'

// The daily run is seeded by the date, so pinning the clock keeps customers, prices and positions identical between runs.
const DAILY_RUN_DATE = new Date('2026-11-17T09:00:00')
const outputDirectory = 'showcase'

type SocialPreviewFormat = { fileName: string; width: number; height: number; copyWidth: number; screenWidth: number }

const socialPreviewFormats: SocialPreviewFormat[] = [
  { fileName: 'social-preview.png', width: 1280, height: 640, copyWidth: 440, screenWidth: 720 },
  { fileName: 'og-image.png', width: 1200, height: 630, copyWidth: 420, screenWidth: 670 },
]

async function capture(page: Page, name: string) {
  await page.screenshot({ path: `${outputDirectory}/${name}.jpg`, type: 'jpeg', quality: 91 })
}

async function openGame(page: Page, address: string) {
  await page.clock.install({ time: DAILY_RUN_DATE })
  await page.goto(address)
  await page.clock.runFor(1500)
}

async function captureSocialPreview(page: Page, format: SocialPreviewFormat) {
  const screenshot = Buffer.from(await Bun.file(`${outputDirectory}/start-screen.jpg`).arrayBuffer()).toString('base64')
  await page.setViewportSize({ width: format.width, height: format.height })
  await page.setContent(
    `<!doctype html>
    <html>
      <head>
        <style>
          * { box-sizing: border-box; }
          html, body { width: ${format.width}px; height: ${format.height}px; margin: 0; overflow: hidden; }
          body {
            position: relative; display: flex; align-items: center; padding: 0 64px;
            color: #e8ecdf; font-family: Arial, Helvetica, sans-serif;
            background: radial-gradient(circle at 12% 88%, rgba(204,243,148,.12), transparent 360px), #141811;
          }
          .copy { position: relative; z-index: 2; width: ${format.copyWidth}px; }
          .brand { display: flex; align-items: center; gap: 12px; font-size: 21px; font-weight: 700; letter-spacing: -.5px; }
          .mark { width: 40px; height: 36px; display: grid; place-items: center; border-radius: 7px; background: #ccf394; color: #141811; font: 700 18px monospace; transform: rotate(-3deg); }
          h1 { margin: 40px 0 20px; font-size: 62px; font-weight: 700; letter-spacing: -2.5px; line-height: 1; }
          h1 em { font-family: Georgia, serif; font-weight: 400; color: #ccf394; }
          p { margin: 0; color: #a3ab99; font-size: 20px; line-height: 1.5; }
          .labels { display: flex; gap: 9px; margin-top: 30px; }
          .labels span { padding: 8px 12px; border: 1px solid #3b4334; border-radius: 99px; font: 700 12px monospace; letter-spacing: 1px; color: #c4cbb9; }
          .screen { position: absolute; right: -150px; top: 50%; width: ${format.screenWidth}px; overflow: hidden; border: 1px solid #3b4334; border-radius: 18px; box-shadow: 0 30px 80px rgba(0,0,0,.5); transform: translateY(-50%) rotate(-1.5deg); }
          .screen img { display: block; width: 100%; }
        </style>
      </head>
      <body>
        <section class="copy">
          <div class="brand"><span class="mark">&gt;_</span>tiny ambitions</div>
          <h1>Just one more <em>feature.</em></h1>
          <p>Three minutes to make rent. Unlimited opportunities to refactor.</p>
          <div class="labels"><span>FREE BROWSER GAME</span><span>3 MIN / RUN</span></div>
        </section>
        <div class="screen"><img src="data:image/jpeg;base64,${screenshot}" alt="" /></div>
      </body>
    </html>`,
    { waitUntil: 'load' },
  )
  await page.locator('.screen img').evaluate((image: HTMLImageElement) => image.decode())
  await page.screenshot({ path: `${outputDirectory}/${format.fileName}`, type: 'png' })
}

await Bun.$`mkdir -p ${outputDirectory}`
const server = startServer()
let browser: Browser | undefined

try {
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  await openGame(page, server.url.href)
  await capture(page, 'start-screen')

  // Walk to the desk and open the feature menu.
  await page.getByRole('button', { name: /unreasonably rich/ }).click()
  await page.clock.runFor(300)
  await page.mouse.click(425, 412)
  await page.clock.runFor(3000)
  await page.keyboard.press('e')
  await page.clock.runFor(800)
  await capture(page, 'feature-menu')

  // Build PDF export, sell it to the customer who asked for it, then let the clock run out.
  await page.getByRole('button', { name: /PDF export/ }).click()
  await page.clock.runFor(6000)
  const bubble = await page.getByText('PDF export', { exact: true }).first().boundingBox()
  if (!bubble) throw new Error('The PDF export customer is not on screen')
  await page.mouse.click(bubble.x + 40, bubble.y + 90)
  await page.clock.runFor(4000)
  await page.keyboard.press('e')
  await page.clock.runFor(1500)
  for (let elapsed = 0; elapsed < 185_000; elapsed += 5000) {
    // The game advances at most 5 seconds per frame, so jump the clock in 5-second steps.
    await page.clock.fastForward(5000)
    await page.clock.runFor(20)
  }
  await page.clock.runFor(2000)
  await page.getByText('YOUR FOUNDER TYPE').waitFor()
  await capture(page, 'founder-report')

  for (const format of socialPreviewFormats) await captureSocialPreview(page, format)
} finally {
  await browser?.close()
  server.stop(true)
}

console.log(`Showcase assets written to ${outputDirectory}`)
