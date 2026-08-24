import { test, expect } from '@playwright/test'

test('首页加载无 console error,导航渲染工具项', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto('/#/')
  await expect(page.getByText('ToolKit')).toBeVisible()
  await expect(page.getByText('JSON 解析').first()).toBeVisible()
  expect(errors).toEqual([])
})

test('工具页粘贴即出', async ({ page }) => {
  await page.goto('/#/tools/json-parser')
  await page.getByPlaceholder(/粘贴 JSON/).fill('{"a":1}')
  await expect(page.getByText(/3 行/)).toBeVisible({ timeout: 3000 })
})
