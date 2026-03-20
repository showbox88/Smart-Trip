import { supabase } from '../lib/supabase';

/**
 * Uploads a file to Supabase Storage and returns the public URL.
 * @param {File} file - The file to upload.
 * @param {string} bucket - The bucket name (default: 'trip-media').
 * @returns {Promise<string>} - The public URL of the uploaded file.
 */
export async function uploadToSupabase(file, bucket = 'trip-media') {
  if (!file) throw new Error('No file provided');

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return publicUrl;
}

/**
 * Deletes multiple files from Supabase Storage.
 * @param {string[]} fileNames - List of file names to delete.
 * @param {string} bucket - The bucket name.
 */
export async function deleteFilesFromSupabase(fileNames, bucket = 'trip-media') {
  if (!fileNames || fileNames.length === 0) return;
  
  const { error } = await supabase.storage
    .from(bucket)
    .remove(fileNames);

  if (error) {
    console.error('[deleteFilesFromSupabase] Error:', error);
    throw error;
  }
}
