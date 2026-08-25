export const CATEGORIES = ['files-dir', 'text', 'find', 'process', 'network', 'permission-user', 'disk', 'archive', 'system', 'shell-pkg'] as const
export type CategorySlug = (typeof CATEGORIES)[number]

export interface LinuxEntry {
  id: string        // kebab,如 'ls'
  name: string      // 命令名
  category: CategorySlug
  desc: string      // 一句话中文说明
  options?: { flag: string; desc: string }[]   // 常用选项 3-5 个
  examples?: string[]                            // 1-2 个,含命令本身
}
