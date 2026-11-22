import { getCollection, type CollectionEntry } from 'astro:content';
import site from '../data/site.json';
import { cle, estFlux, hote, http, lireFlux, texte, trouverFlux } from './flux-parse';

export type Publication = {
  titre: string;
  url: string;
  date: Date;
  source: string;
  projet?: { id: string; nom: string };
  compte?: string;
};

// Lu au moment du build : une source en panne ne casse jamais le site, elle est simplement ignorée.
const cache = new Map<string, Promise<Publication[]>>();
const memo = (k: string, f: () => Promise<Publication[]>) => {
  if (!cache.has(k)) cache.set(k, f());
  return cache.get(k)!;
};

async function lire(url: string, accept: string): Promise<string | null> {
  try {
    const r = await fetch(url, { headers: { accept, 'user-agent': 'patchbay-site/0.1' }, signal: AbortSignal.timeout(8000) });
    return r.ok ? await r.text() : null;
  } catch {
    return null;
  }
}

const FLUX = 'application/rss+xml, application/atom+xml, text/xml;q=0.9, text/html;q=0.8';

async function depuisFlux(url: string): Promise<Publication[]> {
  let corps = await lire(url, FLUX);
  if (corps && !estFlux(corps)) {
    const f = trouverFlux(corps, url);
    corps = f ? await lire(f, FLUX) : null;
  }
  if (!corps || !estFlux(corps)) return [];
  return lireFlux(corps).map((i) => ({ ...i, source: hote(i.url) }));
}

async function depuisMixcloud(url: string): Promise<Publication[]> {
  const user = new URL(url).pathname.split('/').filter(Boolean)[0];
  if (!user) return [];
  const j = await lire(`https://api.mixcloud.com/${encodeURIComponent(user)}/cloudcasts/?limit=10`, 'application/json');
  try {
    return (JSON.parse(j ?? '{}').data ?? [])
      .map((m: any) => ({ titre: String(m.name ?? ''), url: String(m.url ?? ''), date: new Date(m.created_time), source: 'mixcloud.com' }))
      .filter((p: Publication) => p.titre && http(p.url) && !Number.isNaN(p.date.valueOf()));
  } catch {
    return [];
  }
}

function charger(url: string) {
  return memo(url, async () => {
    try {
      if (!http(url)) return [];
      return hote(url).endsWith('mixcloud.com') ? await depuisMixcloud(url) : await depuisFlux(url);
    } catch {
      return [];
    }
  });
}

// Fil public d'un hashtag Mastodon (API ouverte, sans clé, tant que l'instance ne la ferme pas).
function depuisHashtag(instance: string, tag: string) {
  return memo(`#${instance}/${tag}`, async () => {
    if (!/^[a-z0-9.-]+$/i.test(instance) || !/^[\p{L}\p{N}_]+$/u.test(tag)) return [];
    const j = await lire(`https://${instance}/api/v1/timelines/tag/${encodeURIComponent(tag)}?limit=40`, 'application/json');
    try {
      return (JSON.parse(j ?? '[]') as any[])
        .filter((s) => s && !s.reblog && s.visibility === 'public' && http(String(s.url)) && s.account?.url)
        .map((s) => ({
          titre: texte(String(s.content ?? '')).slice(0, 140) || String(s.url),
          url: String(s.url),
          date: new Date(s.created_at),
          source: instance,
          compte: String(s.account.url),
        }))
        .filter((p) => !Number.isNaN(p.date.valueOf()));
    } catch {
      return [];
    }
  });
}

const recent = (a: Publication, b: Publication) => b.date.valueOf() - a.date.valueOf();
const dedoublonner = (l: Publication[]) => {
  const vu = new Set<string>();
  return l.filter((x) => !vu.has(x.url) && vu.add(x.url));
};

export async function publicationsProjet(p: CollectionEntry<'projets'>, max = 6): Promise<Publication[]> {
  const listes = await Promise.all(p.data.flux.map((f) => charger(f.url)));
  const projet = { id: p.id, nom: p.data.title };
  return dedoublonner(listes.flat().map((i) => ({ ...i, projet }))).sort(recent).slice(0, max);
}

// Fil du collectif : flux déclarés dans les fiches projets + posts du hashtag, mais seulement
// pour les comptes qui ont une fiche. Les autres sont signalés dans le journal du build.
export async function fil(max = 40): Promise<Publication[]> {
  const projets = await getCollection('projets');
  const propres = (await Promise.all(projets.map((p) => publicationsProjet(p, 10)))).flat();

  const connus = new Map<string, { id: string; nom: string }>();
  for (const p of projets) for (const f of p.data.flux) connus.set(cle(f.url), { id: p.id, nom: p.data.title });

  const tag = String(site.hashtag ?? '').trim().replace(/^#/, '');
  const inconnus = new Set<string>();
  const tagges: Publication[] = [];
  if (tag) {
    for (const inst of site.instances ?? []) {
      for (const s of await depuisHashtag(inst, tag)) {
        const projet = connus.get(cle(s.compte ?? ''));
        if (projet) tagges.push({ ...s, projet });
        else if (s.compte) inconnus.add(s.compte);
      }
    }
  }
  if (inconnus.size > 0) console.info(`[flux] Comptes qui utilisent #${tag} sans fiche projet : ${[...inconnus].join(', ')}`);
  return dedoublonner([...propres, ...tagges]).sort(recent).slice(0, max);
}
