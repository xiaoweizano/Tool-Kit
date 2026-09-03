// src/renderer/src/tools/docker-tools/data/templates.ts
export interface DockerTemplate {
  id: string; label: string; image: string
  ports: string[]; volumes: string[]; envs: string[]
}
export const DOCKER_TEMPLATES: DockerTemplate[] = [
  { id: 'mysql', label: 'MySQL', image: 'mysql:8', ports: ['3306:3306'], volumes: ['./data:/var/lib/mysql'], envs: ['MYSQL_ROOT_PASSWORD=root'] },
  { id: 'postgres', label: 'PostgreSQL', image: 'postgres:16', ports: ['5432:5432'], volumes: ['./data:/var/lib/postgresql/data'], envs: ['POSTGRES_PASSWORD=postgres'] },
  { id: 'redis', label: 'Redis', image: 'redis:7', ports: ['6379:6379'], volumes: ['./data:/data'], envs: [] },
  { id: 'nginx', label: 'Nginx', image: 'nginx:alpine', ports: ['80:80'], volumes: ['./nginx.conf:/etc/nginx/nginx.conf:ro'], envs: [] },
  { id: 'mongo', label: 'MongoDB', image: 'mongo:7', ports: ['27017:27017'], volumes: ['./data:/data/db'], envs: [] },
  { id: 'node', label: 'Node', image: 'node:18-alpine', ports: ['3000:3000'], volumes: ['./:/app'], envs: ['NODE_ENV=production'] },
]
