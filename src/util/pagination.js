import { HTTPException } from 'hono/http-exception';

export default function paginate(data, query) {
  if (query.offset) {
    if (!query.limit) {
      throw new HTTPException(400, { message: 'Page limit is required for pagination' });
    }

    const limit = parseInt(query.limit);
    const offset = parseInt(query.offset);

    if (Number.isNaN(limit) || limit <= 0) {
      throw new HTTPException(400, { message: '`limit` must be a positive integer' });
    }
    if (Number.isNaN(offset) || offset < 0) {
      throw new HTTPException(400, { message: '`offset` must be a non-negative integer' });
    }

    data = data.slice(offset, offset + limit);
  }

  return data;
}
