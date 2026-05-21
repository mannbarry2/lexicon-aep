import { useState, useMemo } from "react";
import { TermWithMetadata } from "@shared/schema";

// Helper function to strip HTML tags for search / emptiness checks
function stripHtml(html: string): string {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html || "";
  return tmp.textContent || tmp.innerText || "";
}

// A definition shorter than this (after stripping HTML) is treated as a stub.
const STUB_LENGTH = 25;

// Matches the "[New Term Dropzone]" / "New Term Dropzone" category.
const DROPZONE_RE = /drop\s*zone/i;

import { Button } from "@/components/ui/button";
import { Trash, CheckCircle2, Search, Image as ImageIcon, ImageOff, FileX, Inbox, FilterX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type CategoryFilter = string; // "all" | "__uncategorized" | <category name>
type DefinitionFilter = "all" | "has" | "empty" | "stub";
type ImageFilter = "all" | "with" | "without";
type TypeFilter = "all" | "current" | "legacy";

const ALL = "all";
const UNCATEGORIZED = "__uncategorized";

export function TermBulkActions({ terms, onBulkActionComplete }: TermBulkActionsProps) {
  const { toast } = useToast();
  const [selectedTermIds, setSelectedTermIds] = useState<number[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // --- Filter state ---
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(ALL);
  const [definitionFilter, setDefinitionFilter] = useState<DefinitionFilter>(ALL);
  const [imageFilter, setImageFilter] = useState<ImageFilter>(ALL);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(ALL);

  // --- Per-term derived helpers ---
  const definitionLength = (term: TermWithMetadata) =>
    stripHtml(term.definition).trim().length;
  const imageCount = (term: TermWithMetadata) => term.images?.length ?? 0;
  const inDropzone = (term: TermWithMetadata) =>
    term.categories.some((c) => DROPZONE_RE.test(c.name));

  // Unique, sorted category names across all terms (includes the drop zone).
  const categoryNames = useMemo(() => {
    const names = new Set<string>();
    terms.forEach((t) => t.categories.forEach((c) => names.add(c.name)));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [terms]);

  const dropzoneCategoryName = useMemo(
    () => categoryNames.find((n) => DROPZONE_RE.test(n)),
    [categoryNames],
  );

  // --- Filtering ---
  const filteredTerms = useMemo(() => {
    return terms.filter((term) => {
      // Text search (name, definition, category names)
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          term.name.toLowerCase().includes(q) ||
          stripHtml(term.definition).toLowerCase().includes(q) ||
          term.categories.some((c) => c.name.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Category
      if (categoryFilter === UNCATEGORIZED) {
        if (term.categories.length > 0) return false;
      } else if (categoryFilter !== ALL) {
        if (!term.categories.some((c) => c.name === categoryFilter)) return false;
      }

      // Definition completeness
      const defLen = definitionLength(term);
      if (definitionFilter === "empty" && defLen !== 0) return false;
      if (definitionFilter === "has" && defLen === 0) return false;
      if (definitionFilter === "stub" && !(defLen > 0 && defLen < STUB_LENGTH))
        return false;

      // Images
      const imgs = imageCount(term);
      if (imageFilter === "with" && imgs === 0) return false;
      if (imageFilter === "without" && imgs > 0) return false;

      // Type (current vs legacy)
      if (typeFilter === "current" && term.isLegacy) return false;
      if (typeFilter === "legacy" && !term.isLegacy) return false;

      return true;
    });
  }, [terms, searchQuery, categoryFilter, definitionFilter, imageFilter, typeFilter]);

  // --- Workflow counts (computed against the full set, not the filtered view) ---
  const counts = useMemo(
    () => ({
      total: terms.length,
      dropzone: terms.filter(inDropzone).length,
      noDefinition: terms.filter((t) => definitionLength(t) === 0).length,
      stub: terms.filter((t) => {
        const l = definitionLength(t);
        return l > 0 && l < STUB_LENGTH;
      }).length,
      noImage: terms.filter((t) => imageCount(t) === 0).length,
    }),
    [terms],
  );

  const activeFilterCount =
    (searchQuery ? 1 : 0) +
    (categoryFilter !== ALL ? 1 : 0) +
    (definitionFilter !== ALL ? 1 : 0) +
    (imageFilter !== ALL ? 1 : 0) +
    (typeFilter !== ALL ? 1 : 0);

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter(ALL);
    setDefinitionFilter(ALL);
    setImageFilter(ALL);
    setTypeFilter(ALL);
  };

  // --- Selection (operates on the currently filtered view) ---
  const filteredIds = useMemo(() => filteredTerms.map((t) => t.id), [filteredTerms]);
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedTermIds.includes(id));

  const selectAllFiltered = () => {
    setSelectedTermIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
  };

  const clearSelections = () => setSelectedTermIds([]);

  const toggleTermSelection = (termId: number, checked: boolean) => {
    setSelectedTermIds((prev) =>
      checked
        ? prev.includes(termId)
          ? prev
          : [...prev, termId]
        : prev.filter((id) => id !== termId),
    );
  };

  // --- Delete mutation ---
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
      setSelectedTermIds([]);
      queryClient.invalidateQueries({ queryKey: ["/api/terms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/terms/by-category"] });
      if (onBulkActionComplete) onBulkActionComplete();
    },
    onError: (error) => {
      console.error("Error deleting terms:", error);
      toast({
        title: "Error",
        description: "Failed to delete terms. Please try again.",
        variant: "destructive",
      });
    },
  });

  const confirmDelete = () => {
    setShowDeleteDialog(false);
    deleteMutation.mutate(selectedTermIds);
  };

  // --- Quick-filter chips: one click jumps to a common editing workflow ---
  interface QuickFilter {
    key: string;
    label: string;
    count: number;
    icon: typeof Inbox;
    active: boolean;
    disabled?: boolean;
    apply: () => void;
  }

  const quickFilters: QuickFilter[] = [
    {
      key: "dropzone",
      label: "In drop zone",
      count: counts.dropzone,
      icon: Inbox,
      active: !!dropzoneCategoryName && categoryFilter === dropzoneCategoryName,
      disabled: !dropzoneCategoryName,
      apply: () => {
        if (!dropzoneCategoryName) return;
        setCategoryFilter((c) =>
          c === dropzoneCategoryName ? ALL : dropzoneCategoryName,
        );
      },
    },
    {
      key: "no-definition",
      label: "Needs a definition",
      count: counts.noDefinition,
      icon: FileX,
      active: definitionFilter === "empty",
      apply: () =>
        setDefinitionFilter((d) => (d === "empty" ? ALL : "empty")),
    },
    {
      key: "stub",
      label: "Stub definitions",
      count: counts.stub,
      icon: FileX,
      active: definitionFilter === "stub",
      apply: () => setDefinitionFilter((d) => (d === "stub" ? ALL : "stub")),
    },
    {
      key: "no-image",
      label: "Missing an image",
      count: counts.noImage,
      icon: ImageOff,
      active: imageFilter === "without",
      apply: () => setImageFilter((i) => (i === "without" ? ALL : "without")),
    },
  ];

  return (
    <div className="mb-6">
      {/* Bulk action controls */}
      <div className="flex flex-wrap gap-2 mb-4 items-center justify-between">
        <div className="text-sm text-gray-600">
          {selectedTermIds.length > 0
            ? `${selectedTermIds.length} term${selectedTermIds.length > 1 ? "s" : ""} selected`
            : `Select terms to delete from the list below`}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={selectAllFiltered}>
            <CheckCircle2 className="mr-1 h-4 w-4" />
            Select All ({filteredTerms.length})
          </Button>

          {selectedTermIds.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={clearSelections}>
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

      {/* Quick-filter chips for common editing workflows */}
      <div className="flex flex-wrap gap-2 mb-3">
        {quickFilters.map((qf) => {
          const Icon = qf.icon;
          return (
            <button
              key={qf.key}
              type="button"
              onClick={qf.apply}
              disabled={qf.disabled}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                qf.disabled && "opacity-40 cursor-not-allowed",
                qf.active
                  ? "border-primary bg-primary text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {qf.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  qf.active ? "bg-white/25" : "bg-gray-100 text-gray-600",
                )}
              >
                {qf.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Search terms..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            <SelectItem value={UNCATEGORIZED}>Uncategorized</SelectItem>
            {categoryNames.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={definitionFilter}
          onValueChange={(v) => setDefinitionFilter(v as DefinitionFilter)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Definition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any definition</SelectItem>
            <SelectItem value="has">Has a definition</SelectItem>
            <SelectItem value="empty">Empty / missing</SelectItem>
            <SelectItem value="stub">Stub (&lt; {STUB_LENGTH} chars)</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={imageFilter}
          onValueChange={(v) => setImageFilter(v as ImageFilter)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Images" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any images</SelectItem>
            <SelectItem value="with">Has image(s)</SelectItem>
            <SelectItem value="without">No images</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as TypeFilter)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            <SelectItem value="current">Current</SelectItem>
            <SelectItem value="legacy">Legacy</SelectItem>
          </SelectContent>
        </Select>

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <FilterX className="mr-1 h-4 w-4" />
            Clear filters ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Terms table */}
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      selectAllFiltered();
                    } else {
                      // Deselect only the rows currently in view
                      setSelectedTermIds((prev) =>
                        prev.filter((id) => !filteredIds.includes(id)),
                      );
                    }
                  }}
                />
              </TableHead>
              <TableHead className="w-[300px]">Term</TableHead>
              <TableHead>Definition</TableHead>
              <TableHead className="w-[150px]">Categories</TableHead>
              <TableHead className="w-[90px]">Images</TableHead>
              <TableHead className="w-[80px]">Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTerms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-gray-500 py-8">
                  No terms match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredTerms.map((term) => {
                const defLen = definitionLength(term);
                const imgs = imageCount(term);
                return (
                  <TableRow
                    key={term.id}
                    className={selectedTermIds.includes(term.id) ? "bg-gray-50" : ""}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedTermIds.includes(term.id)}
                        onCheckedChange={(checked) =>
                          toggleTermSelection(term.id, checked === true)
                        }
                      />
                    </TableCell>
                    <TableCell className="font-medium">{term.name}</TableCell>
                    <TableCell className="text-sm">
                      {defLen === 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                          <FileX className="h-3.5 w-3.5" />
                          No definition
                        </span>
                      ) : (
                        <div
                          className={cn(defLen < STUB_LENGTH && "text-amber-700")}
                          dangerouslySetInnerHTML={{
                            __html:
                              term.definition.length > 100
                                ? `${term.definition.substring(0, 100)}...`
                                : term.definition,
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {term.categories.length === 0 ? (
                        <span className="text-xs text-gray-400 italic">none</span>
                      ) : (
                        term.categories.map((cat) => (
                          <span
                            key={cat.id}
                            className="inline-block bg-primary/10 text-primary text-xs px-2 py-1 rounded mr-1 mb-1 font-medium"
                          >
                            {cat.name}
                          </span>
                        ))
                      )}
                    </TableCell>
                    <TableCell>
                      {imgs > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700">
                          <ImageIcon className="h-3.5 w-3.5" />
                          {imgs}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          <ImageOff className="h-3.5 w-3.5" />
                          none
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div
                        className={cn(
                          "w-3 h-6 rounded-sm inline-block",
                          term.isLegacy ? "bg-orange-500" : "bg-primary",
                        )}
                        title={term.isLegacy ? "Legacy" : "Current"}
                      ></div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Count indicator */}
      <div className="mt-4 text-center text-sm text-gray-500">
        Displaying {filteredTerms.length} of {counts.total} terms
        {activeFilterCount > 0 && " (filtered)"}
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
