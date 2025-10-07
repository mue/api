/* eslint-disable indent */
// Re-export all marketplace functionality from modular files
export {
	getCollection,
	getCollections,
	getCurator,
	getCurators,
	getFeatured,
} from './marketplace/collections.js';

export { getItem, incrementItemView, getItems } from './marketplace/items-basic.js';

export { getRelatedItems, getRandom } from './marketplace/items-advanced.js';

export { search, batchGetItems } from './marketplace/search.js';

export { getGlobalStats, getCategoryStats, getTrending, getRecent } from './marketplace/stats.js';
