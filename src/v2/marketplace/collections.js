import paginate from '@/util/pagination';

import { getManifestCached, resolveIdentifier } from '@/v2/marketplace/utils';

import { MARKETPLACE_DATA } from '@/constants';

export async function getCollection(c) {
  const manifest = await getManifestCached(c);

  const resolved = resolveIdentifier(manifest, c.req.param('collection'));
  if (!resolved || resolved.category !== 'collections') {
    return c.json({ error: 'Not Found' }, 404);
  }

  const { key: collectionKey } = resolved;
  const collection = manifest.collections[collectionKey];

  if (collection === undefined) {
    return c.json({ error: 'Not Found' }, 404);
  }

  const resolvedItems = collection.items?.map((ref) => {
    const [type, name] = ref.split('/');
    return { ...manifest[type][name], type };
  });

  let result = { ...collection, ...(resolvedItems !== undefined && { items: resolvedItems }) };

  const version = c.get('version');
  if (version === 1) {
    const { display_name, ...rest } = result;
    result = { ...rest, name: display_name };
  }

  return c.json({ data: result });
}

export async function getCollections(c) {
  const manifest = await getManifestCached(c);
  const collections = Object.values(manifest.collections).map((collection) => {
    // eslint-disable-next-line no-unused-vars
    const { items, ...collectionWithoutItems } = collection;
    return collectionWithoutItems;
  });
  return c.json({ data: paginate(collections, c.req.query()) });
}

export async function getCurator(c) {
  const manifest = await getManifestCached(c);
  const curatorName = decodeURIComponent(c.req.param('curator'));
  const curator = manifest.curators[curatorName];

  if (curator === undefined) {
    return c.json({ error: 'Not Found' }, 404);
  }

  const items = curator.map((item) => {
    const [type, name] = item.split('/');
    return {
      ...manifest[type][name],
      type,
    };
  });

  return c.json({ data: { items } });
}

export async function getCurators(c) {
  const manifest = await getManifestCached(c);
  const curators = Object.keys(manifest.curators);

  return c.json({ data: paginate(curators, c.req.query()) });
}

export async function getFeatured(c) {
  return c.json({
    data: await (
      await fetch(`${MARKETPLACE_DATA}/featured.json`, {
        cf: { cacheTtl: 3600 },
        signal: AbortSignal.timeout(5000),
      })
    ).json(),
  });
}
