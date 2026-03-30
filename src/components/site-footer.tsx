import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";

type SiteFooterProps = {
  className?: string;
};

export function SiteFooter({ className }: SiteFooterProps) {
  return (
    <footer
      className={
        className ?? "border-t px-6 py-5 text-sm text-muted-foreground sm:px-10"
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between inner">
        <p>&copy; {new Date().getFullYear()} Sotion. All rights reserved.</p>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <a
            className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
            href="https://github.com/powxenv/sotion"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
            <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-4" />
          </a>
          <Link className="transition-colors hover:text-foreground" to="/terms">
            Terms of Service
          </Link>
          <Link
            className="transition-colors hover:text-foreground"
            to="/privacy"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
