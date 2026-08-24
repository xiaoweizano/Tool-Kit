// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppShell } from '@app/AppShell'

describe('AppShell', () => {
  it('空注册表渲染品牌与设置入口', () => {
    const { getByText } = render(
      <MemoryRouter><AppShell /></MemoryRouter>
    )
    expect(getByText('ToolKit')).toBeTruthy()
    expect(getByText('设置')).toBeTruthy()
  })
})
