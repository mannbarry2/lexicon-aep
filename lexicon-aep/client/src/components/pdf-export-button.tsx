import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileText, BookOpen, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface PDFExportButtonProps {
  className?: string;
}

/** Decode a base64 PDF payload and trigger a browser download. */
function downloadBase64Pdf(base64: string, filename: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function PDFExportButton({ className }: PDFExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [percent, setPercent] = useState(0);
  const [stage, setStage] = useState("Starting…");
  const [finished, setFinished] = useState(false);
  const { toast } = useToast();
  const esRef = useRef<EventSource | null>(null);

  // Tidy up the SSE connection if the component unmounts mid-export.
  useEffect(() => {
    return () => esRef.current?.close();
  }, []);

  const handleExport = () => {
    if (isExporting) return;
    setIsExporting(true);
    setFinished(false);
    setPercent(0);
    setStage("Starting…");

    const es = new EventSource(`/api/export/pdf/stream?t=${Date.now()}`);
    esRef.current = es;

    es.addEventListener("progress", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        setPercent(data.percent ?? 0);
        setStage(data.stage ?? "Working…");
      } catch {
        /* ignore malformed frame */
      }
    });

    es.addEventListener("complete", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        downloadBase64Pdf(data.base64, data.filename || "adobe-aep-lexicon.pdf");
        setPercent(100);
        setStage("Done");
        setFinished(true);
        toast({
          title: "Book ready",
          description: "Your AEP Lexicon PDF has downloaded.",
        });
      } catch {
        toast({
          title: "Export failed",
          description: "The PDF was generated but could not be downloaded.",
          variant: "destructive",
        });
      } finally {
        es.close();
        esRef.current = null;
        setTimeout(() => setIsExporting(false), 1200);
      }
    });

    es.addEventListener("error", (e) => {
      // A server-sent `error` frame carries data; a transport drop does not.
      const data = (e as MessageEvent).data;
      es.close();
      esRef.current = null;
      setIsExporting(false);
      if (!finished) {
        let message = "There was an error generating the PDF. Please try again.";
        try {
          if (data) message = JSON.parse(data).message || message;
        } catch {
          /* keep default */
        }
        toast({ title: "Export failed", description: message, variant: "destructive" });
      }
    });
  };

  return (
    <>
      <Button
        onClick={handleExport}
        variant="outline"
        size="sm"
        className={cn("bg-[#2563eb] text-white hover:bg-[#2563eb]/90 border-0", className)}
        disabled={isExporting}
      >
        <FileText className="h-4 w-4 mr-2" />
        {isExporting ? "Generating…" : "Export to PDF"}
      </Button>

      <Dialog open={isExporting}>
        <DialogContent
          className="sm:max-w-md [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {finished ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <BookOpen className="h-5 w-5 text-[#2563eb]" />
              )}
              {finished ? "Your book is ready" : "Generating your book"}
            </DialogTitle>
            <DialogDescription>
              {finished
                ? "The PDF has downloaded to your device."
                : "Typesetting the AEP Lexicon — this usually takes under a minute."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-[#2563eb] transition-all duration-500 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-gray-600">{stage}</span>
              <span className="font-medium tabular-nums text-gray-900">{percent}%</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
