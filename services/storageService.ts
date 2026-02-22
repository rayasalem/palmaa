
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { uploadImage as mockUpload } from './cloudinaryService';

/**
 * Storage Service
 * Handles uploading files to Supabase Storage.
 * Falls back to mock base64 conversion if Supabase is not configured or fails.
 */
export const storageService = {
  
  /**
   * Upload a file to a specific bucket and path.
   * @param file The file object to upload.
   * @param bucket The storage bucket name (e.g., 'products').
   * @param path The path/filename within the bucket.
   * @returns Promise resolving to the public URL of the uploaded file.
   */
  async uploadFile(file: File, bucket: string, path: string): Promise<string> {
    // 1. Check Configuration
    if (!isSupabaseConfigured || !supabase) {
      console.warn("Supabase not configured, using mock upload.");
      return mockUpload(file);
    }

    try {
      // 2. Upload to Supabase
      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('Supabase Storage Upload Error:', error.message);
        
        // Specific check for bucket not found
        if (error.message.includes('Bucket not found') || error.message.includes('row not found')) {
            console.warn(`Bucket '${bucket}' does not exist in Supabase Storage. Please run the setup SQL or create it in the Dashboard.`);
            // Fallback to mock upload so the app doesn't break
            return mockUpload(file);
        }

        // Other errors, try mock as fallback
        return mockUpload(file);
      }

      // 3. Get Public URL
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      return data.publicUrl;
    } catch (e) {
      console.error('Storage Service Exception:', e);
      return mockUpload(file);
    }
  }
};
