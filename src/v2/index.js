import { Hono } from 'hono';

import marketplace from '@/v2/marketplace/index';
import images from '@/v2/images/index';
import weather from '@/v2/weather/index';
import quotes from '@/v2/quotes';
import sponsors from '@/v2/sponsors';

export default new Hono()
  .route('/marketplace', marketplace)
  .route('/images', images)
  .route('/', weather)
  .route('/quotes', quotes)
  .route('/sponsors', sponsors);
