import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, ExternalLink, MoreVertical, Trash } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface TermImage {
  id: number;
  filename: string;
  firebase_url: string;
}

interface TermWithImages {
  id: number;
  name: string;
  slug: string;
  images: TermImage[];
  imageCount: number;
}

export default function ImageManagementPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Fetch terms with images
  const { data: terms, isLoading, error } = useQuery<TermWithImages[]>({
    queryKey: ["/api/terms/with-images"],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-7xl">
        <h1 className="text-3xl font-bold mb-6">Image Management</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-40 w-full" />
                <div className="mt-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3 mt-2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 max-w-7xl">
        <h1 className="text-3xl font-bold mb-6">Image Management</h1>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <p className="text-red-700">Error loading terms with images: {(error as Error).message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Image Management</h1>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-sm">
            {terms?.length || 0} Terms with Images
          </Badge>
          <Badge variant="outline" className="text-sm">
            {terms?.reduce((total, term) => total + term.imageCount, 0) || 0} Total Images
          </Badge>
        </div>
      </div>
      
      <Separator className="mb-6" />

      {terms?.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-lg font-medium">No terms with images found</p>
            <p className="text-muted-foreground mt-1">Images will appear here once added to terms</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {terms?.map((term) => (
            <Card key={term.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">
                    <Link href={`/term/${term.slug}`} className="hover:underline text-primary">
                      {term.name}
                    </Link>
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/term/${term.slug}`}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Term
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/edit-term/${term.slug}`}>
                          <ImageIcon className="mr-2 h-4 w-4" />
                          Edit Images
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {term.images.map((image) => (
                    <Dialog key={image.id}>
                      <DialogTrigger asChild>
                        <div 
                          className="relative h-[100px] border rounded-md overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setSelectedImage(image.firebase_url)}
                        >
                          <img
                            src={image.firebase_url}
                            alt={`Image for ${term.name}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YxZjVmOSIgLz4KICA8dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjQ3NDhlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pgo8L3N2Zz4K";
                            }}
                          />
                        </div>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[80vw] md:max-w-[70vw] max-h-[80vh] p-0 overflow-hidden">
                        <div className="p-6 flex flex-col items-center">
                          <img 
                            src={image.firebase_url} 
                            alt={`Image for ${term.name}`}
                            className="max-w-full max-h-[60vh] object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YxZjVmOSIgLz4KICA8dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjQ3NDhlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pgo8L3N2Zz4K";
                            }}
                          />
                          <div className="mt-4 text-center">
                            <p className="font-medium">{term.name}</p>
                            <p className="text-sm text-muted-foreground">{image.filename}</p>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ))}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  <p>{term.imageCount} {term.imageCount === 1 ? 'image' : 'images'}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}