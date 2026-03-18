export const json = (data, init = {}) => Response.json(data, init);
export const error = (status, message) => Response.json({ error: message }, { status });
