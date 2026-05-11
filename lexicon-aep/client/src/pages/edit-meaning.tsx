import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { SearchBar } from "@/components/search-bar";
import { ErrorDialog } from "@/components/error-dialog";
import { TermWithMetadata, Category, updateTermSchema, UpdateTermInput } from "@shared/schema";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Edit, Trash2, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { termLinkCSS, getQuillConfig, formatTermLink } from '@/lib/term-link';
import { TermLinkDialog } from '@/components/term-link-dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function EditMeaning() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [errorDialog, setErrorDialog] = useState({
    open: false,
    title: "",
    description: ""
  });
  
  // Get term ID from URL parameters if present
  const urlParams = new URLSearchParams(window.location.search);
  const termIdFromUrl = urlParams.get('term');
  
  // Set the initial selected term ID from URL parameters
  const [selectedTermId, setSelectedTermId] = useState<number | null>(
    termIdFromUrl ? parseInt(termIdFromUrl) : null
  );
  
  const [editDialogOpen, setEditDialogOpen] = useState(!!termIdFromUrl);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  
  // Redirect if not admin
  if (!isAdmin) {
    setLocation("/");
    return null;
  }

  // Fetch terms with search support
  const { data: searchResults, isLoading: isSearching } = useQuery<TermWithMetadata[]>({
    queryKey: ["/api/terms/search", { search: searchQuery }],
    enabled: searchQuery.length > 0,
  });

  // Fetch the selected term details
  const { data: selectedTerm, isLoading: isLoadingTerm } = useQuery<TermWithMetadata>({
    queryKey: [`/api/terms/${selectedTermId}`],
    enabled: !!selectedTermId,
  });

  // Fetch all categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Fetch all terms for the current term selection
  const { data: terms = [] } = useQuery<{id: number, name: string}[]>({
    queryKey: ["/api/terms/names"],
  });

  // Handler for search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Delete term mutation
  const { mutate: deleteTerm, isPending: isDeleting } = useMutation({
    mutationFn: async (termId: number) => {
      return await apiRequest("DELETE", `/api/terms/${termId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/terms"] });
      toast({
        title: "Term deleted",
        description: "The term has been deleted successfully.",
      });
      setSelectedTermId(null);
      setDeleteAlertOpen(false);
    },
    onError: (error) => {
      setErrorDialog({
        open: true,
        title: "Error deleting term",
        description: error.message || "Failed to delete term. Please try again."
      });
      setDeleteAlertOpen(false);
    },
  });

  return (
    <Layout>
      {/* Error Dialog for Delete Operations */}
      <ErrorDialog
        title={errorDialog.title}
        description={errorDialog.description}
        open={errorDialog.open}
        onClose={() => setErrorDialog({ ...errorDialog, open: false })}
      />
      
      <div className="py-6">
        {/* Search Bar */}
        <SearchBar 
          onSearch={handleSearch} 
          title="Edit Meaning" 
          placeholder="Search for terms to edit..."
        />

        {/* Content Area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          {searchQuery.length > 0 ? (
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Search Results</h3>
              
              {isSearching ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : !searchResults || searchResults.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No terms found matching "{searchQuery}"</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.map((term) => (
                    <Card key={term.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="py-4 px-5">
                        <CardTitle className="text-lg">{term.name}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {term.definition}
                        </CardDescription>
                      </CardHeader>
                      <CardFooter className="py-3 px-5 bg-gray-50 flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedTermId(term.id);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => {
                            setSelectedTermId(term.id);
                            setDeleteAlertOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <h3 className="text-xl font-medium text-gray-900">Search for terms to edit</h3>
              <p className="mt-2 text-gray-500">
                Use the search bar above to find terms you want to modify.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Term Dialog */}
      {selectedTerm && (
        <EditTermDialog 
          term={selectedTerm}
          categories={categories}
          terms={terms}
          isOpen={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}

      {/* Delete Term Alert Dialog */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the term and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => selectedTermId && deleteTerm(selectedTermId)}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

interface EditTermDialogProps {
  term: TermWithMetadata;
  categories: Category[];
  terms: {id: number, name: string}[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function EditTermDialog({ term, categories, terms, isOpen, onOpenChange }: EditTermDialogProps) {
  const { toast } = useToast();
  const [errorDialog, setErrorDialog] = useState({
    open: false,
    title: "",
    description: ""
  });
  const [selectedCurrentTerm, setSelectedCurrentTerm] = useState<number | null>(
    term.currentTermId
  );
  
  // State for term link dialog
  const [showTermLinkDialog, setShowTermLinkDialog] = useState(false);
  const [termLinkPosition, setTermLinkPosition] = useState({ top: 0, left: 0 });
  const [quillInstance, setQuillInstance] = useState<any>(null);
  const [quillSelection, setQuillSelection] = useState<any>(null);
  
  // Get available terms for linking
  const { data: termNames = [] } = useQuery<{id: number, name: string, slug: string}[]>({
    queryKey: ["/api/terms/names"],
  });

  // Create form with term data
  const form = useForm<UpdateTermInput>({
    resolver: zodResolver(updateTermSchema),
    defaultValues: {
      name: term.name,
      definition: term.definition,
      isLegacy: term.isLegacy,
      currentTermId: term.currentTermId,
      categories: term.categories.map(c => c.name),
    },
  });

  // Watch for isLegacy changes
  const isLegacy = form.watch("isLegacy");
  
  // Add CSS for term links to the document
  useEffect(() => {
    // Add the CSS for term links
    const styleElement = document.createElement('style');
    styleElement.textContent = termLinkCSS;
    document.head.appendChild(styleElement);
    
    // Cleanup on unmount
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  
  // Handle term-link button click event
  useEffect(() => {
    const handleTermLinkButtonClick = (event: any) => {
      const { selection, quill } = event.detail;
      
      // Open the dialog at the position of the selection
      const range = selection;
      if (range) {
        const bounds = quill.getBounds(range.index);
        const editorElem = quill.container.querySelector('.ql-editor');
        const editorRect = editorElem.getBoundingClientRect();
        
        setTermLinkPosition({
          top: bounds.top + editorRect.top + window.scrollY + 30, // add some offset
          left: bounds.left + editorRect.left + window.scrollX
        });
        
        setQuillInstance(quill);
        setQuillSelection(selection);
        setShowTermLinkDialog(true);
      }
    };
    
    // Add event listener
    document.addEventListener('term-link-button-clicked', handleTermLinkButtonClick);
    
    // Clean up
    return () => {
      document.removeEventListener('term-link-button-clicked', handleTermLinkButtonClick);
    };
  }, []);
  
  // Handle term selection from the dialog
  const handleTermSelect = (termId: number, termName: string, slug: string) => {
    if (quillInstance && quillSelection) {
      // Format the term link
      formatTermLink(quillInstance, termId, termName, slug);
      
      // Close the dialog
      setShowTermLinkDialog(false);
      
      // Focus back on the editor
      quillInstance.focus();
    }
  };

  // Update term mutation
  const { mutate: updateTerm, isPending: isUpdating } = useMutation({
    mutationFn: async (data: UpdateTermInput) => {
      return await apiRequest("PATCH", `/api/terms/${term.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/terms"] });
      queryClient.invalidateQueries({ queryKey: [`/api/terms/${term.id}`] });
      toast({
        title: "Term updated",
        description: "The term has been updated successfully.",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      setErrorDialog({
        open: true,
        title: "Error updating term",
        description: error.message || "Failed to update term. Please try again."
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: UpdateTermInput) => {
    // If legacy is selected and a current term is selected, update the currentTermId
    if (isLegacy && selectedCurrentTerm) {
      data.currentTermId = selectedCurrentTerm;
    } else if (!isLegacy) {
      data.currentTermId = null;
    }
    
    updateTerm(data);
  };

  return (
    <>
      {/* Error Dialog for Update Operations */}
      <ErrorDialog 
        title={errorDialog.title}
        description={errorDialog.description}
        open={errorDialog.open}
        onClose={() => setErrorDialog({ ...errorDialog, open: false })}
      />
      
      {/* Term Link Dialog */}
      {showTermLinkDialog && (
        <TermLinkDialog 
          position={termLinkPosition}
          onClose={() => setShowTermLinkDialog(false)}
          onSelect={handleTermSelect}
        />
      )}
      
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 rounded-lg border-0 shadow-lg">
          <DialogHeader className="pb-4 border-b mb-6">
            <DialogTitle className="text-xl font-semibold text-gray-900">Edit Term</DialogTitle>
            <DialogDescription className="text-gray-600 mt-1">
              Make changes to the term definition, categories, or status.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">Term Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                      />
                    </FormControl>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="definition"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel className="text-gray-700 font-medium">Definition</FormLabel>
                    <FormControl>
                      <div className="rounded-md border border-gray-300 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
                        <ReactQuill 
                          theme="snow"
                          value={field.value}
                          onChange={field.onChange}
                          className="min-h-[250px]"
                          modules={{
                            toolbar: {
                              container: [
                                [{ 'header': [1, 2, 3, false] }],
                                ['bold', 'italic', 'underline', 'strike'],
                                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                [{ 'indent': '-1'}, { 'indent': '+1' }],
                                ['link'],
                                ['clean']
                              ]
                            }
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs text-gray-500 mt-1">
                      Use the toolbar to format your text, add links, and create lists.
                    </FormDescription>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isLegacy"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-200 p-4 bg-gray-50">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base font-medium text-gray-700">Legacy AdobeSpeak</FormLabel>
                      <FormDescription className="text-gray-600">
                        Mark if this is a Legacy AdobeSpeak term that is no longer current or has been replaced.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-[#0E76A8]"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {isLegacy && (
                <div className="p-5 rounded-lg border border-gray-200 bg-gray-50">
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Current AdobeSpeak Reference</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Select the Current AdobeSpeak term that replaces this Legacy AdobeSpeak term.
                  </p>
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-md mb-3">
                    <p className="text-sm text-orange-800">
                      <strong>Pro Tip:</strong> Make sure to add the Current AdobeSpeak term before adding a Legacy AdobeSpeak term that references it. This way, you can properly connect legacy terms to their current replacements.
                    </p>
                  </div>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal rounded-md border-gray-300"
                      >
                        {selectedCurrentTerm
                          ? terms.find(t => t.id === selectedCurrentTerm)?.name || "Select a Current AdobeSpeak term"
                          : "Select a Current AdobeSpeak term"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 rounded-md border border-gray-200 shadow-lg" align="start" side="bottom">
                      <Command>
                        <CommandInput placeholder="Search Current AdobeSpeak terms..." className="border-0 focus:ring-0" />
                        <CommandList>
                          <CommandEmpty>No terms found</CommandEmpty>
                          <CommandGroup>
                            {terms
                              .filter(t => t.id !== term.id) // Filter out the current term
                              .map((t) => (
                                <CommandItem
                                  key={t.id}
                                  value={t.name}
                                  onSelect={() => setSelectedCurrentTerm(t.id)}
                                  className="hover:bg-gray-100 cursor-pointer"
                                >
                                  {t.name}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div className="p-5 rounded-lg border border-gray-200 bg-gray-50">
                <div className="mb-4">
                  <h3 className="text-base font-medium text-gray-700">Categories</h3>
                  <p className="text-gray-600 text-sm">
                    Select all categories that apply to this term.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categories.map((category) => {
                    const currentCategories = form.getValues("categories") || [];
                    const isSelected = currentCategories.includes(category.name);
                    
                    return (
                      <div
                        key={category.id}
                        className="flex flex-row items-center space-x-3 space-y-0 rounded-md bg-white p-3 border border-gray-200 cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          // Get fresh values right at click time
                          const values = [...(form.getValues("categories") || [])];
                          const checked = values.includes(category.name);
                          
                          // Update the form
                          form.setValue(
                            "categories",
                            checked
                              ? values.filter(c => c !== category.name)
                              : [...values, category.name]
                          );
                          
                          // Force component update (without relying on watch/render cycle)
                          form.trigger("categories");
                        }}
                      >
                        <div className={`h-5 w-5 rounded border flex items-center justify-center ${isSelected ? 'bg-[#0E76A8] border-[#0E76A8]' : 'border-gray-300'}`}>
                          {isSelected && (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </div>
                        <span className="font-medium text-gray-700 text-sm cursor-pointer flex-1">
                          {category.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                {/* Show selected categories */}
                <div className="mt-4 p-3 bg-gray-200 rounded border border-gray-300">
                  <h4 className="font-medium text-sm mb-2">Selected Categories:</h4>
                  <div className="flex flex-wrap gap-2">
                    {(form.getValues("categories") || []).length > 0 ? (
                      (form.getValues("categories") || []).map((cat, i) => (
                        <span key={i} className="px-2 py-1 bg-[#0E76A8] text-white rounded-full text-sm font-medium">
                          {cat}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500">No categories selected</span>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-8 pt-4 border-t flex items-center justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="px-4 py-2 rounded-md"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdating}
                  className="bg-[#0E76A8] hover:bg-[#0E76A8]/90 text-white px-4 py-2 rounded-md"
                >
                  {isUpdating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}