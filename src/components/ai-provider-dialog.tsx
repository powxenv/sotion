import { useNavigate } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";

type AiProviderDialogProps = {
  hasConfiguredProvider: boolean;
};

export default function AiProviderDialog({
  hasConfiguredProvider,
}: AiProviderDialogProps) {
  const navigate = useNavigate();

  if (hasConfiguredProvider) {
    return null;
  }

  return (
    <Dialog open>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Set Up AI Provider
          </DialogTitle>
          <DialogDescription className="space-y-3">
            <p>No AI provider API key is configured yet.</p>
            <p>
              Add at least one API key so Sotion can generate responses and use
              chat normally.
            </p>
            <p>
              Open the <strong>AI Providers</strong> menu in the header to add
              a key.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => navigate({ to: "/app/providers" })}>
            Open AI Providers
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
