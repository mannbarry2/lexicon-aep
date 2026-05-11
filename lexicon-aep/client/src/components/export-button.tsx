import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportTermsToCSV } from "@/lib/exportUtils";
import { TermWithMetadata } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ExportButtonProps {
  className?: string;
  categoryId?: number;
  categoryName?: string;
}

export function ExportButton({ className, categoryId, categoryName }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    if (isExporting) return; // Prevent multiple clicks
    setIsExporting(true);
    
    try {
      // Force a fresh fetch with a cache-busting timestamp
      const timestamp = new Date().getTime();
      let url = `/api/terms/export?t=${timestamp}`;
      
      // Add category filter if provided
      console.log("Export button clicked with props:", { categoryId, categoryName });
      
      if (categoryId) {
        url += `&categoryId=${categoryId}`;
        console.log(`Adding category filter to URL: ${url}`);
      }
      
      console.log(`Fetching terms from: ${url}`);
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error(`Server returned error: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to fetch terms: ${response.status} ${response.statusText}`);
      }
      
      const terms = await response.json();
      
      if (!Array.isArray(terms)) {
        console.error('Server returned invalid data format:', terms);
        throw new Error('Server returned invalid data format');
      }
      
      // Log the number of terms found for debugging
      console.log(`Received ${terms.length} terms from server for CSV export`);
      
      if (terms.length === 0) {
        toast({
          title: "No Terms Found",
          description: "There are no terms to export.",
          variant: "default",
        });
        setIsExporting(false);
        return;
      }
      
      // Export terms to CSV with category info in filename if applicable
      const filename = categoryName 
        ? `adobe-aep-terms-${categoryName.toLowerCase().replace(/\s+/g, '-')}.csv` 
        : 'adobe-aep-terms.csv';
      
      // Run the export
      const exportResult = exportTermsToCSV(terms, filename);
      
      if (exportResult) {
        toast({
          title: "Export Successful",
          description: `${terms.length} terms exported to CSV${categoryName ? ` from category: ${categoryName}` : ''}.`,
        });
      } else {
        throw new Error("CSV generation failed");
      }
    } catch (error: any) {
      console.error("Export failed:", error);
      
      let errorMessage = "Failed to export terms. Please try again.";
      
      // Add more detailed error message if available
      if (error?.message) {
        errorMessage = `Export failed: ${error.message}`;
      }
      
      toast({
        title: "Export Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      variant="default"
      size="sm"
      className={cn("btn-business btn-business-primary", className)}
      disabled={isExporting}
    >
      <Download className="h-4 w-4 mr-2" />
      {isExporting ? "Exporting..." : "Export to CSV"}
    </Button>
  );
}