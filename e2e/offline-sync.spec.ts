import { test, expect, chromium } from '@playwright/test'

test('two offline clients converge to the same document on reconnect', async () => {
  const browser = await chromium.launch()
  const contextA = await browser.newContext()
  const contextB = await browser.newContext()

  const pageA = await contextA.newPage()
  const pageB = await contextB.newPage()

  const documentUrl = 'http://localhost:3000/documents/YOUR_TEST_DOC_ID'

  await pageA.goto(documentUrl)
  await pageB.goto(documentUrl)

  await contextA.setOffline(true)
  await contextB.setOffline(true)

  const editorA = pageA.locator('[role="region"][aria-label="Document editor"] .ProseMirror')
  const editorB = pageB.locator('[role="region"][aria-label="Document editor"] .ProseMirror')

  await editorA.click()
  await editorA.type('Edited from tab A. ')

  await editorB.click()
  await editorB.type('Edited from tab B. ')

  await contextA.setOffline(false)
  await contextB.setOffline(false)

  await pageA.waitForTimeout(2000)
  await pageB.waitForTimeout(2000)

  const finalA = await editorA.innerText()
  const finalB = await editorB.innerText()

  expect(finalA).toBe(finalB)
  expect(finalA).toContain('Edited from tab A.')
  expect(finalA).toContain('Edited from tab B.')

  await browser.close()
})