/**
 * Utility to generate thumbnails from FileSystemHandles
 */

/**
 * Generates a thumbnail for a given file handle
 * @param {FileSystemFileHandle} fileHandle 
 * @param {number} maxWidth 
 * @returns {Promise<string>} Data URL of the thumbnail
 */
export async function generateThumbnail(fileHandle, maxWidth = 1024) {
  return new Promise(async (resolve, reject) => {
    try {
      const file = await fileHandle.getFile();
      const url = URL.createObjectURL(file);
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // High quality scale down
        ctx.drawImage(img, 0, 0, width, height);
        
        // Get as data URL (smaller than the original for many MB photos)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        // Clean up
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image for thumbnail generation'));
      };
      
      img.src = url;
    } catch (err) {
      reject(err);
    }
  });
}
