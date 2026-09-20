// Web-only CSP 放宽的唯一来源:build:web(scripts/copy-web.mjs)与 dev:web
// (vite.web.config.ts 的 transformIndexHtml)都必须走这里,规则不得漂移。
// 指令缺失时抛错——静默 no-op 意味着上线后每个跨域请求被 CSP 拦死,必须构建期暴露。
// 注意:真实 index.html 中 connect-src 是最后一条指令、其后无 `;`(止于属性闭合引号),
// 故匹配止于 `;` 或 `"`,不能要求尾随分号——否则正则不命中。
export function relaxConnectSrc(html) {
  const relaxed = html.replace(/connect-src[^;"]*/, 'connect-src *')
  if (relaxed === html) {
    throw new Error('CSP relax failed: connect-src directive not found')
  }
  return relaxed
}
