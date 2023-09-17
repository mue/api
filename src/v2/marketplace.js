import { error, json } from 'itty-router-extras';
import ms from 'ms';

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
	const manifest = await (await fetch('https://marketplace-data.muetab.com/manifest.json', {
		cf: {
			cacheEverything: true,
			cacheTtl: ms('1h'),
		},
	})).json();
	return manifest;
}

/**
 * @param {Request} req
 */
export async function getCollection(req) {
	const manifest = await getManifest();
	const index = manifest.index.collections[req.params.collection];
	if (!index) {
		return error(404, 'Not Found');
	}
	const collection = manifest.collections[index];
	const unresolved_items = collection.items;
	collection.items = unresolved_items.map((item) => {
		const [type, name] = item.split('/');
		return {
			...manifest[type][manifest.index[type][name]],
			type,
		};
	});

	const version = getVersion(req);
	if (version === 1) {
		collection.name = collection.display_name;
		delete collection.display_name;
	}

	return json({ data: collection });
}

export async function getCollections() {
	const manifest = await getManifest();
	const collections = manifest.collections.map((collection) => {
		delete collection.items;
		return collection;
	});
	return json({ data: collections });
}

export async function getFeatured() {
	return json({
		data: await (await fetch('https://marketplace-data.muetab.com/featured.json', {
			cf: {
				cacheEverything: true,
				cacheTtl: ms('1h'),
			},
		})).json(),
	});
}

/**
 * @param {Request} req
 */
export async function getItem(req) {
	const manifest = await getManifest();
	if (!manifest[req.params.category]) {
		return error(404, 'Category Not Found');
	}
	const index = manifest.index[req.params.category][req.params.item];
	if (!index) {
		return error(404, 'Item Not Found');
	}
	let item = await (await fetch(`https://marketplace-data.muetab.com/${req.params.category}/${req.params.item}.json`, {
		cf: {
			cacheEverything: true,
			cacheTtl: ms('1h'),
		},
	})).json();

	const version = getVersion(req);
	if (version === 2) {
		item = {
			display_name: item.name,
			...item,
			name: req.params.item,
		};
	}

	return json({
		data: item,
		updated: 'unknown',
	});
}

/**
 * @param {Request} req
 */
export async function getItems(req) {
	const manifest = await getManifest();
	if (req.params.category === 'all') {
		return json({
			data: [
				...manifest.preset_settings.map((item) => {
					item.type = 'preset_settings';
					return item;
				}),
				...manifest.photo_packs.map((item) => {
					item.type = 'photo_packs';
					return item;
				}),
				...manifest.quote_packs.map((item) => {
					item.type = 'quote_packs';
					return item;
				}),
			],
		});
	} else {
		const category = manifest[req.params.category];
		if (!category) {
			return error(404, 'Not Found');
		}

		const version = getVersion(req);
		if (version === 1) {
			category.map((item) => {
				item.type = req.params.category;
				return item;
			});
		}

		return json({ data: category });
	}
}