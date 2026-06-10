import { supabase } from '../lib/supabase';
import { IS_PB } from '../lib/dataSource';

/**
 * Uploads a file to Supabase Storage and returns the public URL.
 * PB 模式：改传 VM 的 /media 通道（原图不压缩），返回 /media/... 路径。
 * @param {File} file - The file to upload.
 * @param {string} bucket - The bucket name (default: 'trip-media').
 * @param {object} opts - { dir }: PB 模式下的存储目录（collection/recordId）
 * @returns {Promise<string>} - The public URL of the uploaded file.
 */
export async function uploadToSupabase(file, bucket = 'trip-media', opts = {}) {
  if (!file) throw new Error('No file provided');

  if (IS_PB) {
    const { uploadMedia } = await import('../adapters/pbWrites');
    return uploadMedia(file, opts.dir || 'misc/uploads');
  }

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
