// 首帧主题注入:先于 React,防 FOUC(存储键与 core/storage.ts 约定一致)
// 外部文件而非内联:CSP default-src 'self' 禁止内联脚本
try {
  var raw = localStorage.getItem('toolkit.settings')
  var s = raw ? (JSON.parse(raw).state || {}) : null
  var t = s ? s.theme : null
  if (t) document.documentElement.dataset.theme = t
  if (t === 'toolkit-custom' && s.custom) applyCustom(s.custom)
} catch (e) { /* eslint-disable-line @typescript-eslint/no-unused-vars */ }

// 与 core/custom-theme.ts 同源的最小实现(纯 ES5,无构建):亮暗判定 + 反差文字 + 混色
function applyCustom(v) {
  function hex(x) {
    var m = /^#?([0-9a-fA-F]{6})$/.exec(String(x || '').trim())
    return m ? m[1] : '000000'
  }
  function rgb(n) { return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)] }
  function mix(a, b, r) {
    var A = rgb(hex(a)), B = rgb(hex(b))
    return A.map(function (val, i) { return Math.round(val + (B[i] - val) * r) })
      .map(function (val) { return val.toString(16).padStart(2, '0') }).join('')
  }
  function contrast(n) {
    var c = rgb(hex(n))
    return (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000 >= 128 ? '0a0a0a' : 'f4f1ea'
  }
  var st = document.documentElement.style
  var map = {
    '--color-base-100': hex(v.base100),
    '--color-base-200': mix(v.base100, v.baseContent, 0.08),
    '--color-base-300': mix(v.base100, v.baseContent, 0.18),
    '--color-base-content': hex(v.baseContent),
    '--color-primary': hex(v.primary),
    '--color-primary-content': contrast(v.primary),
    '--color-error': hex(v.error),
    '--color-error-content': contrast(v.error),
    '--color-warning': hex(v.warning),
    '--color-warning-content': contrast(v.warning),
    '--color-success': hex(v.success),
    '--color-success-content': contrast(v.success)
  }
  for (var k in map) st.setProperty(k, '#' + map[k])
  st.colorScheme = contrast(v.base100) === 'f4f1ea' ? 'dark' : 'light'
}
