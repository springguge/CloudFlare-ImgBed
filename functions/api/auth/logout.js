import { destroySession } from "../../utils/auth/sessionManager.js";

export async function onRequestPost(context) {
    return logout(context);
}

export async function onRequestGet(context) {
    return logout(context);
}

async function logout(context) {
    const { request, env } = context;

    // Always clear every session cookie on logout. Some clients may hold both
    // admin_session and user_session, and leaving either one can make the next
    // navigation look like logout failed.
    const result = await destroySession(env, request);

    const headers = new Headers();
    if (Array.isArray(result)) {
        result.forEach(cookie => headers.append('Set-Cookie', cookie));
    } else {
        headers.set('Set-Cookie', result);
    }
    headers.set('Cache-Control', 'no-store');

    return new Response('Logged out', {
        status: 200,
        headers,
    });
}
