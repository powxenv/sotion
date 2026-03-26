import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Link } from "@tanstack/react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiMagicIcon,
  ArrowUpRight01Icon,
  BubbleChatIcon,
  Link01Icon,
  Logout01Icon,
  Notion02Icon,
} from "@hugeicons/core-free-icons";
import { useSuspenseQuery } from "@tanstack/react-query";
import { authClient } from "#/lib/auth-client";
import { getSessionOptions } from "#/services/auth/funcs";
import { useTransition } from "react";
import ThemeToggle from "./theme-toggle";
import { Spinner } from "./ui/spinner";

const Header = () => {
  const { data: session } = useSuspenseQuery(getSessionOptions());
  const [isSignInPending, startSignIn] = useTransition();
  const [isSignOutPending, startSignOut] = useTransition();

  const signIn = async () => {
    startSignIn(async () => {
      await authClient.signIn.social({
        provider: "notion",
      });
    });
  };

  const signOut = async () => {
    startSignOut(async () => {
      await authClient.signOut();
    });
  };

  return (
    <header className="border-b">
      <div className="inner">
        <div className="h-14 flex items-center justify-between">
          <span>Sotion</span>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            {session ? (
              <>
                <Button
                  nativeButton={false}
                  className="justify-start text-muted-foreground"
                  variant="ghost"
                  render={<Link to="/app" />}
                >
                  <HugeiconsIcon icon={BubbleChatIcon} />
                  <span>Chat</span>
                </Button>

                <Button
                  nativeButton={false}
                  className="justify-start text-muted-foreground"
                  variant="ghost"
                  render={<Link to="/" />}
                >
                  <HugeiconsIcon icon={Link01Icon} />
                  <span>Social Connections</span>
                </Button>

                <Button
                  nativeButton={false}
                  className="justify-start text-muted-foreground"
                  variant="ghost"
                  render={<Link to="/app/providers" />}
                >
                  <HugeiconsIcon icon={AiMagicIcon} />
                  <span>AI Providers</span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                      />
                    }
                  >
                    <Avatar>
                      <AvatarImage
                        src={session.user.image || ""}
                        alt={session.user.name}
                      />
                      <AvatarFallback>
                        {session.user.name?.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-fit">
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        render={
                          <a
                            href="https://notion.so"
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        }
                      >
                        Go to Notion <HugeiconsIcon icon={ArrowUpRight01Icon} />
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={signOut}
                        disabled={isSignOutPending}
                      >
                        {isSignOutPending ? (
                          <Spinner />
                        ) : (
                          <HugeiconsIcon icon={Logout01Icon} />
                        )}
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button onClick={signIn} disabled={isSignInPending}>
                  {isSignInPending ? (
                    <Spinner />
                  ) : (
                    <HugeiconsIcon icon={Notion02Icon} />
                  )}
                  Sign In with Notion
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
