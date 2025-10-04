import { error, json } from 'itty-router-extras';
import paginate from '../pagination.js';

/**
 * @param {Request} req
 */
function getVersion(req) {
	const url = new URL(req.url);
	const path = url.pathname;
	let version = path.split('/')[1];
	if (!version.startsWith('v')) version = 1;
	else version = parseInt(version.slice(1));
	return version;
}

async function getManifest() {
	const manifest = await (
		await fetch('https://marketplace-data.muetab.com/manifest.json?v=2', { cf: { cacheTtl: 3600 } })
	).json();
	return manifest;
}

/**
 * Resolve an identifier (name or stable ID) to a canonical path and object key
 * @param {Object} manifest - The marketplace manifest
 * @param {string} identifier - Either a name or stable ID
 * @param {string} category - The category to search in (optional)
 * @returns {Object|null} - { path: string, key: string } or null if not found
 */
function resolveIdentifier(manifest, identifier, category = null) {
	// First check if it's a stable ID
	if (manifest._id_index && manifest._id_index[identifier]) {
		const canonicalPath = manifest._id_index[identifier];
		const [pathCategory, name] = canonicalPath.split('/');
		
		// If category is specified, ensure it matches
		if (category && pathCategory !== category) {
			return null;
		}
		
		return { path: canonicalPath, key: name, category: pathCategory };
	}
	
	// Otherwise treat it as a name
	if (category) {
		// For items, check if the name exists in the specified category
		if (manifest[category] && manifest[category][identifier]) {
			return { path: `${category}/${identifier}`, key: identifier, category };
		}
	} else {
		// For collections, check if the name exists
		if (manifest.collections && manifest.collections[identifier]) {
			return { path: `collections/${identifier}`, key: identifier, category: 'collections' };
		}
	}
	
	return null;
}

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
	const collections = Object.values(manifest.collections).map((collection) => {
		delete collection.items;
		return collection;
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

/**
 * @param {Request} req
 */
export async function getItem(req) {
	const manifest = await getManifest();
	
	// Resolve the item identifier (could be name or stable ID)
	const resolved = resolveIdentifier(manifest, req.params.item, req.params.category);
	if (!resolved) {
		return error(404, 'Item Not Found');
	}
	
	const { key: itemKey, category } = resolved;
	
	if (!manifest[category]) {
		return error(404, 'Category Not Found');
	}
	
	if (manifest[category][itemKey] === undefined) {
		return error(404, 'Item Not Found');
	}
	
	let item = await (
		await fetch(
			`https://marketplace-data.muetab.com/${category}/${itemKey}.json`,
			{ cf: { cacheTtl: 3600 } },
		)
	).json();

	item.in_collections = manifest[category][itemKey].in_collections.map(
		(name) => {
			const collection = manifest.collections[name];
			delete collection.items;
			return collection;
		},
	);

	const version = getVersion(req);
	if (version === 2) {
		item = {
			display_name: item.name,
			...item,
			name: itemKey,
		};
	}

	return json({
		data: item,
		updated: item.updated_at,
	});
}

/**
 * @param {Request} req
 */
export async function getItems(req) {
	let data;
	const manifest = await getManifest();
	if (req.params.category === 'all') {
		data = [
			...Object.values(manifest.preset_settings).map((item) => {
				item.type = 'preset_settings';
				return item;
			}),
			...Object.values(manifest.photo_packs).map((item) => {
				item.type = 'photo_packs';
				return item;
			}),
			...Object.values(manifest.quote_packs).map((item) => {
				item.type = 'quote_packs';
				return item;
			}),
		];
	} else {
		const category = manifest[req.params.category];
		if (!category) {
			return error(404, 'Not Found');
		}
		data = Object.values(category);
		const version = getVersion(req);
		if (version === 1) {
			data = data.map((item) => {
				item.type = req.params.category;
				return item;
			});
		}
	}
	data = paginate(data, req.query);
	return json({ data });
}
