import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getServerRequest } from "#/services/shared/request";
import {
  disconnectNotionMcpForRequest,
  getNotionMcpStatusForRequest,
} from "#/services/notion-mcp/service";

export const getNotionMcpStatus = createServerFn({ method: "GET" }).handler(
  async () => getNotionMcpStatusForRequest(getServerRequest()),
);

export const disconnectNotionMcp = createServerFn({ method: "POST" }).handler(
  async () => disconnectNotionMcpForRequest(getServerRequest()),
);

export const getNotionMcpStatusOptions = () =>
  queryOptions({
    queryKey: ["notion-mcp-status"],
    queryFn: getNotionMcpStatus,
  });
