/* eslint-disable indent */
import { error, json } from 'itty-router-extras';
import { getManifest, resolveIdentifier } from './utils.js';

/**
 * Get related items
 * @param {Request} req
 */
export async function getRelatedItems(req) {
	const manifest = await getManifest();

	// Resolve the item identifier
	const category = req.params.category;
	const resolved = category
		? resolveIdentifier(manifest, req.params.item, category)
		: resolveIdentifier(manifest, req.params.item);

	if (!resolved) {
		return error(404, 'Item Not Found');
	}

	const { key: itemKey, category: resolvedCategory } = resolved;
	const item = manifest[resolvedCategory][itemKey];

	if (!item) {
		return error(404, 'Item Not Found');
	}

	// Find related items based on:
	// 1. Same collections
	// 2. Same author
	// 3. Similar tags
	const relatedByCollection = new Set();
	const relatedByAuthor = new Set();
	const relatedByTags = new Set();

	// Items in same collections
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

	// Items by same author
	const authorItems = Object.values(manifest.preset_settings)
		.concat(Object.values(manifest.photo_packs))
		.concat(Object.values(manifest.quote_packs))
		.filter((i) => i.author === item.author && i.id !== item.id);

	for (const authorItem of authorItems) {
		relatedByAuthor.add(authorItem.id);
	}

	// Items with similar tags
	if (item.tags && item.tags.length > 0) {
		const allItems = Object.values(manifest.preset_settings)
			.concat(Object.values(manifest.photo_packs))
			.concat(Object.values(manifest.quote_packs));

		for (const otherItem of allItems) {
			if (otherItem.id !== item.id && otherItem.tags) {
				const commonTags = otherItem.tags.filter((tag) => item.tags.includes(tag));
				if (commonTags.length > 0) {
					relatedByTags.add(otherItem.id);
				}
			}
		}
	}

	// Combine and score related items
	const scoredRelated = new Map();

	for (const id of relatedByCollection) {
		scoredRelated.set(id, (scoredRelated.get(id) || 0) + 10);
	}

	for (const id of relatedByAuthor) {
		scoredRelated.set(id, (scoredRelated.get(id) || 0) + 5);
	}

	for (const id of relatedByTags) {
		scoredRelated.set(id, (scoredRelated.get(id) || 0) + 3);
	}

	// Get top related items
	const sortedRelated = Array.from(scoredRelated.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, 10);

	// Fetch full item data for related items
	const relatedItems = sortedRelated.map(([id, score]) => {
		const canonicalPath = manifest._id_index[id];
		const [cat, name] = canonicalPath.split('/');
		return {
			...manifest[cat][name],
			relevance_score: score,
		};
	});

	return json({
		data: {
			item,
			related: relatedItems,
		},
		meta: {
			total_related: relatedItems.length,
		},
	});
}

/**
 * Get random item(s)
 * @param {Request} req
 */
export async function getRandom(req) {
	const manifest = await getManifest();
	const category = req.params.category || 'all';
	const count = Math.min(parseInt(req.query.count) || 1, 10);

	let items;
	if (category === 'all') {
		items = [
			...Object.values(manifest.preset_settings),
			...Object.values(manifest.photo_packs),
			...Object.values(manifest.quote_packs),
		];
	} else {
		if (!manifest[category]) {
			return error(404, 'Category not found');
		}
		items = Object.values(manifest[category]);
	}

	// Fisher-Yates shuffle and take first 'count' items
	const shuffled = [...items];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}

	const randomItems = shuffled.slice(0, count);

	return json({
		data: count === 1 ? randomItems[0] : randomItems,
	});
}
