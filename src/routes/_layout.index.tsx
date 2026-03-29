import { Button } from "#/components/ui/button";
import { Spinner } from "#/components/ui/spinner";
import { authClient } from "#/lib/auth-client";
import { getSessionOptions } from "#/services/auth/funcs";
import { Video01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useTransition } from "react";

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
  const [isSigningIn, startSigningIn] = useTransition();

  const signIn = async () => {
    startSigningIn(async () => {
      await authClient.signIn.social({
        provider: "notion",
      });
    });
  };

  return (
    <>
      <main className="min-h-[calc(100lvh-57px)] py-20">
        <div className="inner">
          <div className="mx-auto flex max-w-lg flex-col items-center">
            <h1 className="mb-2 text-center text-5xl font-bold">
              Turn your Notion workspace into social content.
            </h1>
            <p className="mt-2 mb-4 text-center">
              Sotion helps you turn notes, ideas, and drafts into ready-to-post
              content. Connect Notion, chat in plain language, and keep your
              workflow in one place.
            </p>
            <div className="flex gap-2">
              <Button onClick={signIn} disabled={isSigningIn}>
                {isSigningIn ? <Spinner /> : null}
                Start with Notion
              </Button>
              <Button
                nativeButton={false}
                variant="secondary"
                render={<a href="#product-preview" />}
              >
                <HugeiconsIcon icon={Video01Icon} />
                See Demo
              </Button>
            </div>
          </div>

          <img
            id="product-preview"
            className="mt-12 w-full rounded-lg border shadow-2xl shadow-black/6"
            src="/demo.jpg"
            alt="Sotion workspace preview"
          />
        </div>
      </main>
    </>
  );
}
