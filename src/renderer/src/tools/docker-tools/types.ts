// src/renderer/src/tools/docker-tools/types.ts
export interface RunLogging { driver: string; options: Record<string, string> }
export interface RunOptions { image: string; name?: string; ports: string[]; volumes: string[]; envs: string[]; restart?: string; network?: string; logging?: RunLogging }
export interface ComposeService { name: string; image: string; ports?: string[]; volumes?: string[]; envs?: string[]; dependsOn?: string[]; restart?: string; networkMode?: string; logging?: RunLogging }
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
