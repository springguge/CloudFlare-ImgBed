import { validateSession } from './utils/auth/sessionManager.js';
import { fetchSecurityConfig } from './utils/sysConfig.js';

export async function onRequest(context) {
  return requireAdminPageSession(context);
}

export async function requireAdminPageSession(context) {
  const { request, env } = context;
  const securityConfig = await fetchSecurityConfig(env);
  const adminUsername = securityConfig.auth?.admin?.adminUsername;
  const adminPassword = securityConfig.auth?.admin?.adminPassword;
  const adminRequired = !!(adminUsername && adminUsername.trim()) || !!(adminPassword && adminPassword.trim());

  if (!adminRequired) {
    return context.next();
  }

  const sessionResult = await validateSession(env, request, 'admin');
  if (sessionResult.valid) {
    return context.next();
  }

  const url = new URL(request.url);
  return Response.redirect(`${url.origin}/adminLogin`, 302);
}
