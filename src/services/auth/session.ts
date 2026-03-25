import { auth } from "#/lib/auth";

export async function getSessionForRequest(request: Request) {
  return auth.api.getSession({ headers: request.headers });
}

export async function requireSession(request: Request) {
  const session = await getSessionForRequest(request);

  if (!session) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return session;
}
