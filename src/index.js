import { instrument } from '@microlabs/otel-cf-workers';
import handler from './handler';

const config = (env) => ({
	exporter: {
		headers: { 'x-api-key': env.BASELIME_API_KEY },
		url: 'https://otel.baselime.io/v1',
	},
	service: { name: 'mue' },
});

export default instrument(handler, config);