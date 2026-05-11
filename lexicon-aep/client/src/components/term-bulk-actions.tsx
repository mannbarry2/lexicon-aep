import { useState } from "react";
import { TermWithMetadata } from "@shared/schema";

// Helper function to strip HTML tags for search
function stripHtml(html: string): string {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}
import { Button } from "@/components/ui/button";
import { Trash, X, CheckCircle2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TermWithComponent extends TermWithMetadata {
  component: React.ReactNode;
}

interface TermBulkActionsProps {
  terms: TermWithComponent[];
  onBulkActionComplete?: () => void;
}

export function TermBulkActions({ terms, onBulkActionComplete }: TermBulkActionsProps) {
  const { toast } = useToast();
  const [selectedTermIds, setSelectedTermIds] = useState<number[]>([]);
  const [selectionMode, setSelectionMode] = useState(true); // Default to selection mode
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // We're no longer using selection mode toggle since we always stay in selection mode
  // But keeping the function signature in case we need to reimplement it later
  const toggleSelectionMode = () => {
    // No longer needed as we're always in selection mode
  };

  // Toggle selection of a term
  const toggleTermSelection = (termId: number) => {
    setSelectedTermIds(prev => {
      if (prev.includes(termId)) {
        return prev.filter(id => id !== termId);
      } else {
        return [...prev, termId];
      }
    });
  };

  // Select all terms
  const selectAll = () => {
    setSelectedTermIds(terms.map(term => term.id));
  };

  // Clear all selections
  const clearSelections = () => {
    setSelectedTermIds([]);
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (termIds: number[]) => {
      return await apiRequest("POST", "/api/terms/bulk-delete", { ids: termIds });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Successfully deleted ${selectedTermIds.length} terms`,
        variant: "default",
      });
      
      // Clear selections and maintain selection mode
      setSelectedTermIds([]);
      
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/terms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/terms/by-category"] });
      
      // Call the completion callback if provided
      if (onBulkActionComplete) {
        onBulkActionComplete();
      }
    },
    onError: (error) => {
      console.error("Error deleting terms:", error);
      toast({
        title: "Error",
        description: "Failed to delete terms. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle deletion confirmation
  const confirmDelete = () => {
    setShowDeleteDialog(false);
    deleteMutation.mutate(selectedTermIds);
  };

  return (
    <div className="mb-6">
      {/* Bulk action controls */}
      <div className="flex flex-wrap gap-2 mb-4 items-center justify-between">
        <div className="text-sm text-gray-600">
          {selectedTermIds.length > 0
            ? `${selectedTermIds.length} term${selectedTermIds.length > 1 ? 's' : ''} selected`
            : `Select terms to delete from the list below`}
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={selectAll}
          >
            <CheckCircle2 className="mr-1 h-4 w-4" />
            Select All
          </Button>
          
          {selectedTermIds.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelections}
              >
                Clear
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                disabled={deleteMutation.isPending}
              >
                <Trash className="mr-1 h-4 w-4" />
                Delete Selected ({selectedTermIds.length})
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Search input */}
      <div className="mb-4 flex items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Search terms..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Terms table */}
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox 
                  checked={terms.length > 0 && selectedTermIds.length === terms.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      selectAll();
                    } else {
                      clearSelections();
                    }
                  }}
                />
              </TableHead>
              <TableHead className="w-[300px]">Term</TableHead>
              <TableHead>Definition</TableHead>
              <TableHead className="w-[150px]">Categories</TableHead>
              <TableHead className="w-[100px]">Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {terms
              .filter(term => {
                if (!searchQuery) return true;
                
                const query = searchQuery.toLowerCase().trim();
                
                // Search in term name
                if (term.name.toLowerCase().includes(query)) return true;
                
                // Search in term definition (strip HTML)
                if (stripHtml(term.definition).toLowerCase().includes(query)) return true;
                
                // Search in categories
                if (term.categories.some(cat => cat.name.toLowerCase().includes(query))) return true;
                
                // If no match found
                return false;
              })
              .map(term => (
                <TableRow key={term.id} className={selectedTermIds.includes(term.id) ? "bg-gray-50" : ""}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedTermIds.includes(term.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          if (!selectedTermIds.includes(term.id)) {
                            setSelectedTermIds(prev => [...prev, term.id]);
                          }
                        } else {
                          setSelectedTermIds(prev => prev.filter(id => id !== term.id));
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{term.name}</TableCell>
                  <TableCell className="text-sm">
                    <div dangerouslySetInnerHTML={{ 
                      __html: term.definition.length > 100 
                        ? `${term.definition.substring(0, 100)}...` 
                        : term.definition 
                    }} />
                  </TableCell>
                  <TableCell>
                    {term.categories.map(cat => (
                      <span key={cat.id} className="inline-block bg-primary/10 text-primary text-xs px-2 py-1 rounded mr-1 mb-1 font-medium">
                        {cat.name}
                      </span>
                    ))}
                  </TableCell>
                  <TableCell>
                    <div className={cn(
                      "w-3 h-6 rounded-sm inline-block",
                      term.isLegacy ? "bg-orange-500" : "bg-primary"
                    )}></div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Count indicator */}
      <div className="mt-4 text-center text-sm text-gray-500">
        {searchQuery ? (
          <>
            Displaying {terms.filter(term => {
              const query = searchQuery.toLowerCase().trim();
              if (term.name.toLowerCase().includes(query)) return true;
              if (stripHtml(term.definition).toLowerCase().includes(query)) return true;
              if (term.categories.some(cat => cat.name.toLowerCase().includes(query))) return true;
              return false;
            }).length} of {terms.length} terms
          </>
        ) : (
          <>Displaying {terms.length} terms</>
        )}
      </div>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedTermIds.length} selected terms? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}