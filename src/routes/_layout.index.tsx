import { Button } from "#/components/ui/button";
import { getSessionOptions } from "#/services/auth/funcs";
import { Video01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/")({
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    const session =
      await context.queryClient.ensureQueryData(getSessionOptions());
    if (session) {
      throw redirect({ to: "/app" });
    }
  },
});

function RouteComponent() {
  return (
    <>
      <main className="py-20 h-[calc(100lvh-57px)]">
        <div className="inner">
          <div className="max-w-lg mx-auto flex flex-col items-center">
            <h1 className="text-5xl font-bold mb-2">Meet the night shift.</h1>
            <p className="mt-2 mb-4">
              Notion agents keep work moving 24/7. They capture knowledge,
              answer questions, and push projects forward—all while you sleep.
            </p>
            <div className="flex gap-2">
              <Button>Get Started</Button>
              <Button variant="secondary">
                <HugeiconsIcon icon={Video01Icon} />
                See Demo
              </Button>
            </div>
          </div>

          <img
            className="w-full border mt-12 rounded-lg shadow-2xl shadow-black/6"
            src="/demo.png"
            alt="Demo Image"
          />
        </div>
      </main>
    </>
  );
}
