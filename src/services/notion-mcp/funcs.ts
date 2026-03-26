import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "#/lib/auth";
import {
  disconnectNotionMcpForUser,
  getNotionMcpStatusForUser,
} from "#/services/notion-mcp/server";

export type { NotionMcpStatus } from "#/services/notion-mcp/server";

export const getNotionMcpStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw new Response("Unauthorized", { status: 401 });
    }

    return getNotionMcpStatusForUser(session.user.id);
  },
);

export const disconnectNotionMcp = createServerFn({ method: "POST" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw new Response("Unauthorized", { status: 401 });
    }

    return disconnectNotionMcpForUser(session.user.id);
  },
);

export const getNotionMcpStatusOptions = () =>
  queryOptions({
    queryKey: ["notion-mcp-status"],
    queryFn: getNotionMcpStatus,
  });
