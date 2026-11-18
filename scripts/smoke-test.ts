import { chromium } from 'playwright-core'
import { startServer } from './serve'

// Plays one run in headless Chrome: the page must load without errors or outside requests,
// the WebGL scene must render, the timer must count down, and the run must end with a founder report.

const server = startServer()
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  // CI runners have no GPU; let Chrome fall back to software WebGL.
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
})

const problems: string[] = []
function check(condition: unknown, message: string) {
  if (condition) console.log(`ok - ${message}`)
  else problems.push(message)
}

try {
  // A modest viewport keeps software rendering fast.
  const page = await browser.newPage({ viewport: { width: 1024, height: 700 } })
  const origin = server.url.origin
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console error: ${message.text()}`)
  })
  page.on('request', (request) => {
    const url = request.url()
    if (!url.startsWith(origin) && !url.startsWith('data:') && !url.startsWith('blob:')) {
      problems.push(`unexpected request: ${url}`)
    }
  })

  await page.clock.install()
  await page.goto(server.url.href)
  await page.clock.runFor(100)

  const timer = () => page.evaluate(() => document.body.innerText.match(/RENT IS DUE IN\s+(\d+:\d\d)/)?.[1])

  check(await page.getByRole('heading', { name: /Just one more/ }).isVisible(), 'title is visible')
  check(await page.locator('canvas').count(), 'WebGL scene is rendered')
  check((await timer()) === '3:00', 'timer starts at 3:00')

  await page.getByRole('button', { name: 'How to play' }).click()
  await page.clock.runFor(100)
  check(await page.getByText('Build. Ship. Pay rent.').isVisible(), 'How to play dialog opens')
  await page.keyboard.press('Escape')
  await page.clock.runFor(100)

  await page.getByRole('button', { name: /unreasonably rich/ }).click()
  await page.clock.fastForward(2000)
  await page.clock.runFor(20)
  const running = await timer()
  check(running && running < '3:00', `timer counts down after the run starts (${running})`)

  // The game advances at most 5 seconds per frame, so jump the clock in 5-second steps instead of rendering every frame.
  for (let elapsed = 0; elapsed < 185_000; elapsed += 5000) {
    await page.clock.fastForward(5000)
    await page.clock.runFor(20)
  }
  await page.clock.runFor(300)
  check(await page.getByText('YOUR FOUNDER TYPE').isVisible(), 'run ends with a founder report')
  check(await page.getByRole('button', { name: 'Just one more try' }).isVisible(), 'founder report offers a retry')
} catch (error) {
  problems.push(String(error))
} finally {
  await browser.close()
  server.stop(true)
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`)
  for (const problem of problems) console.error(`not ok - ${problem}`)
  process.exit(1)
}
console.log('\nSmoke test passed')
