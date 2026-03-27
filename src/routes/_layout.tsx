import Header from "#/components/header";
import { SiteFooter } from "#/components/site-footer";
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
    <div className="flex min-h-lvh flex-col">
      <Header />
      <div className="flex-1">
        <Outlet />
      </div>
      <div className="inner w-full">
        <SiteFooter />
      </div>
    </div>
  );
}
