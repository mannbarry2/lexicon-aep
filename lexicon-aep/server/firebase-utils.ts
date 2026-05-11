import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Initialize Firebase client SDK
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: `${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: 'adobe-aep-termbase.firebasestorage.app', // Direct bucket name from Firebase console
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Log configuration for debugging
console.log(`Firebase Storage config:
- Project ID: ${process.env.VITE_FIREBASE_PROJECT_ID}
- Storage Bucket: adobe-aep-termbase.firebasestorage.app
- API Key: ${process.env.VITE_FIREBASE_API_KEY ? "[Set]" : "[Not Set]"}
- App ID: ${process.env.VITE_FIREBASE_APP_ID ? "[Set]" : "[Not Set]"}`);

// Initialize Firebase with a unique instance name
const firebaseApp = initializeApp(firebaseConfig, 'firebaseStorage');

// Get storage instance
const firebaseStorage = getStorage(firebaseApp);

// Log the Firebase Storage initialization
console.log(`Firebase Storage initialized for project: ${process.env.VITE_FIREBASE_PROJECT_ID}`);

// Add a fallback in case the main bucket doesn't exist
try {
  // Add default bucket (same storage instance, just to ensure it's working)
  const defaultBucket = getStorage(firebaseApp);
  console.log(`Default Firebase Storage initialized successfully`);
} catch (err) {
  console.warn("Couldn't initialize default storage bucket:", err);
}

/**
 * Uploads a file to Firebase Storage using client SDK
 * @param file The file buffer to upload
 * @param filename Original filename (used to determine extension)
 * @param mimeType MIME type of the file
 * @param folder Folder to upload to in Firebase Storage
 * @returns URL to the uploaded file
 */
export async function uploadToFirebaseStorage(
  file: Buffer,
  filename: string,
  mimeType: string,
  folder: string = 'term-images'
): Promise<string> {
  try {
    // Validate inputs for debugging
    if (!file || file.length === 0) {
      throw new Error('Empty file buffer provided to uploadToFirebaseStorage');
    }
    
    // Log the upload attempt with detailed information
    console.log(`Uploading to Firebase Storage:
- File size: ${file.length} bytes
- File name: ${filename}
- MIME type: ${mimeType}
- Target folder: ${folder}
- Firebase project: ${process.env.VITE_FIREBASE_PROJECT_ID}
- Storage bucket: adobe-aep-termbase.firebasestorage.app`);
    
    // Generate a unique filename using UUID
    const ext = path.extname(filename);
    const uniqueFilename = `${uuidv4()}${ext}`;
    const fullPath = `${folder}/${uniqueFilename}`;
    console.log(`- Full storage path: ${fullPath}`);
    
    // Create a storage reference
    const storageRef = ref(firebaseStorage, fullPath);
    
    // Upload the file with metadata
    const metadata = {
      contentType: mimeType,
      customMetadata: {
        originalName: filename,
        uploadedAt: new Date().toISOString()
      }
    };
    
    console.log('Starting Firebase upload...');
    const uploadResult = await uploadBytes(storageRef, file, metadata);
    console.log('Upload successful, getting download URL...');
    
    // Get the download URL
    const downloadURL = await getDownloadURL(uploadResult.ref);
    
    console.log(`File uploaded to Firebase Storage: ${downloadURL}`);
    return downloadURL;
  } catch (error: any) {
    // Enhanced error logging with specific information
    console.error('Error uploading to Firebase Storage:');
    console.error(`- Error code: ${error.code || 'unknown'}`);
    console.error(`- Error message: ${error.message || 'No message'}`);
    
    if (error.serverResponse) {
      console.error(`- Server response: ${error.serverResponse}`);
    }
    
    if (error.customData) {
      console.error('- Custom data:', error.customData);
    }
    
    console.error('- Stack trace:', error.stack);
    throw error;
  }
}

/**
 * Deletes a file from Firebase Storage using client SDK
 * @param url URL of the file to delete
 * @returns True if successful, false otherwise
 */
export async function deleteFromFirebaseStorage(url: string): Promise<boolean> {
  try {
    // Firebase Storage URLs contain a token, so we need to extract the path differently
    // Example URL: https://firebasestorage.googleapis.com/v0/b/my-project.appspot.com/o/term-images%2Fmy-image.jpg?alt=media&token=abc123
    
    // First, we need to parse the URL to get the path
    const urlObj = new URL(url);
    
    // For Firebase Storage download URLs, we need to extract the path from the 'o' parameter
    // The path is encoded in the pathname after /o/
    let pathMatch: RegExpMatchArray | null = null;
    
    if (url.includes('firebasestorage.googleapis.com')) {
      // Example: /v0/b/project-id.appspot.com/o/term-images%2Ffilename.jpg
      pathMatch = urlObj.pathname.match(/\/o\/(.+?)(?:\?|$)/);
    } else if (url.includes('storage.googleapis.com')) {
      // Older format: /bucket-name/path/to/file.ext
      // Skip the first slash and bucket name to get the path
      const pathParts = urlObj.pathname.split('/');
      // Create a match-like array with the extracted path
      const extractedPath = pathParts.slice(2).join('/');
      if (extractedPath) {
        pathMatch = ['', extractedPath]; // First element is unused
      }
    }
    
    if (!pathMatch || !pathMatch[1]) {
      console.error('Could not extract file path from Firebase Storage URL:', url);
      return false;
    }
    
    // Decode the URI component to get the actual path
    const filePath = decodeURIComponent(pathMatch[1]);
    
    // Create a reference to the file
    const storageRef = ref(firebaseStorage, filePath);
    
    // Delete the file
    await deleteObject(storageRef);
    
    console.log(`File deleted from Firebase Storage: ${url}`);
    return true;
  } catch (error) {
    console.error('Error deleting from Firebase Storage:', error);
    return false;
  }
}