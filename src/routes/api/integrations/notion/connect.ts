import { createFileRoute } from "@tanstack/react-router";
import { beginNotionMcpConnection } from "#/services/notion-mcp/service";

export const Route = createFileRoute("/api/integrations/notion/connect")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const returnTo =
          new URL(request.url).searchParams.get("returnTo") || undefined;
        const result = await beginNotionMcpConnection(request, returnTo);

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
