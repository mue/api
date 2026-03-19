import { Hono } from 'hono';

import marketplace from '@/v1/marketplace/index';
import images from '@/v1/images';
import quotes from '@/v1/quotes';
import news from '@/v1/news';

export default new Hono()
  .get('/', (c) => c.text('Hello World! API docs: https://muetab.com/docs/api/introduction'))
  .route('/', marketplace)
  .route('/images', images)
  .route('/quotes', quotes)
  .get('/news', (c) => c.json({ news }));
