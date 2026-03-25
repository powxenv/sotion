import Header from "#/components/header";
import { getSessionOptions } from "#/services/auth/funcs";
import { getNotionMcpStatusOptions } from "#/services/notion-mcp/funcs";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout")({
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    const session =
      await context.queryClient.ensureQueryData(getSessionOptions());
    if (session) {
      await context.queryClient.ensureQueryData(getNotionMcpStatusOptions());
    }
  },
});

function RouteComponent() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}
