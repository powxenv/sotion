import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import type { NotionMcpStatus } from "#/services/notion-mcp/funcs";

type NotionMcpDialogProps = {
  status: NotionMcpStatus;
};

export default function McpDialog({ status }: NotionMcpDialogProps) {
  if (status.connected || !status.hasConnectedBefore) {
    return null;
  }

  return (
    <Dialog open>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Reconnect Notion
          </DialogTitle>
          <DialogDescription className="space-y-3">
            <p>
              Sotion can no longer reach your Notion workspace.
            </p>
            <p>
              Reconnect it so Sotion can keep using your notes, drafts, and
              content plans.
            </p>
            <p>
              <a
                href="https://developers.notion.com/guides/mcp/mcp"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Learn how the Notion connection works
              </a>
              .
            </p>
          </DialogDescription>
          {status.lastError ? (
            <p className="text-xs text-destructive">{status.lastError}</p>
          ) : null}
        </DialogHeader>
        <DialogFooter>
          {!status.connected || status.authorizationRequired ? (
            <Button
              nativeButton={false}
              render={
                <a href="/api/integrations/notion/connect?returnTo=/app" />
              }
            >
              Reconnect Notion
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
