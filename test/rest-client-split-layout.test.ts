// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_LAYOUT,
  DEFAULT_RESPONSE_H,
  LAYOUT_KEY,
  MAX_RESERVE,
  MIN_RESPONSE_H,
  clampResponseHeight,
  maxResponseHeight,
  normalizeLayout,
  readLayout,
  writeLayout
} from '@tools/rest-api-client/split-layout'

beforeEach(() => {
  localStorage.clear()
})

describe('maxResponseHeight', () => {
  it('容器可测时 = 容器高 − MAX_RESERVE', () => {
    expect(maxResponseHeight(1000)).toBe(1000 - MAX_RESERVE)
  })

  it('容器高不足时不低于 MIN_RESPONSE_H(min 优先于上界)', () => {
    expect(maxResponseHeight(260)).toBe(MIN_RESPONSE_H)
  })

  it('容器高度不可测(0 / 负数 / NaN)时返回 Infinity,由调用方跳过上界', () => {
    expect(maxResponseHeight(0)).toBe(Number.POSITIVE_INFINITY)
    expect(maxResponseHeight(-10)).toBe(Number.POSITIVE_INFINITY)
    expect(maxResponseHeight(Number.NaN)).toBe(Number.POSITIVE_INFINITY)
  })
})

describe('clampResponseHeight', () => {
  it('夹在上下界之间', () => {
    expect(clampResponseHeight(500, 1000)).toBe(500)
    expect(clampResponseHeight(10, 1000)).toBe(MIN_RESPONSE_H)
    expect(clampResponseHeight(9999, 1000)).toBe(1000 - MAX_RESERVE)
  })

  it('容器不可测时只保底,绝不编造上界', () => {
    expect(clampResponseHeight(500, 0)).toBe(500)
    expect(clampResponseHeight(10, 0)).toBe(MIN_RESPONSE_H)
  })

  it('非法期望值回落默认高度', () => {
    expect(clampResponseHeight(Number.NaN, 1000)).toBe(DEFAULT_RESPONSE_H)
  })

  it('取整(拖拽会产生小数像素)', () => {
    expect(clampResponseHeight(400.6, 1000)).toBe(401)
  })
})

describe('normalizeLayout', () => {
  it('结构不对一律回落默认', () => {
    expect(normalizeLayout(null)).toEqual(DEFAULT_LAYOUT)
    expect(normalizeLayout(undefined)).toEqual(DEFAULT_LAYOUT)
    expect(normalizeLayout('x')).toEqual(DEFAULT_LAYOUT)
    expect(normalizeLayout({})).toEqual(DEFAULT_LAYOUT)
  })

  it('高度越界夹到 MIN', () => {
    expect(normalizeLayout({ height: 5, collapsed: true })).toEqual({ height: MIN_RESPONSE_H, collapsed: true })
  })

  it('高度非数字回落默认', () => {
    expect(normalizeLayout({ height: Number.NaN }).height).toBe(DEFAULT_RESPONSE_H)
    expect(normalizeLayout({ height: '500' }).height).toBe(DEFAULT_RESPONSE_H)
  })

  it('collapsed 只认布尔 true', () => {
    expect(normalizeLayout({ collapsed: 'yes' }).collapsed).toBe(false)
    expect(normalizeLayout({ collapsed: 1 }).collapsed).toBe(false)
    expect(normalizeLayout({ collapsed: true }).collapsed).toBe(true)
  })
})

describe('readLayout / writeLayout', () => {
  it('写入后可原样读回', () => {
    writeLayout({ height: 400, collapsed: true })
    expect(readLayout()).toEqual({ height: 400, collapsed: true })
  })

  it('无存储值时用默认布局', () => {
    expect(readLayout()).toEqual(DEFAULT_LAYOUT)
  })

  it('存储内容损坏时回落默认,不抛', () => {
    localStorage.setItem(LAYOUT_KEY, '{not json')
    expect(() => readLayout()).not.toThrow()
    expect(readLayout()).toEqual(DEFAULT_LAYOUT)
  })
})
