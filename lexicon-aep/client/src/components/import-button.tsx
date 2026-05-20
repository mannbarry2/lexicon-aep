import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";
import { parseCSV, importTerms, ImportResult, isImportResult } from "@/lib/importUtils";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ErrorOverlay } from "@/components/error-overlay";

interface ImportButtonProps {
  className?: string;
  onImportComplete?: () => void;
}

export function ImportButton({ className, onImportComplete }: ImportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalTerms, setTotalTerms] = useState(0);
  const [importedTerms, setImportedTerms] = useState(0);
  const [importResult, setImportResult] = useState<{message: string, isError: boolean} | null>(null);
  const [parsedTerms, setParsedTerms] = useState<any[]>([]);
  const [pendingImport, setPendingImport] = useState(false);
  const [fileInput, setFileInput] = useState<HTMLInputElement | null>(null);
  const [showErrorOverlay, setShowErrorOverlay] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) return;
    setFileInput(event.target);
    
    // Check file type
    if (!file.name.endsWith('.csv')) {
      const errorMessage = "Please select a CSV file. Only .csv files are supported.";
      setImportResult({
        message: errorMessage,
        isError: true
      });
      setPendingImport(true);
      
      // Also show the error overlay for file type errors
      setTimeout(() => {
        setShowErrorOverlay(true);
      }, 100);
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const csvContent = e.target?.result as string;
        const terms = parseCSV(csvContent);
        
        if (terms.length === 0) {
          const errorMessage = "No terms found in the CSV file.";
          setImportResult({
            message: errorMessage,
            isError: true
          });
          setPendingImport(true);
          
          // Use setTimeout to show the error overlay after state updates
          setTimeout(() => {
            setShowErrorOverlay(true);
          }, 100);
          return;
        }
        
        // Store parsed terms for later use after confirmation
        setParsedTerms(terms);
        // Initialize totalTerms to 0 to indicate we haven't started importing yet
        setTotalTerms(0);
        
        // Set pending import with message about what will be imported
        setImportResult({
          message: `Ready to import ${terms.length} terms. Please review and confirm to proceed.`,
          isError: false
        });
        setPendingImport(true);
        
      } catch (error) {
        // Show parsing error in the dialog
        const errorMessage = "The CSV file format is invalid or contains errors.";
        console.error("CSV parsing error:", error);
        
        setImportResult({
          message: errorMessage,
          isError: true
        });
        setPendingImport(true);
        
        // Use setTimeout to show the error overlay after state updates
        setTimeout(() => {
          setShowErrorOverlay(true);
        }, 100);
      }
    };
    
    reader.readAsText(file);
  };
  
  // Function to handle the actual import after confirmation
  const handleConfirmImport = async () => {
    console.log("handleConfirmImport called");
    console.log("parsedTerms:", parsedTerms.length, "totalTerms:", totalTerms);
    
    if (parsedTerms.length === 0) {
      console.log("No terms to import, canceling");
      setPendingImport(false);
      return;
    }
    
    console.log("Starting import of", parsedTerms.length, "terms");
    // Set the total terms to the actual count now that we're starting the import
    setTotalTerms(parsedTerms.length);
    setIsImporting(true);
    setPendingImport(false);
    
    try {
      await importTerms(
        parsedTerms,
        (current, total) => {
          setImportedTerms(current);
          setProgress(Math.round((current / total) * 100));
        },
        () => {
          // Success callback
          setIsImporting(false);
          
          // Show completion message in the dialog instead of auto-closing
          setImportResult({
            message: `Successfully imported ${parsedTerms.length} terms.`,
            isError: false
          });
          setPendingImport(true);
          
          // Don't close dialog or reset state until user explicitly dismisses
          if (onImportComplete) {
            onImportComplete();
          }
        },
        (result: Error | ImportResult) => {
          // Error or completion with warnings callback
          setIsImporting(false);
          
          // Determine if this is an error result
          let isError = false;
          let message = "";
          
          // Use our type guard to check for ImportResult format
          if (isImportResult(result)) {
            message = result.message;
            isError = result.isError;
          } else if (result instanceof Error) {
            // Fallback for when it's a regular Error object
            message = result.message;
            isError = true;
          } else {
            // Unknown format
            message = "Import completed with an unknown result";
            isError = true;
          }
          
          // Set the import result
          setImportResult({
            message: message,
            isError: isError
          });
          
          // If it's an error, immediately show the overlay
          if (isError) {
            console.log("SHOWING ERROR OVERLAY FOR:", message);
            // Use setTimeout to ensure state updates happen in the right order
            setTimeout(() => {
              setShowErrorOverlay(true);
            }, 100);
          }
          
          setPendingImport(true);
          
          // Refresh data regardless of outcome
          if (onImportComplete) {
            onImportComplete();
          }
        }
      );
    } catch (error) {
      setIsImporting(false);
      
      const errorMessage = "An unexpected error occurred during import.";
      console.error("Import error:", error);
      
      setImportResult({
        message: errorMessage,
        isError: true
      });
      
      setPendingImport(true);
      
      // Also show the error overlay for unexpected errors
      setTimeout(() => {
        setShowErrorOverlay(true);
      }, 100);
    }
  };
  
  // Function to cancel import and reset state
  const handleCancelImport = () => {
    // For errors, show the error overlay
    if (importResult && importResult.isError) {
      setShowErrorOverlay(true);
      setIsOpen(false);
    } else {
      // Normal non-error cancellation
      setPendingImport(false);
      setImportResult(null);
      setParsedTerms([]);
      if (fileInput) fileInput.value = '';
      setFileInput(null);
      setIsOpen(false);
    }
  };
  
  // Handler for closing the error overlay
  const handleCloseErrorOverlay = () => {
    setShowErrorOverlay(false);
    // Now we can completely reset the state
    setPendingImport(false);
    setImportResult(null);
    setParsedTerms([]);
    if (fileInput) fileInput.value = '';
    setFileInput(null);
    
    // Also show a toast for good measure
    toast({
      title: "Import errors acknowledged",
      description: "You can try again with a corrected CSV file.",
      variant: "default",
    });
  };

  return (
    <>
      {/* Show error overlay when errors occur - this will be unmissable */}
      {showErrorOverlay && importResult && (
        <ErrorOverlay 
          message={importResult.message} 
          onClose={handleCloseErrorOverlay} 
        />
      )}
      
      <Dialog 
        open={isOpen} 
        onOpenChange={(open) => {
          // Absolutely prevent closing dialog when any operation is in progress or we have results
          if (!open && (isImporting || pendingImport || importResult)) {
            // Force dialog to stay open by ignoring close attempts
            return;
          }
          setIsOpen(open);
        }}
      >
        <DialogTrigger asChild>
          <Button
            variant="default"
            size="sm"
            className={`btn-business btn-business-primary ${className}`}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Terms
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Terms</DialogTitle>
            <DialogDescription>
              Upload a CSV file exported from AEP Lexicon to import terms.
              The file must have the same format as the exported CSV.
            </DialogDescription>
          </DialogHeader>
          
          {isImporting ? (
            // Import progress view
            <div className="py-6">
              <p className="mb-2 text-sm text-gray-500">
                Importing {importedTerms} of {totalTerms} terms...
              </p>
              <Progress value={progress} className="h-2" />
            </div>
          ) : pendingImport && importResult ? (
            // Import confirmation or error view
            <div className="py-6 space-y-4">
              <Alert 
                variant={importResult.isError ? "destructive" : "default"}
                className={`${importResult.isError ? 'bg-red-50 border-red-400 border-2' : ''} min-h-[150px] p-4`}
              >
                <div className="flex items-start gap-3">
                  {importResult.isError ? (
                    <AlertTriangle className="h-6 w-6 mt-0.5 text-red-600 flex-shrink-0" />
                  ) : (
                    <CheckCircle className="h-6 w-6 mt-0.5 text-green-600 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <AlertTitle 
                      className={`${importResult.isError ? 'text-red-600' : 'text-green-600'} text-lg font-bold mb-3`}
                      style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}
                    >
                      {importResult.isError 
                        ? "Import Error" 
                        : parsedTerms.length > 0 && totalTerms === 0 
                          ? "Import Preview" 
                          : "Import Complete"}
                    </AlertTitle>
                    <AlertDescription 
                      className="whitespace-pre-wrap break-words text-sm font-medium text-gray-700"
                      style={{ fontSize: '14px', lineHeight: '1.5' }}
                    >
                      {importResult.message}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            </div>
          ) : (
            // Initial file upload view
            <div className="flex flex-col gap-4 py-4">
              <p className="text-sm text-gray-500">
                The CSV file should contain columns for: ID, Term Name, Definition, Categories, 
                Category IDs, Is Legacy, Current Term, Current Term ID, Legacy Names, Legacy Term IDs, Upvotes, and Downvotes.
              </p>
              <p className="text-sm font-medium text-red-600">
                Warning: Importing a large number of terms may take some time.
              </p>
              <div className="flex items-center justify-center border-2 border-dashed border-gray-300 p-6 rounded-md">
                <label className="flex flex-col items-center cursor-pointer">
                  <Upload className="h-8 w-8 text-primary mb-2" />
                  <span className="text-sm font-medium text-gray-700">
                    Click to upload CSV
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    or drag and drop
                  </span>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={isImporting || pendingImport}
                  />
                </label>
              </div>
            </div>
          )}
          
          <DialogFooter className="sm:justify-end">
            {pendingImport && importResult ? (
              // Confirmation buttons for the pending import
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancelImport}
                >
                  {importResult.isError ? "Acknowledge Error" : "Done"}
                </Button>
                
                {/* Always show the appropriate button based on context */}
                {(() => {
                  console.log("Button render logic:", { 
                    parsedTerms: parsedTerms.length, 
                    totalTerms, 
                    condition: parsedTerms.length > 0 && totalTerms === 0,
                    message: importResult.message
                  });
                  
                  // If we have parsed terms but haven't started importing yet, show Proceed
                  if (parsedTerms.length > 0 && totalTerms === 0) {
                    console.log("Showing PROCEED button");
                    return (
                      <Button
                        type="button"
                        variant="default"
                        className="bg-[#2563eb] text-white hover:bg-[#2563eb]/90 border-0"
                        onClick={handleConfirmImport}
                      >
                        Proceed
                      </Button>
                    );
                  } else {
                    console.log("Showing CONTINUE button");
                    return (
                      <Button
                        type="button"
                        variant="default"
                        className={importResult.isError 
                          ? "bg-red-600 text-white hover:bg-red-700 border-0 font-medium text-base px-6" 
                          : "bg-[#2563eb] text-white hover:bg-[#2563eb]/90 border-0 font-medium text-base px-6"
                        }
                        onClick={handleCancelImport}
                      >
                        Continue
                      </Button>
                    );
                  }
                })()}
              </>
            ) : (
              // Default cancel button
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsOpen(false)}
                disabled={isImporting}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Cancel"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}