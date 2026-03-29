import Header from "#/components/header";
import { SiteFooter } from "#/components/site-footer";
import { getSessionOptions } from "#/services/auth/funcs";
import { getNotionMcpStatusOptions } from "#/services/notion-mcp/funcs";
import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";

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
  const location = useLocation();
  const hideFooter = location.pathname === "/app";

  return (
    <div className="flex min-h-lvh flex-col">
      <Header />
      <div className="flex-1">
        <Outlet />
      </div>
      {hideFooter ? null : (
        <div className="inner w-full">
          <SiteFooter />
        </div>
      )}
    </div>
  );
}
