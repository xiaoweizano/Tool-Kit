import { catFilesDirEntries } from './cat-files-dir'
import { catTextEntries } from './cat-text'
import { catFindEntries } from './cat-find'
import { catProcessEntries } from './cat-process'
import { catNetworkEntries } from './cat-network'
import { catPermissionUserEntries } from './cat-permission-user'
import { catDiskEntries } from './cat-disk'
import { catArchiveEntries } from './cat-archive'
import { catSystemEntries } from './cat-system'
import { catShellPkgEntries } from './cat-shell-pkg'
import type { LinuxEntry } from './types'

export const LINUX_ENTRIES: LinuxEntry[] = [
  ...catFilesDirEntries, ...catTextEntries, ...catFindEntries, ...catProcessEntries,
  ...catNetworkEntries, ...catPermissionUserEntries, ...catDiskEntries,
  ...catArchiveEntries, ...catSystemEntries, ...catShellPkgEntries
].sort((a, b) => a.name.localeCompare(b.name))

export function searchLinux(query: string, category: string): LinuxEntry[] {
  const q = query.trim().toLowerCase()
  const byCat = category === 'all' ? LINUX_ENTRIES : LINUX_ENTRIES.filter((e) => e.category === category)
  if (!q) return byCat
  return byCat.filter((e) => e.name.toLowerCase().includes(q) || e.desc.toLowerCase().includes(q))
}
