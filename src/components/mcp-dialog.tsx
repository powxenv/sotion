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
            Reconnect Workspace
          </DialogTitle>
          <DialogDescription className="space-y-3">
            <p>Your Notion workspace is no longer connected.</p>
            <p>
              Reconnect it so Sotion can keep accessing your pages and continue
              working with your workspace.
            </p>
            <p>
              <a
                href="https://developers.notion.com/guides/mcp/mcp"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Learn more about Notion MCP
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
              Reconnect Workspace
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
