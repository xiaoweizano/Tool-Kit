// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import { ConditionTree } from '@tools/es-query-builder/components/ConditionTree'
import { EMPTY_CONDITION } from '@tools/es-query-builder/types'
import type { Condition } from '@tools/es-query-builder/types'

afterEach(cleanup)

describe('ConditionTree 条件编辑器', () => {
  it('初始空分组容器带「+ 条件」与「+ 分组」按钮', () => {
    const { getByText } = render(<ConditionTree root={EMPTY_CONDITION} onChange={() => {}} />)
    expect(getByText('+ 条件')).toBeTruthy()
    expect(getByText('+ 分组')).toBeTruthy()
  })

  it('点「+ 条件」后 onChange 交付含 1 个叶子的新树', () => {
    let got: Condition | null = null
    const { getByText, rerender } = render(<ConditionTree root={EMPTY_CONDITION} onChange={(n) => { got = n }} />)
    fireEvent.click(getByText('+ 条件'))
    expect(got).not.toBeNull()
    const g = got!
    expect(g.children).toHaveLength(1)
    // 用新树重渲染,验证叶子行出现
    rerender(<ConditionTree root={g} onChange={(n) => { got = n }} />)
    expect(screen.getAllByPlaceholderText('字段').length).toBe(1)
  })

  it('两个叶子都有 ↑↓✕ 操作', () => {
    let got: Condition = EMPTY_CONDITION
    const on = (n: Condition): void => { got = n }
    const { getByText, rerender } = render(<ConditionTree root={EMPTY_CONDITION} onChange={on} />)
    fireEvent.click(getByText('+ 条件'))
    rerender(<ConditionTree root={got} onChange={on} />)
    fireEvent.click(getByText('+ 条件'))
    expect((got as Condition).children).toHaveLength(2)
    rerender(<ConditionTree root={got as Condition} onChange={on} />)
    expect(document.querySelectorAll('.btn-ghost').length).toBeGreaterThanOrEqual(6)
  })

  it('✕ 删除一个条件', () => {
    let got: Condition = EMPTY_CONDITION
    const on = (n: Condition): void => { got = n }
    const { getByText, rerender } = render(<ConditionTree root={EMPTY_CONDITION} onChange={on} />)
    fireEvent.click(getByText('+ 条件'))
    rerender(<ConditionTree root={got} onChange={on} />)
    fireEvent.click(getByText('+ 条件'))
    expect((got as Condition).children).toHaveLength(2)
    rerender(<ConditionTree root={got as Condition} onChange={on} />)
    fireEvent.click(screen.getAllByTitle('删除')[0])
    expect((got as Condition).children).toHaveLength(1)
  })

  it('根点「+ 分组」产生顶层并列分组,不嵌套', () => {
    let got: Condition = EMPTY_CONDITION
    const on = (n: Condition): void => { got = n }
    const { getByText, rerender } = render(<ConditionTree root={EMPTY_CONDITION} onChange={on} />)
    // 先加一个顶层条件
    fireEvent.click(getByText('+ 条件'))
    rerender(<ConditionTree root={got} onChange={on} />)
    // 再点最外层「+ 分组」——应新增一个并列的分组节点
    fireEvent.click(getByText('+ 分组'))
    const children = (got as Condition).children ?? []
    expect(children).toHaveLength(2)
    // 第二个是分组(有 children),且其内部无更深嵌套
    const grp = children[1]
    expect(grp.children).toEqual([])
    // 分组渲染后显示自己的「尚无条件」提示(未被上层条件包裹的深层嵌套)
    rerender(<ConditionTree root={got as Condition} onChange={on} />)
    expect(screen.getAllByText(/尚无条件/).length).toBe(1)
  })
})
