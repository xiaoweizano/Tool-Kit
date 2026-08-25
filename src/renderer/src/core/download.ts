export function buildBlobUrl(parts: BlobPart[], type: string): string {
  return URL.createObjectURL(new Blob(parts, { type }))
}

export function downloadFile(filename: string, parts: BlobPart[], type: string): void {
  const url = buildBlobUrl(parts, type)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
