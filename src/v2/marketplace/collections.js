import paginate from '../../util/pagination.js';
import { getManifest, getVersion, resolveIdentifier } from './utils.js';

export async function getCollection(c) {
	const manifest = await getManifest();

	const resolved = resolveIdentifier(manifest, c.req.param('collection'));
	if (!resolved || resolved.category !== 'collections') {
		return c.json({ error: 'Not Found' }, 404);
	}

	const { key: collectionKey } = resolved;
	const collection = manifest.collections[collectionKey];

	if (collection === undefined) {
		return c.json({ error: 'Not Found' }, 404);
	}

	if (collection.items) {
		const unresolved_items = collection.items;
		collection.items = unresolved_items.map((item) => {
			const [type, name] = item.split('/');
			return {
				...manifest[type][name],
				type,
			};
		});
	}

	const version = getVersion(c.req);
	if (version === 1) {
		collection.name = collection.display_name;
		delete collection.display_name;
	}

	return c.json({ data: collection });
}

export async function getCollections(c) {
	const manifest = await getManifest();
	const collections = Object.values(manifest.collections).map((collection) => {
		// eslint-disable-next-line no-unused-vars
		const { items, ...collectionWithoutItems } = collection;
		return collectionWithoutItems;
	});
	return c.json({ data: paginate(collections, c.req.query()) });
}

export async function getCurator(c) {
	const manifest = await getManifest();
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
	const manifest = await getManifest();
	const curators = Object.keys(manifest.curators);
	return c.json({ data: paginate(curators, c.req.query()) });
}

export async function getFeatured(c) {
	return c.json({
		data: await (
			await fetch('https://marketplace-data.muetab.com/featured.json', { cf: { cacheTtl: 3600 } })
		).json(),
	});
}
