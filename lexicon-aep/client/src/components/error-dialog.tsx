import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ErrorDialogProps {
  title: string;
  description: string;
  open: boolean;
  onClose: () => void;
}

export function ErrorDialog({ 
  title, 
  description, 
  open, 
  onClose 
}: ErrorDialogProps) {
  const [isOpen, setIsOpen] = useState(open);

  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  const handleClose = () => {
    // Only allow explicit button click to close the dialog
    setIsOpen(false);
    onClose();
  };
  
  // This ensures only the Dismiss button can close the dialog,
  // not clicking outside or pressing Escape key
  const handleOpenChange = (open: boolean) => {
    // Only allow closing via the Dismiss button
    if (open === false) {
      return; // Prevent dialog from closing except through our button
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange} modal={true}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-end">
          <Button
            type="button"
            className="bg-[#2563eb] hover:bg-[#2563eb]/90 text-white"
            onClick={handleClose}
          >
            Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}