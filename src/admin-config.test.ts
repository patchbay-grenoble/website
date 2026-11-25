import { expect, test } from 'bun:test';
import { existsSync } from 'node:fs';

// Une erreur ici casse /admin sans casser le build : Astro ne lit jamais ce fichier.
const racine = new URL('../', import.meta.url).pathname;
const config = Bun.YAML.parse(await Bun.file(`${racine}public/admin/config.yml`).text()) as any;

test('config Sveltia : backend', () => {
  expect(config.backend).toMatchObject({
    name: 'github',
    repo: 'patchbay-grenoble/website',
    branch: 'main',
    skip_ci: true,
    auth_type: 'additions',
    base_url: 'https://sveltia-cms-additions.collectif-patchbay.workers.dev',
  });
});

test('CSP de /admin : autorise le Worker Additions (https et wss)', async () => {
  const page = await Bun.file(`${racine}public/admin/index.html`).text();
  const csp = page.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1] ?? '';
  const connect = csp.split(';').find((d) => d.trim().startsWith('connect-src')) ?? '';
  const hote = new URL(config.backend.base_url).host;
  expect(connect).toContain(`https://${hote}`);
  expect(connect).toContain(`wss://${hote}`);
});

test('config Sveltia : dossiers et fichiers des collections existent', () => {
  for (const c of config.collections) {
    if (c.folder) expect(existsSync(racine + c.folder), c.folder).toBe(true);
    for (const f of c.files ?? []) expect(existsSync(racine + f.file), f.file).toBe(true);
  }
});
