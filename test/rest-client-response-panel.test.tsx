// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { ResponsePanel } from '@tools/rest-api-client/components/ResponsePanel'
import type { ResponseModel } from '@tools/rest-api-client/types'

afterEach(cleanup)

const ok: ResponseModel = {
  ok: true,
  status: 200,
  statusText: 'OK',
  headers: { 'content-type': 'application/json' },
  body: '{"a":1}',
  bodyBytes: 7,
  finalUrl: 'https://x/y',
  durationMs: 123,
  undefinedVars: []
}

function renderPanel(over: Partial<ComponentProps<typeof ResponsePanel>> = {}) {
  return render(
    <ResponsePanel
      response={ok}
      error={null}
      sending={false}
      collapsed={false}
      onToggle={() => {}}
      height={320}
      onCancel={() => {}}
      {...over}
    />
  )
}

describe('展开态', () => {
  it('头部有状态徽标,body 容器在 DOM', () => {
    renderPanel()
    expect(screen.getByTestId('response-status').textContent).toContain('200')
    expect(screen.getByTestId('response-body')).toBeTruthy()
    expect(screen.getByTestId('response-toggle').getAttribute('aria-expanded')).toBe('true')
  })

  it('「200」在 DOM 中只出现一次(单一头部,不重复渲染状态)', () => {
    renderPanel()
    expect(screen.getAllByText(/200/)).toHaveLength(1)
  })

  it('保留最终 URL 与深链入口(既有 spec 要求)', () => {
    renderPanel()
    expect(screen.getByText(/https:\/\/x\/y/)).toBeTruthy()
    expect(screen.getByText('用 JSON 解析打开')).toBeTruthy()
    expect(screen.getByText('用 JWT 解析打开')).toBeTruthy()
  })

  it('超过 1MB 的响应仍提示截断且说明复制/深链用全量', () => {
    renderPanel({ response: { ...ok, body: 'x'.repeat(1024 * 1024 + 1) } })
    expect(screen.getByText(/截断预览/)).toBeTruthy()
    expect(screen.getByText(/全量/)).toBeTruthy()
  })
})

describe('折叠态', () => {
  it('body 容器离开 DOM,状态徽标仍在(折叠不等于隐瞒)', () => {
    renderPanel({ collapsed: true })
    expect(screen.queryByTestId('response-body')).toBeNull()
    expect(screen.getByTestId('response-status').textContent).toContain('200')
    expect(screen.getByTestId('response-toggle').getAttribute('aria-expanded')).toBe('false')
  })

  it('失败时折叠也亮明失败', () => {
    renderPanel({ response: null, error: { title: '请求失败', message: 'connect ECONNREFUSED' }, collapsed: true })
    expect(screen.getByText(/请求失败/)).toBeTruthy()
  })

  it('导入失败与请求失败在标题上可区分', () => {
    renderPanel({ response: null, error: { title: '导入失败', message: 'cURL 解析失败:x' }, collapsed: true })
    expect(screen.getByText(/导入失败/)).toBeTruthy()
    expect(screen.queryByText(/请求失败/)).toBeNull()
  })

  it('进行中折叠也显示进行中与取消', () => {
    const onCancel = vi.fn()
    renderPanel({ response: null, sending: true, collapsed: true, onCancel })
    expect(screen.getByText(/请求进行中/)).toBeTruthy()
    fireEvent.click(screen.getByText('取消'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('未发送过给出操作提示', () => {
    renderPanel({ response: null })
    expect(screen.getByText(/Ctrl\+Enter/)).toBeTruthy()
  })
})

describe('切换', () => {
  it('点头部切换按钮触发 onToggle', () => {
    const onToggle = vi.fn()
    renderPanel({ onToggle })
    fireEvent.click(screen.getByTestId('response-toggle'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('折叠时不写死 height,展开时用传入高度', () => {
    const { unmount } = renderPanel({ collapsed: true, height: 320 })
    expect(screen.getByTestId('response-panel').getAttribute('style')).toBeNull()
    unmount()
    renderPanel({ height: 320 })
    expect(screen.getByTestId('response-panel').getAttribute('style')).toContain('320px')
  })
})
