// src/renderer/src/tools/docker-tools/types.ts
export interface RunOptions { image: string; name?: string; ports: string[]; volumes: string[]; envs: string[]; restart?: string; network?: string }
export interface ComposeService { name: string; image: string; ports?: string[]; volumes?: string[]; envs?: string[]; dependsOn?: string[] }
export interface DockerfileOptions {
  base: string
  workdir?: string
  copy?: { src: string; dest: string }[]
  run?: string[]
  expose?: string
  entrypoint?: string
  buildBase?: string
  buildRun?: string[]
  buildCopy?: { src: string; dest: string }[]
  copyFromBuild?: { src: string; dest: string }[]
}
export interface ParsedImageName { registry?: string; namespace?: string; repo: string; tag: string }
export interface ParsedRegistryUrl { scheme: string; host: string; port?: string; path?: string }
