import { test, expect, chromium } from '@playwright/test'

test('two offline clients converge to the same document on reconnect', async () => {
  const browser = await chromium.launch()
  const contextA = await browser.newContext()
  const contextB = await browser.newContext()

  const pageA = await contextA.newPage()
  const pageB = await contextB.newPage()

  await pageA.goto('http://localhost:3000/documents')
  await pageA.fill('input[aria-label="Document title"]', 'Offline merge test')
  await pageA.click('button:has-text("New document")')
  await pageA.waitForURL(/\/documents\/.+/)

  const documentUrl = pageA.url()
  await pageB.goto(documentUrl)

  const editorA = pageA.locator('[role="region"][aria-label="Document editor"] .ProseMirror')
  const editorB = pageB.locator('[role="region"][aria-label="Document editor"] .ProseMirror')

  // Wait for the editors to be fully loaded and visible before disconnecting
  await editorA.waitFor({ state: 'visible' })
  await editorB.waitFor({ state: 'visible' })

  await contextA.setOffline(true)
  await contextB.setOffline(true)

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