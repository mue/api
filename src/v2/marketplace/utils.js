/* eslint-disable indent */

// Cache strategy: use stale-while-revalidate
const CACHE_CONFIG = {
	full: {
		cacheTtl: 3600,
		cacheEverything: true,
	},
	lite: {
		cacheTtl: 1800,
		cacheEverything: true,
	},
	search: {
		cacheTtl: 3600,
		cacheEverything: true,
	},
	stats: {
		cacheTtl: 1800,
		cacheEverything: true,
	},
};

/**
 * @param {Request} req
 */
export function getVersion(req) {
	const url = new URL(req.url);
	const path = url.pathname;
	let version = path.split('/')[1];
	if (!version.startsWith('v')) version = 1;
	else version = parseInt(version.slice(1));
	return version;
}

export async function getManifest(lite = false) {
	const url = lite
		? 'https://marketplace-data.muetab.com/manifest-lite.json'
		: 'https://marketplace-data.muetab.com/manifest.json?v=2';
	const manifest = await (
		await fetch(url, { cf: lite ? CACHE_CONFIG.lite : CACHE_CONFIG.full })
	).json();
	return manifest;
}

export async function getSearchIndex() {
	const index = await (
		await fetch('https://marketplace-data.muetab.com/search-index.json', {
			cf: CACHE_CONFIG.search,
		})
	).json();
	return index;
}

export async function getStats() {
	const stats = await (
		await fetch('https://marketplace-data.muetab.com/stats.json', { cf: CACHE_CONFIG.stats })
	).json();
	return stats;
}

/**
 * Resolve an identifier (name or stable ID) to a canonical path and object key
 * @param {Object} manifest - The marketplace manifest
 * @param {string} identifier - Either a name or stable ID
 * @param {string} category - The category to search in (optional)
 * @returns {Object|null} - { path: string, key: string } or null if not found
 */
export function resolveIdentifier(manifest, identifier, category = null) {
	// First check if it's a stable ID
	if (manifest._id_index && manifest._id_index[identifier]) {
		const canonicalPath = manifest._id_index[identifier];
		const [pathCategory, name] = canonicalPath.split('/');

		// If category is specified, ensure it matches
		if (category && pathCategory !== category) {
			return null;
		}

		return {
			category: pathCategory,
			key: name,
			path: canonicalPath,
		};
	}

	// Otherwise treat it as a name
	if (category) {
		// For items, check if the name exists in the specified category
		if (manifest[category] && manifest[category][identifier]) {
			return {
				category,
				key: identifier,
				path: `${category}/${identifier}`,
			};
		}
	} else {
		// For collections, check if the name exists
		if (manifest.collections && manifest.collections[identifier]) {
			return {
				category: 'collections',
				key: identifier,
				path: `collections/${identifier}`,
			};
		}
	}

	return null;
}

/**
 * Apply filters to items
 */
export function applyFilters(items, query) {
	let filtered = [...items];

	// Filter by tags
	if (query.tags) {
		const tags = Array.isArray(query.tags) ? query.tags : query.tags.split(',');
		filtered = filtered.filter(
			(item) => item.tags && tags.some((tag) => item.tags.includes(tag.toLowerCase())),
		);
	}

	// Filter by author
	if (query.author) {
		filtered = filtered.filter((item) => item.author.toLowerCase() === query.author.toLowerCase());
	}

	// Filter by language
	if (query.language) {
		filtered = filtered.filter(
			(item) => item.language && item.language.toLowerCase() === query.language.toLowerCase(),
		);
	}

	// Filter by date range
	if (query.date_from) {
		const fromDate = new Date(query.date_from);
		filtered = filtered.filter((item) => new Date(item.created_at) >= fromDate);
	}

	if (query.date_to) {
		const toDate = new Date(query.date_to);
		filtered = filtered.filter((item) => new Date(item.created_at) <= toDate);
	}

	// Filter by item count range
	if (query.min_items) {
		const min = parseInt(query.min_items);
		filtered = filtered.filter((item) => item.item_count >= min);
	}

	if (query.max_items) {
		const max = parseInt(query.max_items);
		filtered = filtered.filter((item) => item.item_count <= max);
	}

	// Filter by color (isDark/isLight)
	if (query.color_theme === 'dark') {
		filtered = filtered.filter((item) => item.isDark === true);
	} else if (query.color_theme === 'light') {
		filtered = filtered.filter((item) => item.isLight === true);
	}

	return filtered;
}

/**
 * Apply sorting to items
 */
export function applySorting(items, query) {
	const sortField = query.sort || 'newest';
	const sortOrder = query.order || 'desc';

	const sorted = [...items].sort((a, b) => {
		let comparison = 0;

		switch (sortField) {
			case 'newest':
				comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
				break;
			case 'oldest':
				comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
				break;
			case 'updated':
				comparison = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
				break;
			case 'name':
				comparison = a.display_name.localeCompare(b.display_name);
				break;
			case 'item_count':
				comparison = b.item_count - a.item_count;
				break;
			case 'popular':
				// Use collection membership as popularity metric
				comparison = b.in_collections.length - a.in_collections.length;
				break;
			default:
				comparison = 0;
		}

		return sortOrder === 'asc' ? -comparison : comparison;
	});

	return sorted;
}
