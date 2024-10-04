import { Button } from "@v1/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@v1/ui/dialog";

interface UnsubscribeWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  unsubscribeHref: string;
}

export function UnsubscribeWarningModal({
  isOpen,
  onClose,
  unsubscribeHref,
}: UnsubscribeWarningModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Active Subscription</DialogTitle>
          <DialogDescription>
            You have an active subscription. To delete your account, you need to
            unsubscribe first.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <a href={unsubscribeHref} target="_blank" rel="noopener noreferrer">
            <Button>Go to Unsubscribe Page</Button>
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
