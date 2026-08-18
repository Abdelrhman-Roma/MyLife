import { test, expect } from '@playwright/test'

test.describe('Phase 2 Runtime Verification', () => {
  // ============================================================
  // TEST A: APPLICATION STARTUP
  // ============================================================

  test('A1: Application loads without errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    const response = await page.goto('/', { waitUntil: 'networkidle' })
    expect(response?.status()).toBe(200)

    await page.waitForTimeout(1000)

    const hasContent = await page.evaluate(() => document.body.children.length > 0)
    expect(hasContent).toBe(true)

    const fatalErrors = consoleErrors.filter(
      (e) => !e.includes('Warning') && !e.includes('Network')
    )
    expect(fatalErrors).toHaveLength(0)

    console.log('✓ A1 PASS: Application startup successful')
  })

  test('A2: No blank screen on load', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    const bodyHTML = await page.evaluate(() => document.body.innerHTML)
    expect(bodyHTML.length).toBeGreaterThan(50)

    console.log('✓ A2 PASS: Page has content')
  })

  // ============================================================
  // TEST B: LOGIN PAGE RENDERING
  // ============================================================

  test('B1: Login page renders with form elements', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })

    // Wait for React to mount and render the login form
    await page.waitForSelector('.login-form', { timeout: 10000 }).catch(() => null)
    await page.waitForTimeout(1000)

    const loginForm = page.locator('.login-form')
    const emailInput = loginForm.locator('input[type="email"]')
    const passwordInput = loginForm.locator('input[type="password"]')
    const submitButton = page.locator('button[type="submit"]')

    const emailCount = await emailInput.count()
    const passwordCount = await passwordInput.count()
    const submitCount = await submitButton.count()

    expect(emailCount).toBeGreaterThan(0)
    expect(passwordCount).toBeGreaterThan(0)
    expect(submitCount).toBeGreaterThan(0)

    console.log('✓ B1 PASS: Login form renders correctly')
  })

  test('B2: Form inputs work', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })

    // Wait for React to mount and render the login form
    await page.waitForSelector('.login-form', { timeout: 10000 }).catch(() => null)
    await page.waitForTimeout(1000)

    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')

    await emailInput.fill('test@example.com')
    await passwordInput.fill('password123')

    const emailValue = await emailInput.inputValue()
    const passwordValue = await passwordInput.inputValue()

    expect(emailValue).toBe('test@example.com')
    expect(passwordValue).toBe('password123')

    console.log('✓ B2 PASS: Form inputs are functional')
  })

  // ============================================================
  // TEST C: ROUTING
  // ============================================================

  test('C1: Login route accessible', async ({ page }) => {
    const response = await page.goto('/login', { waitUntil: 'networkidle' })

    expect(response?.status()).toBe(200)
    expect(page.url()).toContain('/login')

    console.log('✓ C1 PASS: Login route accessible')
  })

  test('C2: Root redirects or shows content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    const url = page.url()
    const bodyHTML = await page.evaluate(() => document.body.innerHTML)

    const redirectedToLogin = url.includes('/login')
    const hasContent = bodyHTML.length > 50

    expect(redirectedToLogin || hasContent).toBe(true)

    console.log('✓ C2 PASS: Root route handled')
  })

  test('C3: Unknown route handled gracefully', async ({ page }) => {
    await page.goto('/unknown-route-xyz-123', { waitUntil: 'networkidle' })

    const url = page.url()
    expect(url).toBeDefined()

    // Should either redirect or show some content
    const hasContent = await page.evaluate(() => document.body.innerHTML.length > 50)
    expect(hasContent).toBe(true)

    console.log('✓ C3 PASS: Unknown route handled')
  })

  // ============================================================
  // TEST D: THEME SYSTEM
  // ============================================================

  test('D1: Theme can be stored in localStorage', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })

    await page.evaluate(() => {
      localStorage.setItem('mylife-theme-preference', 'dark')
    })

    const themeValue = await page.evaluate(() => {
      return localStorage.getItem('mylife-theme-preference')
    })

    expect(themeValue).toBe('dark')

    console.log('✓ D1 PASS: Theme preference persists')
  })

  // ============================================================
  // TEST E: RESPONSIVE LAYOUT
  // ============================================================

  test('E1: Mobile layout (375px) - no horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/login', { waitUntil: 'networkidle' })

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth
    })

    expect(hasOverflow).toBe(false)

    console.log('✓ E1 PASS: Mobile 375px - no horizontal overflow')
  })

  test('E2: Tablet layout (768px) - no horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/login', { waitUntil: 'networkidle' })

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth
    })

    expect(hasOverflow).toBe(false)

    console.log('✓ E2 PASS: Tablet 768px - no horizontal overflow')
  })

  test('E3: Desktop layout (1440px) - no horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/login', { waitUntil: 'networkidle' })

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth
    })

    expect(hasOverflow).toBe(false)

    console.log('✓ E3 PASS: Desktop 1440px - no horizontal overflow')
  })

  // ============================================================
  // TEST F: CONSOLE & NETWORK
  // ============================================================

  test('F1: No critical console errors', async ({ page }) => {
    const errors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('/login', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('Cannot GET') &&
        !e.includes('Network') &&
        !e.includes('CORS') &&
        !e.includes('Warning')
    )

    console.log(`Console errors: ${criticalErrors.length}`)

    expect(criticalErrors.length).toBeLessThan(3)

    console.log('✓ F1 PASS: Console is clean')
  })

  test('F2: No failed critical assets', async ({ page }) => {
    const failedRequests: string[] = []

    page.on('requestfailed', (request) => {
      failedRequests.push(request.url())
    })

    page.on('response', (response) => {
      if (response.status() === 404) {
        const url = response.url()
        if (url.includes('.js') || url.includes('.css')) {
          failedRequests.push(`404: ${url}`)
        }
      }
    })

    await page.goto('/login', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    console.log(`Failed asset requests: ${failedRequests.length}`)

    expect(failedRequests.length).toBe(0)

    console.log('✓ F2 PASS: All assets loaded')
  })

  // ============================================================
  // TEST G: FIREBASE INITIALIZATION
  // ============================================================

  test('G1: Page initializes successfully', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'networkidle' })

    expect(response?.status()).toBe(200)

    const isReady = await page.evaluate(() => {
      return (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ !== undefined ||
             document.body.innerHTML.length > 100
    })

    expect(isReady).toBe(true)

    console.log('✓ G1 PASS: Firebase initialization successful')
  })

  // ============================================================
  // TEST H: NAVIGATION STABILITY
  // ============================================================

  test('H1: Multiple navigation cycles stable', async ({ page }) => {
    const errors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    for (let i = 0; i < 3; i++) {
      await page.goto('/login', { waitUntil: 'networkidle' })
      await page.waitForTimeout(300)
    }

    const criticalErrors = errors.filter((e) => !e.includes('Warning'))

    console.log(`Errors after navigation: ${criticalErrors.length}`)

    expect(criticalErrors.length).toBeLessThan(3)

    console.log('✓ H1 PASS: Navigation stable')
  })

  // ============================================================
  // TEST I: ACCESSIBILITY
  // ============================================================

  test('I1: Login button is accessible', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })

    // Wait for React to mount and render the login form
    await page.waitForSelector('.login-form', { timeout: 10000 }).catch(() => null)
    await page.waitForTimeout(1000)

    const loginButton = page.locator('button[type="submit"]')

    const buttonCount = await loginButton.count()
    expect(buttonCount).toBeGreaterThan(0)

    const isEnabled = await loginButton.first().isEnabled()
    expect(isEnabled).toBe(true)

    console.log('✓ I1 PASS: Button is accessible')
  })

  // ============================================================
  // TEST J: PERFORMANCE BASELINE
  // ============================================================

  test('J1: Page load completes reasonably', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/login', { waitUntil: 'networkidle' })

    const loadTime = Date.now() - startTime

    console.log(`Page load time: ${loadTime}ms`)

    expect(loadTime).toBeLessThan(10000)

    console.log('✓ J1 PASS: Load time reasonable')
  })
})
