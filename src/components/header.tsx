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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "#/components/ui/sheet";
import { Link } from "@tanstack/react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiMagicIcon,
  AiBrain01Icon,
  ArrowUpRight01Icon,
  BubbleChatIcon,
  Link01Icon,
  Logout01Icon,
  Notion02Icon,
  Menu01Icon,
} from "@hugeicons/core-free-icons";
import { useSuspenseQuery } from "@tanstack/react-query";
import { authClient } from "#/lib/auth-client";
import { getSessionOptions } from "#/services/auth/funcs";
import { useState, useTransition } from "react";
import ThemeToggle from "./theme-toggle";
import { Spinner } from "./ui/spinner";

const navigationItems = [
  {
    to: "/app",
    label: "Chat",
    icon: BubbleChatIcon,
  },
  {
    to: "/app/socials",
    label: "Social Accounts",
    icon: Link01Icon,
  },
  {
    to: "/app/providers",
    label: "AI Providers",
    icon: AiMagicIcon,
  },
  {
    to: "/app/mcp",
    label: "Online Sources",
    icon: AiBrain01Icon,
  },
] as const;

const Header = () => {
  const { data: session } = useSuspenseQuery(getSessionOptions());
  const [isSignInPending, startSignIn] = useTransition();
  const [isSignOutPending, startSignOut] = useTransition();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const signIn = async () => {
    startSignIn(async () => {
      await authClient.signIn.social({
        provider: "notion",
      });
    });
  };

  const signOut = async () => {
    startSignOut(async () => {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: async () => {
            window.location.href = "/";
          },
        },
      });
    });
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const userInitials = session?.user.name?.slice(0, 2) ?? "SO";

  return (
    <header className="border-b fixed top-0 inset-x-0 z-50 bg-background/20 backdrop-blur-lg">
      <div className="inner">
        <div className="flex h-14 items-center justify-between gap-3">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <img src="/logo.png" alt="Sotion" className="size-6 object-cover" />
            <span className="font-medium">Sotion</span>
          </Link>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle />
            {session ? (
              <>
                <div className="hidden items-center gap-1 lg:flex">
                  {navigationItems.map((item) => (
                    <Button
                      key={item.to}
                      nativeButton={false}
                      className="justify-start text-muted-foreground"
                      variant="ghost"
                      render={<Link to={item.to} />}
                    >
                      <HugeiconsIcon icon={item.icon} />
                      <span>{item.label}</span>
                    </Button>
                  ))}

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
                        <AvatarFallback>{userInitials}</AvatarFallback>
                      </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
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
                          Open Notion{" "}
                          <HugeiconsIcon icon={ArrowUpRight01Icon} />
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
                </div>

                <div className="lg:hidden">
                  <Button
                    variant="ghost"
                    className="rounded-full px-1"
                    onClick={() => setIsMobileMenuOpen(true)}
                    aria-label="Open navigation menu"
                  >
                    <Avatar size="sm">
                      <AvatarImage
                        src={session.user.image || ""}
                        alt={session.user.name}
                      />
                      <AvatarFallback>{userInitials}</AvatarFallback>
                    </Avatar>
                    <HugeiconsIcon icon={Menu01Icon} />
                  </Button>
                  <Sheet
                    open={isMobileMenuOpen}
                    onOpenChange={setIsMobileMenuOpen}
                  >
                    <SheetContent side="right">
                      <SheetHeader className="border-b pb-4">
                        <SheetTitle>Navigation</SheetTitle>
                        <div className="flex items-center gap-1 pt-2">
                          <Avatar size="lg">
                            <AvatarImage
                              src={session.user.image || ""}
                              alt={session.user.name}
                            />
                            <AvatarFallback>{userInitials}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {session.user.name}
                            </p>
                            {session.user.email ? (
                              <p className="truncate text-sm text-muted-foreground">
                                {session.user.email}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </SheetHeader>

                      <div className="flex flex-1 flex-col gap-2 p-4">
                        {navigationItems.map((item) => (
                          <Button
                            key={item.to}
                            nativeButton={false}
                            variant="ghost"
                            className="w-full justify-start text-muted-foreground"
                            render={<Link to={item.to} />}
                            onClick={closeMobileMenu}
                          >
                            <HugeiconsIcon icon={item.icon} />
                            <span>{item.label}</span>
                          </Button>
                        ))}

                        <Button
                          nativeButton={false}
                          variant="outline"
                          className="mt-3"
                          render={
                            <a
                              href="https://notion.so"
                              target="_blank"
                              rel="noopener noreferrer"
                            />
                          }
                          onClick={closeMobileMenu}
                        >
                          Open Notion
                          <HugeiconsIcon icon={ArrowUpRight01Icon} />
                        </Button>

                        <Button
                          variant="destructive"
                          className="mt-auto"
                          onClick={() => {
                            closeMobileMenu();
                            void signOut();
                          }}
                          disabled={isSignOutPending}
                        >
                          {isSignOutPending ? (
                            <Spinner />
                          ) : (
                            <HugeiconsIcon icon={Logout01Icon} />
                          )}
                          Log out
                        </Button>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </>
            ) : (
              <Button onClick={signIn} disabled={isSignInPending} size="sm">
                {isSignInPending ? (
                  <Spinner />
                ) : (
                  <HugeiconsIcon icon={Notion02Icon} />
                )}
                <span className="hidden sm:inline">Continue with Notion</span>
                <span className="sm:hidden">Sign in</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
