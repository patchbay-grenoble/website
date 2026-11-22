import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projets = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projets' }),
  schema: z.object({
    title: z.string(),
    tagline: z.string().optional(),
    image: z.string().optional(),
    // Position sur la carte : x = expérimental (0) vers dansant (100), y = sombre (0) vers chill (100)
    x: z.number().min(0).max(100).default(50),
    y: z.number().min(0).max(100).default(50),
    links: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
    // Identifiants (noms de fichier) des projets avec lesquels celui-ci est relié par un câble sur la carte
    connexions: z.array(z.string()).default([]),
    // Profils ou flux à suivre automatiquement (YouTube, SoundCloud, Mixcloud, Mastodon, blog…)
    flux: z.array(z.object({ url: z.string() })).default([]),
  }),
});

const evenements = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/evenements' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date().optional(),
    dateText: z.string().optional(),
    type: z.enum(['Concert', 'Happening', 'Atelier', 'Session vidéo', 'Radio', 'Autre']).default('Concert'),
    lieu: z.string().optional(),
    statut: z.enum(['Confirmé', 'À confirmer']).default('À confirmer'),
    link: z.string().optional(),
  }),
});

export const collections = { projets, evenements };
