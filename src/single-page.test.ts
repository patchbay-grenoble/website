import { expect, test } from 'bun:test';
import { existsSync, readdirSync } from 'node:fs';

// Vérifie la sortie du build (dist/) : lancer `bun run build` avant `bun test`
const racine = new URL('../', import.meta.url).pathname;
const dist = `${racine}dist`;
const lire = (chemin: string) => (existsSync(chemin) ? Bun.file(chemin).text() : Promise.resolve(''));
const accueil = await lire(`${dist}/index.html`);
const slugs = readdirSync(`${racine}src/content/projets`)
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.slice(0, -3));

test('build présent', () => {
  expect(existsSync(`${dist}/index.html`)).toBe(true);
});

test('accueil : une section par entrée du menu', () => {
  for (const ancre of ['carte', 'agenda', 'flux', 'collectif']) {
    expect(accueil, ancre).toContain(`id="${ancre}"`);
    expect(accueil, ancre).toContain(`href="/#${ancre}"`);
  }
});

test('chaque projet : bouton de la carte, fiche modale et page partageable', () => {
  for (const slug of slugs) {
    expect(accueil, slug).toMatch(new RegExp(`<dialog[^>]*id="fiche-${slug}"`));
    expect(accueil, slug).toContain(`commandfor="fiche-${slug}"`);
    expect(existsSync(`${dist}/projets/${slug}/index.html`), slug).toBe(true);
  }
});

test('anciennes pages : redirection vers l’ancre', async () => {
  const redirections = { agenda: 'agenda', flux: 'flux', 'a-propos': 'collectif', projets: 'carte' };
  for (const [page, ancre] of Object.entries(redirections)) {
    expect(await lire(`${dist}/${page}/index.html`), page).toContain(`url=/#${ancre}`);
  }
});
