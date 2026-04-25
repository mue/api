import { drizzle } from 'drizzle-orm/d1';

import * as schema from '@/db/schema';

export const getDB = (env) => drizzle(env.DB, { schema });
