/* eslint-disable indent */
import { error, json } from 'itty-router-extras';
import paginate from '../../pagination.js';
import { getManifest, getVersion, resolveIdentifier } from './utils.js';

/**
 * @param {Request} req
 */
export async function getCollection(req) {
	const manifest = await getManifest();

	// Resolve the collection identifier (could be name or stable ID)
	const resolved = resolveIdentifier(manifest, req.params.collection);
	if (!resolved || resolved.category !== 'collections') {
		return error(404, 'Not Found');
	}

	const { key: collectionKey } = resolved;
	const collection = manifest.collections[collectionKey];

	if (collection === undefined) {
		return error(404, 'Not Found');
	}

	// Handle collections with items (news collections have items: null)
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

	const version = getVersion(req);
	if (version === 1) {
		collection.name = collection.display_name;
		delete collection.display_name;
	}

	return json({ data: collection });
}

export async function getCollections(req) {
	const manifest = await getManifest();
	// Clone collections to avoid mutation
	const collections = Object.values(manifest.collections).map((collection) => {
		// eslint-disable-next-line no-unused-vars
		const { items, ...collectionWithoutItems } = collection;
		return collectionWithoutItems;
	});
	return json({ data: paginate(collections, req.query) });
}

/**
 * @param {Request} req
 */
export async function getCurator(req) {
	const manifest = await getManifest();
	const curatorName = decodeURIComponent(req.params.curator);
	const curator = manifest.curators[curatorName];

	if (curator === undefined) {
		return error(404, 'Not Found');
	}

	const items = curator.map((item) => {
		const [type, name] = item.split('/');
		return {
			...manifest[type][name],
			type,
		};
	});

	return json({ data: { items } });
}

export async function getCurators(req) {
	const manifest = await getManifest();
	const curators = Object.keys(manifest.curators);
	return json({ data: paginate(curators, req.query) });
}

export async function getFeatured() {
	return json({
		data: await (
			await fetch('https://marketplace-data.muetab.com/featured.json', { cf: { cacheTtl: 3600 } })
		).json(),
	});
}
