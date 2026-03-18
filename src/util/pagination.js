export default function paginate(data, query) {
	if (query.offset) {
		if (!query.limit) {
			throw new Error('Page limit is required for pagination');
		}
		const limit = parseInt(query.limit);
		const offset = parseInt(query.offset);
		data = data.slice(offset, offset + limit);
	}
	return data;
}
