import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTermSchema, CreateTermInput, Category } from "@shared/schema";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Upload, X, Loader2, ImageIcon, Link as LinkIcon } from "lucide-react";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { termLinkCSS, getQuillConfig, formatTermLink } from '@/lib/term-link';
import { TermLinkDialog } from '@/components/term-link-dialog';
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function AddWord() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageCaption, setImageCaption] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // State for term link dialog
  const [showTermLinkDialog, setShowTermLinkDialog] = useState(false);
  const [termLinkPosition, setTermLinkPosition] = useState({ top: 0, left: 0 });
  const [quillInstance, setQuillInstance] = useState<any>(null);
  const [quillSelection, setQuillSelection] = useState<any>(null);

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Fetch all terms for the current term selection
  const { data: terms = [] } = useQuery<{id: number, name: string}[]>({
    queryKey: ["/api/terms/names"],
  });

  const form = useForm<CreateTermInput>({
    resolver: zodResolver(createTermSchema),
    defaultValues: {
      name: "",
      definition: "",
      isLegacy: false,
      currentTermId: null,
      categories: [],
    },
  });

  // Add new category mutation
  const { mutate: addCategory, isPending: isAddingCategory } = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest("POST", "/api/categories", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setNewCategory("");
      toast({
        title: "Category added",
        description: "The new category has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error adding category",
        description: error.message || "Failed to add category. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Add term mutation
  const { mutate: addTerm, isPending: isAddingTerm } = useMutation({
    mutationFn: async (data: CreateTermInput) => {
      const response = await apiRequest("POST", "/api/terms", data);
      return await response.json();
    },
    onSuccess: async (response) => {
      // Get the newly created term ID from the response
      const newTermId = response?.id;
      
      // Upload image if available and term ID is returned
      if (newTermId && imageFile) {
        try {
          setIsUploading(true);
          const formData = new FormData();
          formData.append("image", imageFile);
          if (imageCaption) {
            formData.append("caption", imageCaption);
          }

          const uploadResponse = await fetch(`/api/terms/${newTermId}/images`, {
            method: "POST",
            body: formData,
          });

          if (!uploadResponse.ok) {
            throw new Error("Failed to upload image");
          }
          
          toast({
            title: "Image uploaded",
            description: "The image has been uploaded successfully.",
          });
        } catch (err) {
          console.error("Error uploading image:", err);
          toast({
            title: "Image upload failed",
            description: "The term was created but the image could not be uploaded.",
            variant: "destructive",
          });
        } finally {
          setIsUploading(false);
          setImageFile(null);
          setImageCaption("");
          setPreviewUrl(null);
          setUploadDialogOpen(false);
        }
      }
      
      // Invalidate all related term queries to ensure updated data
      queryClient.invalidateQueries({ queryKey: ["/api/terms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/terms/names"] });
      queryClient.invalidateQueries({ queryKey: ["/api/terms/export"] });
      
      // Show success message
      toast({
        title: "Term added",
        description: "The new term has been added successfully.",
      });
      
      // Reset form
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error adding term",
        description: error.message || "Failed to add term. Please try again.",
        variant: "destructive",
      });
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
  
  // Handle term selection from the dialog
  const handleTermSelect = (termId: number, termName: string, slug: string) => {
    if (quillInstance && quillSelection) {
      // Format the selected text as a term link
      formatTermLink(quillInstance, termId, termName, slug);
      
      // Close the dialog
      setShowTermLinkDialog(false);
      
      // Focus back on the editor
      quillInstance.focus();
    }
  };

  // Handle form submission
  const onSubmit = (data: CreateTermInput) => {
    // If legacy is selected and a current term is selected, add the currentTermId
    if (isLegacy && selectedTerm) {
      data.currentTermId = selectedTerm;
    } else {
      data.currentTermId = null;
    }
    
    addTerm(data);
  };

  // Handle adding a new category
  const handleAddCategory = () => {
    if (newCategory.trim()) {
      addCategory(newCategory.trim());
    }
  };
  
  // Handle file selection for image upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setImageFile(file);
      
      // Create and set preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle image upload form submission (will be used after term is created)
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) {
      toast({
        title: "No image selected",
        description: "Please select an image to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    // Note: The actual upload will happen after the term is created
  };

  return (
    <Layout>
      {/* Term Link Dialog - Temporarily disabled */}
      
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Add New Term</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Term Information</CardTitle>
                  <CardDescription>
                    Add a new term to the Adobe AEP Termbase.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md mb-4">
                    <p className="text-sm text-green-800">
                      <strong>Pro Tip:</strong> Make sure to add the Current AdobeSpeak term first before adding the Legacy AdobeSpeak term that references it. This way, you can properly connect the legacy term to its current replacement.
                    </p>
                  </div>
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
                                placeholder="e.g. Experience Data Model (XDM)" 
                                className="rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription className="text-gray-600">
                              The name of the technical term or acronym.
                            </FormDescription>
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
                                  placeholder="Enter a clear, concise definition..."
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
                                  ref={(el) => {
                                    // Store the Quill instance for term linking
                                    if (el && el.getEditor) {
                                      setQuillInstance(el.getEditor());
                                    }
                                  }}
                                />
                              </div>
                            </FormControl>
                            <FormDescription className="text-gray-600 mt-1">
                              Provide a comprehensive explanation of the term. Use the toolbar to format your text, add links, and create lists.
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
                        <div className="p-5 rounded-lg border border-gray-500 bg-gray-100">
                          <h4 className="font-medium text-base text-gray-900 mb-2">Current AdobeSpeak Reference</h4>
                          <p className="text-sm text-gray-800 mb-3">
                            Select the Current AdobeSpeak term that replaces this Legacy AdobeSpeak term.
                          </p>
                          
                          <div className="mt-2 mb-4">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between p-3 bg-white border-2 border-gray-400 rounded-md text-gray-900 focus:border-black"
                                >
                                  {selectedTerm
                                    ? terms.find(term => term.id === selectedTerm)?.name
                                    : "-- Select a Current AdobeSpeak term --"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-0">
                                <Command>
                                  <CommandInput placeholder="Search for a Current AdobeSpeak term..." />
                                  <CommandEmpty>No term found.</CommandEmpty>
                                  <CommandGroup>
                                    <CommandList>
                                      {terms.map((term) => (
                                        <CommandItem
                                          key={term.id}
                                          value={term.name}
                                          onSelect={() => {
                                            setSelectedTerm(term.id);
                                          }}
                                        >
                                          {term.name}
                                        </CommandItem>
                                      ))}
                                    </CommandList>
                                  </CommandGroup>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <div className="mt-2 text-sm font-medium">
                              {selectedTerm 
                                ? `Selected: ${terms.find(t => t.id === selectedTerm)?.name}` 
                                : "No term selected"}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="p-5 rounded-lg border border-gray-500 bg-gray-100">
                        <h3 className="text-base font-medium text-gray-900 mb-2">Categories</h3>
                        <p className="text-sm text-gray-800 mb-4">
                          Select all categories that apply to this term.
                        </p>
                        
                        <div className="space-y-3">
                          {categories.map((category) => {
                            // Get current values without form.watch
                            const currentCategories = form.getValues("categories") || [];
                            const isSelected = currentCategories.includes(category.name);
                            
                            return (
                              <div 
                                key={category.id} 
                                className="flex items-center gap-2 p-3 rounded bg-white border border-gray-300 cursor-pointer hover:bg-gray-50"
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
                                <div className={`h-5 w-5 rounded border flex items-center justify-center ${isSelected ? 'border-[#0E76A8]' : 'border-gray-300'}`} style={{ backgroundColor: isSelected ? '#0E76A8' : 'transparent' }}>
                                  {isSelected && (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-4 h-4">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                  )}
                                </div>
                                <span className="font-medium text-gray-800 text-sm cursor-pointer flex-1">
                                  {category.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        
                        <div className="mt-4 p-3 bg-gray-200 rounded border border-gray-400">
                          <h4 className="font-medium text-sm mb-2">Selected Categories:</h4>
                          <div className="flex flex-wrap gap-2">
                            {(form.getValues("categories") || []).length > 0 ? (
                              (form.getValues("categories") || []).map((cat, index) => (
                                <span 
                                  key={index} 
                                  className="px-2 py-1 text-white rounded-full text-sm font-medium"
                                  style={{ backgroundColor: "#0E76A8" }}
                                >
                                  {cat}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-500">No categories selected</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-5 rounded-lg border border-gray-500 bg-gray-100 mt-6">
                        <h3 className="text-base font-medium text-gray-900 mb-2">Term Image</h3>
                        <p className="text-sm text-gray-800 mb-4">
                          Attach a screenshot or image to illustrate this term.
                        </p>
                        
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setUploadDialogOpen(true)}
                            className="flex items-center gap-2"
                          >
                            <Upload className="h-4 w-4" />
                            <span>{imageFile ? "Change Image" : "Add Image"}</span>
                          </Button>
                          
                          {imageFile && (
                            <Button
                              type="button"
                              variant="destructive"
                              onClick={() => {
                                setImageFile(null);
                                setImageCaption("");
                                setPreviewUrl(null);
                              }}
                              className="flex items-center gap-2"
                            >
                              <X className="h-4 w-4" />
                              <span>Remove</span>
                            </Button>
                          )}
                        </div>
                        
                        {previewUrl && (
                          <div className="mt-4 p-3 border rounded-md bg-white">
                            <div className="flex items-center justify-center mb-2">
                              <img 
                                src={previewUrl} 
                                alt="Term image preview" 
                                className="max-h-60 max-w-full rounded-md object-contain" 
                              />
                            </div>
                            <div className="text-center text-sm text-gray-600 italic">
                              {imageCaption || "No caption provided"}
                            </div>
                          </div>
                        )}
                      </div>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex justify-end border-t pt-4 bg-gray-100">
                  <Button
                    type="button"
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={isAddingTerm}
                    className="w-full sm:w-auto text-white px-8 py-3 rounded-md text-base font-medium shadow-md"
                    style={{ backgroundColor: "#0E76A8", borderColor: "#0E76A8" }}
                  >
                    {isAddingTerm && (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    )}
                    ADD TERM
                  </Button>
                </CardFooter>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Add New Category</CardTitle>
                  <CardDescription>
                    Can't find the category you need? Add a new one.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Category Name</label>
                      <Input
                        placeholder="e.g. CJA, RT-CDP, Data Management"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4 bg-gray-100">
                  <Button
                    onClick={handleAddCategory}
                    disabled={!newCategory.trim() || isAddingCategory}
                    className="w-full text-white px-6 py-3 rounded-md text-base font-medium shadow-md"
                    style={{ backgroundColor: "#0E76A8", borderColor: "#0E76A8" }}
                  >
                    {isAddingCategory && (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    )}
                    ADD CATEGORY
                  </Button>
                </CardFooter>
              </Card>

              <div className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Current Categories</CardTitle>
                    <CardDescription>
                      Existing categories in the termbase.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {categories.length === 0 ? (
                      <p className="text-sm text-gray-500">No categories yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {categories.map((category) => (
                          <div
                            key={category.id}
                            className="text-white px-3 py-1 rounded-full text-sm"
                            style={{ backgroundColor: "#0E76A8" }}
                          >
                            {category.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Image Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Prepare Image Upload</DialogTitle>
            <DialogDescription>
              Select an image to upload after the term is created. Supported formats: JPEG, PNG, GIF.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUploadSubmit}>
            <div className="space-y-4 py-2">
              {!previewUrl ? (
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-md">
                  <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
                  <div className="text-center">
                    <Label htmlFor="image-upload" className="cursor-pointer text-blue-600 hover:text-blue-500">
                      Click to upload
                    </Label>
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      PNG, JPG, GIF up to 5MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="rounded-md mx-auto max-h-[300px] w-auto"
                  />
                  <button
                    type="button"
                    className="absolute top-2 right-2 rounded-full bg-black/70 p-1 text-white hover:bg-black/90"
                    onClick={() => {
                      setImageFile(null);
                      setPreviewUrl(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              
              {previewUrl && (
                <div className="space-y-2">
                  <Label htmlFor="caption">Caption (optional)</Label>
                  <Input
                    id="caption"
                    placeholder="Describe this image..."
                    value={imageCaption}
                    onChange={(e) => setImageCaption(e.target.value)}
                  />
                </div>
              )}
            </div>
            
            <DialogFooter className="flex justify-between items-center mt-4">
              <div className="text-sm text-amber-600">
                <p>The image will be uploaded after the term is created.</p>
              </div>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
