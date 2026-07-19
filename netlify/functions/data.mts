import { getStore } from '@netlify/blobs';
import type { Config, Context } from '@netlify/functions';

/**
 * Stockage des données PERRIO dans Netlify Blobs.
 *
 * Un unique document JSON contient les six collections. L'espace est partagé :
 * il n'y a ni compte ni cloisonnement, quiconque atteint cette URL lit et écrit
 * les mêmes données.
 *
 *   GET  /api/data  → { revision, token, updatedAt, data }
 *   PUT  /api/data  → { revision, token, updatedAt } ou 409 si écriture concurrente
 *
 * La concurrence est gérée par compare-and-swap : l'écriture n'est acceptée que
 * si le jeton fourni correspond encore à la version stockée. Un simple « lire puis
 * écrire » ne suffirait pas — deux requêtes simultanées passeraient toutes les
 * deux le contrôle et la seconde écraserait la première.
 */

const STORE = 'perrio';
const KEY = 'dataset';

interface Document {
  revision: number;
  updatedAt: string;
  data: unknown;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

/**
 * Jeton de version présenté par le client à l'écriture.
 *
 * Il dérive uniquement du numéro de révision embarqué dans le document, jamais
 * de l'ETag : l'ETag n'est pas exposé par toutes les implémentations du store
 * (le serveur de développement local, notamment, ne le renvoie qu'en écriture).
 * Mélanger les deux sources produirait un jeton que la lecture suivante ne
 * saurait plus reconnaître, et donc un conflit à chaque enregistrement.
 */
const tokenOf = (doc: Document | null) => (doc ? `r${doc.revision}` : null);

/** Lit le document, son ETag éventuel et son jeton de version. */
async function read(store: ReturnType<typeof getStore>) {
  const entry = await store.getWithMetadata(KEY, { type: 'json' });
  if (!entry) return { doc: null, etag: null, token: null };

  const doc = entry.data as Document;
  return { doc, etag: entry.etag ?? null, token: tokenOf(doc) };
}

const conflict = (doc: Document | null, token: string | null) =>
  json(
    {
      error: 'conflict',
      message: 'Les données ont changé depuis votre dernier chargement.',
      revision: doc?.revision ?? 0,
      token,
      updatedAt: doc?.updatedAt ?? null,
      data: doc?.data ?? null,
    },
    409,
  );

export default async (req: Request, _context: Context): Promise<Response> => {
  const store = getStore(STORE);

  if (req.method === 'GET') {
    const { doc, token } = await read(store);
    // Espace vierge : le client se charge d'insérer le jeu de démonstration.
    return json({
      revision: doc?.revision ?? 0,
      token,
      updatedAt: doc?.updatedAt ?? null,
      data: doc?.data ?? null,
    });
  }

  if (req.method === 'PUT') {
    let body: { token?: string | null; data?: unknown };
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Corps de requête illisible.' }, 400);
    }

    if (!body || typeof body.data !== 'object' || body.data === null) {
      return json({ error: 'Le champ « data » est requis.' }, 400);
    }

    const { doc: current, etag: currentEtag, token: currentToken } = await read(store);

    // Le client travaille sur une version dépassée : il devra fusionner.
    if ((body.token ?? null) !== currentToken) {
      return conflict(current, currentToken);
    }

    const next: Document = {
      revision: (current?.revision ?? 0) + 1,
      updatedAt: new Date().toISOString(),
      data: body.data,
    };

    // Écriture conditionnelle quand la plateforme la propose : en cas de course
    // perdue, on préfère renvoyer un conflit plutôt qu'écraser l'autre écriture.
    const result = currentEtag
      ? await store.setJSON(KEY, next, { onlyIfMatch: currentEtag })
      : await store.setJSON(KEY, next);

    if (!result.modified) {
      const fresh = await read(store);
      return conflict(fresh.doc, fresh.token);
    }

    return json({ revision: next.revision, token: tokenOf(next), updatedAt: next.updatedAt });
  }

  if (req.method === 'DELETE') {
    await store.delete(KEY);
    return json({ revision: 0, token: null, updatedAt: null, data: null });
  }

  return json({ error: 'Méthode non autorisée.' }, 405);
};

export const config: Config = {
  path: '/api/data',
};
