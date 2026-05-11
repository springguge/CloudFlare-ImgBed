import { validateSession } from './utils/auth/sessionManager.js';
import { fetchSecurityConfig } from './utils/sysConfig.js';

const PROTECTED_PAGE_PATHS = new Set([
  '/',
  '/dashboard',
  '/customerConfig',
  '/systemConfig',
]);

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (!PROTECTED_PAGE_PATHS.has(url.pathname)) {
    return context.next();
  }

  const securityConfig = await fetchSecurityConfig(context.env);
  const adminUsername = securityConfig.auth?.admin?.adminUsername;
  const adminPassword = securityConfig.auth?.admin?.adminPassword;
  const adminRequired = !!(adminUsername && adminUsername.trim()) || !!(adminPassword && adminPassword.trim());

  if (!adminRequired) {
    return context.next();
  }

  const sessionResult = await validateSession(context.env, context.request, 'admin');
  if (sessionResult.valid) {
    return context.next();
  }

  return Response.redirect(`${url.origin}/adminLogin`, 302);
}
