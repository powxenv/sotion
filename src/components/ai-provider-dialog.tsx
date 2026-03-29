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
            Add an AI provider to continue
          </DialogTitle>
          <DialogDescription className="space-y-3">
            <p>
              Sotion needs at least one AI provider key before it can reply in
              chat.
            </p>
            <p>
              Open <strong>AI providers</strong> to add a key and finish your
              setup.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => navigate({ to: "/app/providers" })}>
            Open AI providers
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
