import { getRequestHeaders, getRequestUrl } from "@tanstack/react-start/server";

export function getServerRequest() {
  return new Request(getRequestUrl(), {
    headers: getRequestHeaders(),
  });
}
