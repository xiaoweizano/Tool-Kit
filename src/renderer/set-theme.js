// 首帧主题注入:先于 React,防 FOUC(存储键与 core/storage.ts 约定一致)
// 外部文件而非内联:CSP default-src 'self' 禁止内联脚本
try {
  var raw = localStorage.getItem('toolkit.settings')
  var t = raw ? (JSON.parse(raw).state || {}).theme : null
  if (t) document.documentElement.dataset.theme = t
} catch (e) { /* eslint-disable-line @typescript-eslint/no-unused-vars */ }
