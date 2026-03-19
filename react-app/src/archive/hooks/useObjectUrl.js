import { useState, useEffect } from 'react';

/**
 * Custom hook to safely load an Object URL from a FileSystemFileHandle 
 * only when needed, to prevent massive memory leaks.
 * 
 * @param {FileSystemFileHandle} fileHandle 
 * @param {boolean} skip If true, generation is skipped and existing URL is revoked (softly)
 */
export function useObjectUrl(fileHandle, skip = false) {
  const [url, setUrl] = useState(null);
  
  useEffect(() => {
    let isCancelled = false;
    let objectUrl = null;
    
    async function generateUrl() {
      // If skip is true or no handle, just clear the URL state
      if (skip || !fileHandle) {
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
        // "Soft Revocation": Wait a few seconds before revoking to prevent 
        // ERR_FILE_NOT_FOUND during rapid list updates or transitions
        const urlToRevoke = objectUrl;
        setTimeout(() => {
          URL.revokeObjectURL(urlToRevoke);
        }, 3000);
      }
    };
  }, [fileHandle, skip]);

  return url;
}
