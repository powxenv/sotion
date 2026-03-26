import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { completeNotionMcpConnection } from "#/services/notion-mcp/server";

function buildErrorRedirect(request: Request, message: string) {
  const url = new URL("/app", request.url);
  url.searchParams.set("notionMcpError", message);
  return Response.redirect(url, 302);
}

export const Route = createFileRoute("/api/integrations/notion/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });

        if (!session) {
          return new Response("Unauthorized", { status: 401 });
        }

        const url = new URL(request.url);
        const error = url.searchParams.get("error");
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state") || undefined;

        if (error) {
          return buildErrorRedirect(request, error);
        }

        if (!code) {
          return buildErrorRedirect(request, "missing_code");
        }

        try {
          const returnTo = await completeNotionMcpConnection({
            userId: session.user.id,
            origin: url.origin,
            authorizationCode: code,
            callbackState: state,
          });
          return Response.redirect(new URL(returnTo, request.url), 302);
        } catch (callbackError) {
          console.error("Notion MCP callback failed", callbackError);
          return buildErrorRedirect(request, "authorization_failed");
        }
      },
    },
  },
});
