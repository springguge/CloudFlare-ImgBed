import { requireAdminPageSession } from './dashboard.js';

export async function onRequest(context) {
  return requireAdminPageSession(context);
}
