import { expect, test } from 'bun:test';
import { existsSync } from 'node:fs';

// Une erreur ici casse /admin sans casser le build : Astro ne lit jamais ce fichier.
const racine = new URL('../', import.meta.url).pathname;
const config = Bun.YAML.parse(await Bun.file(`${racine}public/admin/config.yml`).text()) as any;

test('config Sveltia : backend', () => {
  expect(config.backend).toMatchObject({ name: 'github', repo: 'patchbay-grenoble/website', branch: 'main', skip_ci: true });
});

test('config Sveltia : dossiers et fichiers des collections existent', () => {
  for (const c of config.collections) {
    if (c.folder) expect(existsSync(racine + c.folder), c.folder).toBe(true);
    for (const f of c.files ?? []) expect(existsSync(racine + f.file), f.file).toBe(true);
  }
});
