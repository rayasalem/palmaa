import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { uploadImage as mockUpload } from './cloudinaryService';

const MAX_IMAGE_WIDTH = 1200;
const MAX_IMAGE_BYTES = 500 * 1024;

async function toWebpWithLimits(file: File): Promise<File> {
  if (typeof window === 'undefined') return file;
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = (err) => reject(err);
        image.src = reader.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

    const scale = Math.min(1, MAX_IMAGE_WIDTH / (img.width || MAX_IMAGE_WIDTH));
    const width = Math.round(img.width * scale);
    const height = Math.round(img.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width || img.width;
    canvas.height = height || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    let quality = 0.9;
    let blob: Blob | null = null;
    for (let i = 0; i < 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(
          (b) => resolve(b),
          'image/webp',
          quality,
        ),
      );
      if (!blob) break;
      if (blob.size <= MAX_IMAGE_BYTES || quality <= 0.4) break;
      quality -= 0.15;
    }
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
  } catch {
    return file;
  }
}

/**
 * Storage Service
 * Handles uploading files to Supabase Storage.
 * Falls back to mock base64 conversion if Supabase is not configured or fails.
 */
export const storageService = {
  /**
   * Upload a file to a specific bucket and path.
   * @param file The file object to upload.
   * @param bucket The storage bucket name (e.g., 'product-images').
   * @param path The path/filename within the bucket.
   * @returns Promise resolving to the public URL of the uploaded file.
   */
  async uploadFile(file: File, bucket: string, path: string): Promise<string> {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured, using mock upload.');
      return mockUpload(file);
    }

    try {
      const optimized = await toWebpWithLimits(file);

      const { error } = await supabase.storage.from(bucket).upload(path, optimized, {
        cacheControl: '3600',
        upsert: true,
      });

      if (error) {
        console.error('Supabase Storage Upload Error:', error.message);
        if (error.message.includes('Bucket not found') || error.message.includes('row not found')) {
          console.warn(
            `Bucket '${bucket}' does not exist in Supabase Storage. Please run the setup SQL or create it in the Dashboard.`,
          );
          return mockUpload(file);
        }
        return mockUpload(file);
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    } catch (e) {
      console.error('Storage Service Exception:', e);
      return mockUpload(file);
    }
  },
};
