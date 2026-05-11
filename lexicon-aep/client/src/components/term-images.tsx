import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Upload, Image as ImageIcon, X, Pencil, ZoomIn, AlertTriangle } from "lucide-react";

// Component to handle image display with error fallback
interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  filename: string;
  firebaseUrl?: string | null;
}

function ImageWithFallback({ src, alt, className, filename, firebaseUrl }: ImageWithFallbackProps) {
  const [imgError, setImgError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  
  // Check if we're in development or production
  const isProduction = window.location.hostname === 'lexiconaep.com';
  
  // First try to use Firebase URL if available
  // Firebase Storage URLs are absolute and should work in any environment
  // Only use Firebase URL, no fallback to local files
  const imageSrc = firebaseUrl;
  
  const handleError = () => {
    console.error(`Image not found: ${imageSrc}`);
    setImgError(true);
  };
  
  const handleLoad = () => {
    console.log(`Successfully loaded image: ${imageSrc}`);
    setLoaded(true);
  };
  
  if (imgError || !imageSrc) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-100 p-4 ${className}`}>
        <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
        <p className="text-xs text-gray-600 text-center">Image unavailable</p>
        <p className="text-xs text-gray-500 mt-1 text-center">{filename}</p>
      </div>
    );
  }
  
  return (
    <div className="relative">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse">
          <span className="sr-only">Loading...</span>
        </div>
      )}
      <img 
        src={imageSrc || ''} 
        alt={alt} 
        className={className}
        onError={handleError}
        onLoad={handleLoad}
      />
    </div>
  );
}
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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

interface ImageType {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  caption: string | null;
  firebaseUrl?: string | null;
}

interface TermImagesProps {
  termId: number;
  images: ImageType[];
  isAdmin: boolean;
}

export function TermImages({ termId, images, isAdmin }: TermImagesProps) {
  const { toast } = useToast();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [captionDialogOpen, setCaptionDialogOpen] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageType | null>(null);
  const [newCaption, setNewCaption] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageCaption, setImageCaption] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Upload image mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!imageFile) {
        throw new Error("No image selected");
      }

      const formData = new FormData();
      formData.append("image", imageFile);
      if (imageCaption) {
        formData.append("caption", imageCaption);
      }

      const response = await fetch(`/api/terms/${termId}/images`, {
        method: "POST",
        body: formData,
        // Do not set Content-Type header for FormData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload image");
      }

      return await response.json();
    },
    onSuccess: () => {
      setImageFile(null);
      setImageCaption("");
      setPreviewUrl(null);
      setUploadDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/terms/${termId}`] });
      toast({
        title: "Image uploaded",
        description: "The image has been uploaded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  // Update caption mutation
  const updateCaptionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedImage) {
        throw new Error("No image selected");
      }

      return await apiRequest("PATCH", `/api/images/${selectedImage.id}/caption`, {
        caption: newCaption,
      });
    },
    onSuccess: () => {
      setCaptionDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/terms/${termId}`] });
      toast({
        title: "Caption updated",
        description: "The image caption has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update caption. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: number) => {
      return await apiRequest("DELETE", `/api/images/${imageId}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/terms/${termId}`] });
      toast({
        title: "Image deleted",
        description: "The image has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete image. Please try again.",
        variant: "destructive",
      });
    },
  });

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
    uploadMutation.mutate();
  };

  const handleEditCaption = (image: ImageType) => {
    setSelectedImage(image);
    setNewCaption(image.caption || "");
    setCaptionDialogOpen(true);
  };

  const handleUpdateCaption = (e: React.FormEvent) => {
    e.preventDefault();
    updateCaptionMutation.mutate();
  };

  const handleDeleteImage = (imageId: number) => {
    deleteImageMutation.mutate(imageId);
  };

  const clearImageSelection = () => {
    setImageFile(null);
    setPreviewUrl(null);
    setImageCaption("");
  };
  
  const handleViewImage = (image: ImageType) => {
    setSelectedImage(image);
    setImageViewerOpen(true);
  };

  if (images.length === 0 && !isAdmin) {
    return null; // Don't show the section if there are no images and user is not admin
  }

  return (
    <div className="mt-8 pt-6 border-t border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Images</h3>
        {isAdmin && (
          <Button 
            onClick={() => setUploadDialogOpen(true)}
            className="bg-[#0E76A8] text-white hover:bg-[#0E76A8]/90 border-0"
            size="sm"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Image
          </Button>
        )}
      </div>

      {images.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-md border border-gray-200">
          <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">No images yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((image) => (
            <div 
              key={image.id} 
              className="group relative bg-white rounded-md border border-gray-200 overflow-hidden"
            >
              <div className="aspect-w-4 aspect-h-3">
                <ImageWithFallback 
                  src={`/uploads/${image.filename}`} 
                  alt={image.caption || image.originalName}
                  className="object-cover w-full h-full"
                  filename={image.filename}
                  firebaseUrl={image.firebaseUrl}
                />
                {/* View larger button (appears on hover) */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                  <Button 
                    variant="secondary"
                    size="sm"
                    className="bg-white hover:bg-gray-100 text-gray-800"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewImage(image);
                    }}
                  >
                    <ZoomIn className="mr-2 h-4 w-4" />
                    View Larger
                  </Button>
                </div>
              </div>
              {image.caption && (
                <div className="p-2 bg-white border-t border-gray-200">
                  <p className="text-sm text-gray-600">{image.caption}</p>
                </div>
              )}
              {isAdmin && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 bg-white hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditCaption(image);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Image</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this image? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteImage(image.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Image Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Image</DialogTitle>
            <DialogDescription>
              Upload an image to illustrate this term. Supported formats: JPEG, PNG, GIF.
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
                    className="max-h-48 max-w-full mx-auto rounded-md"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={clearImageSelection}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="caption">Caption (optional)</Label>
                <Textarea
                  id="caption"
                  placeholder="Add a description for this image..."
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button 
                type="submit" 
                disabled={!imageFile || isUploading}
                className="bg-[#0E76A8] text-white hover:bg-[#0E76A8]/90 border-0"
              >
                {isUploading ? "Uploading..." : "Upload Image"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Caption Dialog */}
      <Dialog open={captionDialogOpen} onOpenChange={setCaptionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Caption</DialogTitle>
            <DialogDescription>
              Update the caption for this image.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUpdateCaption}>
            <div className="space-y-4 py-2">
              {selectedImage && (
                <div className="flex justify-center">
                  <ImageWithFallback 
                    src={`/uploads/${selectedImage.filename}`} 
                    alt={selectedImage.caption || selectedImage.originalName}
                    className="max-h-48 max-w-full rounded-md"
                    filename={selectedImage.filename}
                    firebaseUrl={selectedImage.firebaseUrl}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="new-caption">Caption</Label>
                <Textarea
                  id="new-caption"
                  placeholder="Add a description for this image..."
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button 
                type="submit" 
                className="bg-[#0E76A8] text-white hover:bg-[#0E76A8]/90 border-0"
              >
                Save Caption
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Full-size Image Viewer Dialog */}
      <Dialog open={imageViewerOpen} onOpenChange={setImageViewerOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Image Viewer</DialogTitle>
            {selectedImage?.caption && (
              <DialogDescription>
                {selectedImage.caption}
              </DialogDescription>
            )}
          </DialogHeader>
          
          {selectedImage && (
            <div className="flex flex-col items-center justify-center py-4">
              <ImageWithFallback 
                src={``} 
                alt={selectedImage.caption || selectedImage.originalName}
                className="max-w-full max-h-[70vh] object-contain rounded-md"
                filename={selectedImage.filename}
                firebaseUrl={selectedImage.firebaseUrl}
              />
              
              <div className="mt-4 text-sm text-gray-500">
                <p>Original filename: {selectedImage.originalName}</p>
                {selectedImage.caption && (
                  <p className="mt-2 text-base text-gray-700">{selectedImage.caption}</p>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}