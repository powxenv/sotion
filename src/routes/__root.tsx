import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "#/components/ui/sonner";

import TanStackQueryProvider from "../integrations/tanstack-query/root-provider";

import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";

import appCss from "../styles.css?url";

import type { QueryClient } from "@tanstack/react-query";

interface MyRouterContext {
  queryClient: QueryClient;
}

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`;

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Sotion | Social Content Assistant for Notion",
      },
      {
        name: "description",
        content:
          "Sotion helps you turn your Notion workspace into ready-to-post social content, with planning, writing, and publishing support in one place.",
      },
      {
        name: "theme-color",
        content: "#ffffff",
      },
      {
        property: "og:title",
        content: "Sotion | Social Content Assistant for Notion",
      },
      {
        property: "og:description",
        content:
          "Connect Notion, chat naturally, and let Sotion help you plan, write, and publish social content from one workspace.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:image",
        content: "/android-chrome-512x512.png",
      },
      {
        name: "twitter:card",
        content: "summary",
      },
      {
        name: "twitter:title",
        content: "Sotion | Social Content Assistant for Notion",
      },
      {
        name: "twitter:description",
        content:
          "Connect Notion, add your AI provider, and use Sotion to plan, write, and publish social content in one place.",
      },
      {
        name: "twitter:image",
        content: "/android-chrome-512x512.png",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        sizes: "32x32",
        type: "image/png",
        href: "/favicon-32x32.png",
      },
      {
        rel: "icon",
        sizes: "16x16",
        type: "image/png",
        href: "/favicon-16x16.png",
      },
      {
        rel: "shortcut icon",
        href: "/favicon.ico",
      },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "manifest",
        href: "/manifest.json",
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="light">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased wrap-anywhere">
        <TooltipProvider>
          <TanStackQueryProvider>
            {/* <Header /> */}
            {children}
            <Toaster />
            <TanStackDevtools
              config={{
                position: "bottom-right",
              }}
              plugins={[
                {
                  name: "Tanstack Router",
                  render: <TanStackRouterDevtoolsPanel />,
                },
                TanStackQueryDevtools,
              ]}
            />
          </TanStackQueryProvider>
        </TooltipProvider>
        <Scripts />
      </body>
    </html>
  );
}
