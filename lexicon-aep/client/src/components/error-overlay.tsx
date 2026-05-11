import React from 'react';
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

interface ErrorOverlayProps {
  message: string;
  onClose: () => void;
}

export function ErrorOverlay({ message, onClose }: ErrorOverlayProps) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-destructive text-destructive-foreground p-6 rounded-lg shadow-lg max-w-2xl w-full mx-4">
        <div className="flex items-start gap-4">
          <XCircle className="h-8 w-8 flex-shrink-0" />
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-2">Error Occurred</h2>
            <div className="mb-4 whitespace-pre-wrap">
              {message}
            </div>
            <Button 
              variant="secondary" 
              onClick={onClose}
              className="w-full md:w-auto"
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}