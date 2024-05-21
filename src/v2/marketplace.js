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
 * @param {Request} req
 */
export async function getCollection(req) {
	const manifest = await getManifest();
	const collection = manifest.collections[req.params.collection];
	if (collection === undefined) {
		return error(404, 'Not Found');
	}
	const unresolved_items = collection.items;
	collection.items = unresolved_items.map((item) => {
		const [type, name] = item.split('/');
		return {
			...manifest[type][name],
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
	const curator = manifest.curators[decodeURIComponent(req.params.curator)];
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
	if (!manifest[req.params.category]) {
		return error(404, 'Category Not Found');
	}
	if (manifest[req.params.category][req.params.item] === undefined) {
		return error(404, 'Item Not Found');
	}
	let item = await (
		await fetch(
			`https://marketplace-data.muetab.com/${req.params.category}/${req.params.item}.json`,
			{ cf: { cacheTtl: 3600 } },
		)
	).json();

	item.in_collections = manifest[req.params.category][req.params.item].in_collections.map(
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
			name: req.params.item,
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
