import { describe, expect, test } from 'bun:test';
import { cle, estFlux, hote, http, lireFlux, texte, trouverFlux } from './flux-parse';

describe('texte', () => {
  test('CDATA, entités et balises', () => {
    expect(texte('<![CDATA[<p>Salut&nbsp;&amp;  &#233;t&#xE9;</p>]]>')).toBe('Salut & été');
  });
  test('entité inconnue laissée telle quelle', () => {
    expect(texte('a &foo; b')).toBe('a &foo; b');
  });
});

test('http', () => {
  expect(http('https://a.fr')).toBe(true);
  expect(http('HTTP://a.fr')).toBe(true);
  expect(http('javascript:alert(1)')).toBe(false);
  expect(http('ftp://a.fr')).toBe(false);
});

test('hote', () => {
  expect(hote('https://www.youtube.com/@x')).toBe('youtube.com');
  expect(hote('pas une url')).toBe('');
});

test('cle : compte et flux du même compte donnent la même clé', () => {
  expect(cle('https://www.Mastodon.social/@a.rss')).toBe('mastodon.social/@a');
  expect(cle('https://mastodon.social/@a/')).toBe('mastodon.social/@a');
  expect(cle('pas une url')).toBe('');
});

test('estFlux', () => {
  expect(estFlux('<?xml version="1.0"?><rss version="2.0">')).toBe(true);
  expect(estFlux('<feed xmlns="http://www.w3.org/2005/Atom">')).toBe(true);
  expect(estFlux('<!DOCTYPE html><html>')).toBe(false);
});

describe('lireFlux', () => {
  test('RSS : garde les items valides, ignore lien non http et date invalide', () => {
    const xml = `<rss><channel>
      <item><title>Live &amp; direct</title><link>https://a.fr/1</link><pubDate>Mon, 01 Dec 2025 10:00:00 GMT</pubDate></item>
      <item><title>Piège</title><link>javascript:alert(1)</link><pubDate>Mon, 01 Dec 2025 10:00:00 GMT</pubDate></item>
      <item><title>Sans date</title><link>https://a.fr/3</link><pubDate>n'importe quoi</pubDate></item>
      <item><description>&lt;p&gt;Pas de titre&lt;/p&gt;</description><guid>https://a.fr/4</guid><pubDate>Tue, 02 Dec 2025 10:00:00 GMT</pubDate></item>
    </channel></rss>`;
    expect(lireFlux(xml)).toEqual([
      { titre: 'Live & direct', url: 'https://a.fr/1', date: new Date('2025-12-01T10:00:00Z') },
      { titre: 'Pas de titre', url: 'https://a.fr/4', date: new Date('2025-12-02T10:00:00Z') },
    ]);
  });

  test('Atom : lien alternate, pas self', () => {
    const xml = `<feed><entry>
      <title>Mix</title>
      <link rel="self" href="https://a.fr/self"/>
      <link rel="alternate" href="https://a.fr/mix?a=1&amp;b=2"/>
      <updated>2025-12-03T20:00:00Z</updated>
    </entry></feed>`;
    expect(lireFlux(xml)).toEqual([{ titre: 'Mix', url: 'https://a.fr/mix?a=1&b=2', date: new Date('2025-12-03T20:00:00Z') }]);
  });
});

test('trouverFlux : auto-découverte relative au profil', () => {
  const html = `<link rel="stylesheet" href="/s.css"><link rel="alternate" type="application/rss+xml" href="/@a.rss">`;
  expect(trouverFlux(html, 'https://mastodon.social/@a')).toBe('https://mastodon.social/@a.rss');
  expect(trouverFlux('<link rel="alternate" type="text/html" href="/x">', 'https://a.fr/')).toBeNull();
});
