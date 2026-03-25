import Header from "#/components/header";
import { getSessionOptions } from "#/lib/funcs/auth.funcs";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout")({
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    await context.queryClient.ensureQueryData(getSessionOptions());
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
