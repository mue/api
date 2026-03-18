import { getManifest, resolveIdentifier } from '../utils.js';

export async function getRelatedItems(c) {
	const manifest = await getManifest();

	const category = c.req.param('category');
	const resolved = category
		? resolveIdentifier(manifest, c.req.param('item'), category)
		: resolveIdentifier(manifest, c.req.param('item'));

	if (!resolved) {
		return c.json({ error: 'Item Not Found' }, 404);
	}

	const { key: itemKey, category: resolvedCategory } = resolved;
	const item = manifest[resolvedCategory][itemKey];

	if (!item) {
		return c.json({ error: 'Item Not Found' }, 404);
	}

	const relatedByCollection = new Set();
	const relatedByAuthor = new Set();
	const relatedByCategory = new Set();

	for (const collectionName of item.in_collections) {
		const collection = manifest.collections[collectionName];
		if (collection.items) {
			for (const collectionItem of collection.items) {
				const [type, name] = collectionItem.split('/');
				if (name !== itemKey) {
					relatedByCollection.add(manifest[type][name].id);
				}
			}
		}
	}

	const authorItems = Object.values(manifest.preset_settings)
		.concat(Object.values(manifest.photo_packs))
		.concat(Object.values(manifest.quote_packs))
		.filter((i) => i.author === item.author && i.id !== item.id);

	for (const authorItem of authorItems) {
		relatedByAuthor.add(authorItem.id);
	}

	const categoryItems = Object.values(manifest[resolvedCategory]).filter((i) => i.id !== item.id);

	for (const categoryItem of categoryItems) {
		relatedByCategory.add(categoryItem.id);
	}

	const scoredRelated = new Map();

	for (const id of relatedByCollection) {
		scoredRelated.set(id, (scoredRelated.get(id) || 0) + 10);
	}

	for (const id of relatedByAuthor) {
		scoredRelated.set(id, (scoredRelated.get(id) || 0) + 5);
	}

	for (const id of relatedByCategory) {
		scoredRelated.set(id, (scoredRelated.get(id) || 0) + 2);
	}

	const sortedRelated = Array.from(scoredRelated.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, 10);

	const relatedItems = sortedRelated.map(([id, score]) => {
		const canonicalPath = manifest._id_index[id];
		const [cat, name] = canonicalPath.split('/');

		return { ...manifest[cat][name],
			relevance_score: score };
	});

	return c.json({
		data: { item,
			related: relatedItems },
		meta: { total_related: relatedItems.length },
	});
}

export async function getRandom(c) {
	const manifest = await getManifest();
	const category = c.req.param('category') || 'all';
	const count = Math.min(parseInt(c.req.query('count')) || 1, 10);

	let items;
	if (category === 'all') {
		items = [
			...Object.values(manifest.preset_settings),
			...Object.values(manifest.photo_packs),
			...Object.values(manifest.quote_packs),
		];
	} else {
		if (!manifest[category]) {
			return c.json({ error: 'Category not found' }, 404);
		}

		items = Object.values(manifest[category]);
	}

	const shuffled = [...items];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}

	return c.json({ data: count === 1 ? shuffled[0] : shuffled.slice(0, count) });
}
