import { useState, useEffect } from 'react';

/**
 * Custom hook to safely load an Object URL from a FileSystemFileHandle 
 * only when needed, to prevent massive memory leaks.
 */
export function useObjectUrl(fileHandle) {
  const [url, setUrl] = useState(null);
  
  useEffect(() => {
    let isCancelled = false;
    let objectUrl = null;
    
    async function generateUrl() {
      if (!fileHandle) {
        setUrl(null);
        return;
      }
      
      try {
        const file = await fileHandle.getFile();
        if (isCancelled) return;
        
        const freshUrl = URL.createObjectURL(file);
        if (isCancelled) {
          URL.revokeObjectURL(freshUrl);
          return;
        }
        
        objectUrl = freshUrl;
        setUrl(objectUrl);
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to generate Object URL:', err);
          setUrl(null);
        }
      }
    }
    
    generateUrl();
    
    return () => {
      isCancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fileHandle]);

  return url;
}
