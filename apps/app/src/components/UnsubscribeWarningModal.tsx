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
  onUnsubscribe: () => void;
}

export function UnsubscribeWarningModal({
  isOpen,
  onClose,
  onUnsubscribe,
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
          <Button onClick={onUnsubscribe}>Go to Unsubscribe Page</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
