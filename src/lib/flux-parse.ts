// Lecture de flux RSS/Atom, sans dépendance. Tout ce qui vient de l'extérieur est traité comme du texte brut.
export type Brut = { titre: string; url: string; date: Date };

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

const decoder = (s: string): string =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m: string, e: string) => {
    if (e[0] === '#') {
      const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENT[e.toLowerCase()] ?? m;
  });

export const texte = (s = ''): string =>
  decoder(s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export const http = (u: string): boolean => /^https?:\/\//i.test(u);

export const hote = (u: string): string => {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; }
};

// Clé d'identité d'un compte ou d'un flux : https://mastodon.social/@a et .../@a.rss donnent la même clé.
export const cle = (u: string): string => {
  try {
    const x = new URL(u);
    return (x.hostname.replace(/^www\./, '') + x.pathname).toLowerCase().replace(/\.(rss|atom)$/, '').replace(/\/+$/, '');
  } catch { return ''; }
};

const champ = (bloc: string, nom: string): string | undefined =>
  bloc.match(new RegExp(`<${nom}(?:\\s[^>]*)?>([\\s\\S]*?)</${nom}>`, 'i'))?.[1];

function lien(bloc: string): string {
  const rss = texte(champ(bloc, 'link') ?? '');
  if (http(rss)) return rss;
  for (const t of bloc.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = t.match(/\brel=["']([^"']*)["']/i)?.[1] ?? 'alternate';
    const href = t.match(/\bhref=["']([^"']*)["']/i)?.[1];
    if (href && rel === 'alternate') return decoder(href);
  }
  const guid = texte(champ(bloc, 'guid') ?? '');
  return http(guid) ? guid : '';
}

export const estFlux = (corps: string): boolean => /<(rss|feed|rdf:RDF)\b/i.test(corps.slice(0, 3000));

export function lireFlux(xml: string): Brut[] {
  const out: Brut[] = [];
  for (const bloc of xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) ?? []) {
    const url = lien(bloc);
    const date = new Date(texte(champ(bloc, 'pubDate') ?? champ(bloc, 'published') ?? champ(bloc, 'updated') ?? champ(bloc, 'dc:date') ?? ''));
    if (!http(url) || Number.isNaN(date.valueOf())) continue;
    const corps = texte(champ(bloc, 'description') ?? champ(bloc, 'content') ?? champ(bloc, 'summary') ?? '');
    out.push({ url, date, titre: (texte(champ(bloc, 'title') ?? '') || corps).slice(0, 140) || url });
  }
  return out;
}

// Auto-découverte : une page de profil (YouTube, Mastodon…) annonce son flux dans un <link rel="alternate">.
export function trouverFlux(html: string, base: string): string | null {
  for (const t of html.match(/<link\b[^>]*>/gi) ?? []) {
    if (!/\brel=["']alternate["']/i.test(t) || !/\btype=["']application\/(rss|atom)\+xml["']/i.test(t)) continue;
    const href = t.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    try { return new URL(decoder(href), base).href; } catch { continue; }
  }
  return null;
}
