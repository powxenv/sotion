import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { beginNotionMcpConnection } from "#/services/notion-mcp/funcs";

export const Route = createFileRoute("/api/integrations/notion/connect")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });

        if (!session) {
          return new Response("Unauthorized", { status: 401 });
        }

        const returnTo =
          new URL(request.url).searchParams.get("returnTo") || undefined;
        const result = await beginNotionMcpConnection({
          userId: session.user.id,
          origin: new URL(request.url).origin,
          returnTo,
        });

        if (result.type === "redirect" && result.authorizationUrl) {
          return Response.redirect(result.authorizationUrl, 302);
        }

        if (result.type === "redirect") {
          return new Response("Notion MCP authorization could not be started.", {
            status: 500,
          });
        }

        return Response.redirect(new URL(result.redirectTo, request.url), 302);
      },
    },
  },
});
