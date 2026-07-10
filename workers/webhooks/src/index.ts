import { Hono } from 'hono';
import { Env } from '../../shared/types.js';

export const webhooksRouter = new Hono<{ Bindings: Env }>();

webhooksRouter.post('/paystack', async (c) => {
  return c.text('Phase 3 - Paystack/Stripe integration');
});

webhooksRouter.post('/stripe', async (c) => {
  return c.text('Phase 3 - Paystack/Stripe integration');
});

export default webhooksRouter;
