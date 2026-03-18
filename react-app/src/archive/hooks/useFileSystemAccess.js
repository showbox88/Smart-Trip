import { useState, useCallback } from 'react';
import * as idb from '../utils/idb';
import { extractExifData } from '../utils/exifUtils';
import { generateThumbnail } from '../utils/thumbnailUtils';

/**
 * Handle recursive directory reading using the File System Access API
 */
async function getFilesFromDirectory(directoryHandle, path = '', seen = new Set()) {
  let files = [];
  try {
    for await (const entry of directoryHandle.values()) {
      const fullPath = `${path}${entry.name}`;
      const lowerPath = fullPath.toLowerCase();
      
      if (seen.has(lowerPath)) continue;
      
      if (entry.kind === 'file' && entry.name.match(/\.(jpe?g|png|heic|webp)$/i)) {
        seen.add(lowerPath);
        files.push({
          handle: entry,
          path: fullPath,
          name: entry.name,
        });
      } else if (entry.kind === 'directory') {
        const nestedFiles = await getFilesFromDirectory(entry, `${fullPath}/`, seen);
        files.push(...nestedFiles);
      }
    }
  } catch (err) {
    console.error(`Error reading ${path}:`, err);
  }
  return files;
}

export function useFileSystemAccess() {
  const [photoFiles, setPhotoFiles] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [dbHandle, setDbHandle] = useState(null);
  const [dbContent, setDbContent] = useState({ 
    trips: [], 
    events: [], 
    photos: [],
    categories: [
      { name: '美食', color: '#f87171' }, // red-400
      { name: '景点', color: '#60a5fa' }, // blue-400
      { name: '街景', color: '#34d399' }, // emerald-400
      { name: '酒店', color: '#fb923c' }, // orange-400
      { name: '交通', color: '#7dd3fc' }, // sky-400
      { name: '自然', color: '#a78bfa' }, // violet-400
      { name: '人像', color: '#f472b6' }, // pink-400
      { name: '购物', color: '#fbbf24' }, // amber-400
      { name: '其他', color: '#94a3b8' }  // slate-400
    ],
    cities: [],
    tags: []
  });
  const [error, setError] = useState(null);
  const [hasPersistedHandle, setHasPersistedHandle] = useState(false);

  // Check if we have a saved handle on mount
  const checkPersistedWorkspace = useCallback(async () => {
    try {
      const handle = await idb.get('last_handle');
      setHasPersistedHandle(!!handle);
      return !!handle;
    } catch (err) {
      console.error('Failed to check persisted workspace:', err);
      return false;
    }
  }, []);

  const saveToDatabase = async (newContent) => {
    if (!dbHandle) {
      console.error('No database handle available for saving.');
      return;
    }
    try {
      const writable = await dbHandle.createWritable();
      await writable.write(JSON.stringify(newContent, null, 2));
      await writable.close();
      console.log('Successfully saved to trip_database.json');
      setDbContent(newContent);
    } catch (err) {
      console.error('Failed to save to local JSON:', err);
      setError('Failed to save changes to the local database file.');
    }
  };

  const initWorkspace = async () => {
    try {
      setIsScanning(true);
      setError(null);

      // 1. Ask user to select the root folder
      const directoryHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
      });

      // 1.1 Persist for later
      await idb.set('last_handle', directoryHandle);
      setHasPersistedHandle(true);

      // 2. Scan for photos
      const files = await getFilesFromDirectory(directoryHandle);
      setPhotoFiles(files);

      // 3. Load or create trip_database.json
      let dbFileHandle;
      let currentDb = { trips: [], events: [], photos: [] };

      try {
        dbFileHandle = await directoryHandle.getFileHandle('trip_database.json', { create: false });
        const file = await dbFileHandle.getFile();
        const text = await file.text();
        currentDb = JSON.parse(text);
      } catch (e) {
        dbFileHandle = await directoryHandle.getFileHandle('trip_database.json', { create: true });
        
        // 识别子文件夹并自动创建 Trip
        const subfolders = new Set();
        for await (const entry of directoryHandle.values()) {
          if (entry.kind === 'directory' && entry.name !== '.gemini') {
            subfolders.add(entry.name);
          }
        }

        subfolders.forEach(folderName => {
          if (!currentDb.trips.find(t => t.folder_name === folderName)) {
            currentDb.trips.push({
              trip_id: crypto.randomUUID(),
              title: folderName,
              folder_name: folderName,
              date: new Date().toISOString().split('T')[0],
              cover_photo_id: null
            });
          }
        });

        // Initial sync with EXIF extraction (AFTER Trips are identified)
        currentDb.photos = await Promise.all(files.map(async f => {
          const exif = await extractExifData(f.handle);
          // 确定所属 Trip (基于第一级文件夹名)
          const parts = f.path.split('/');
          const folderName = parts.length > 1 ? parts[0] : null;
          const trip = folderName ? currentDb.trips.find(t => t.folder_name === folderName) : null;

          return {
            photo_id: crypto.randomUUID(),
            file_name: f.path,
            timestamp: exif.date && exif.time ? `${exif.date}T${exif.time}` : new Date().toISOString(),
            date: exif.date || new Date().toISOString().split('T')[0],
            latitude: exif.latitude,
            longitude: exif.longitude,
            event_id: null,
            trip_id: trip ? trip.trip_id : null
          };
        }));

        const writable = await dbFileHandle.createWritable();
        await writable.write(JSON.stringify(currentDb, null, 2));
        await writable.close();
      }
      
      setDbHandle(dbFileHandle);
      setDbContent(currentDb);
      
      // Perform incremental sync for new photos or missing EXIF
      await syncPhotosWithExif(files, currentDb, dbFileHandle);

      return true;

    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('User cancelled the folder selection.');
      } else {
        console.error('File System Support Error:', err);
        setError('Your browser might not support folder access or permission was denied.');
      }
      return false;
    } finally {
      setIsScanning(false);
    }
  };

  const restoreWorkspace = async () => {
    try {
      setIsScanning(true);
      setError(null);
      
      const directoryHandle = await idb.get('last_handle');
      if (!directoryHandle) {
        throw new Error('抱歉，找不到之前保存的工作区。');
      }

      // Check permission
      const options = { mode: 'readwrite' };
      if ((await directoryHandle.queryPermission(options)) !== 'granted') {
        if ((await directoryHandle.requestPermission(options)) !== 'granted') {
          throw new Error('未获得权限，无法访问文件夹。');
        }
      }

      // 2. Scan for photos
      const files = await getFilesFromDirectory(directoryHandle);
      setPhotoFiles(files);

      // 3. Load trip_database.json
      let dbFileHandle;
      let currentDb = { trips: [], events: [], photos: [] };

      try {
        dbFileHandle = await directoryHandle.getFileHandle('trip_database.json', { create: false });
        const file = await dbFileHandle.getFile();
        const text = await file.text();
        currentDb = JSON.parse(text);
      } catch (e) {
        // If it was deleted somehow but handle exists, recreate
        dbFileHandle = await directoryHandle.getFileHandle('trip_database.json', { create: true });
        
        currentDb.photos = await Promise.all(files.map(async f => {
          const exif = await extractExifData(f.handle);
          return {
            photo_id: crypto.randomUUID(),
            file_name: f.path,
            timestamp: exif.date && exif.time ? `${exif.date}T${exif.time}` : new Date().toISOString(),
            date: exif.date || new Date().toISOString().split('T')[0],
            latitude: exif.latitude,
            longitude: exif.longitude,
            event_id: null
          };
        }));

        const writable = await dbFileHandle.createWritable();
        await writable.write(JSON.stringify(currentDb, null, 2));
        await writable.close();
      }
      
      setDbHandle(dbFileHandle);
      setDbContent(currentDb);

      // 4. 增量检查子文件夹作为 Trip
      let hasNewTrips = false;
      const subfolders = new Set();
      for await (const entry of directoryHandle.values()) {
        if (entry.kind === 'directory' && entry.name !== '.gemini') {
          subfolders.add(entry.name);
        }
      }

      const updatedTrips = [...currentDb.trips];
      subfolders.forEach(folderName => {
        if (!updatedTrips.find(t => t.folder_name === folderName)) {
          updatedTrips.push({
            trip_id: crypto.randomUUID(),
            title: folderName,
            folder_name: folderName,
            date: new Date().toISOString().split('T')[0],
            cover_photo_id: null
          });
          hasNewTrips = true;
        }
      });

      let finalDb = currentDb;
      if (hasNewTrips) {
        finalDb = { ...currentDb, trips: updatedTrips };
        // 直接写入文件，不使用依赖 state 的 saveToDatabase，避免 race condition
        const writable = await dbFileHandle.createWritable();
        await writable.write(JSON.stringify(finalDb, null, 2));
        await writable.close();
        setDbContent(finalDb);
        console.log('Auto-created trips from folders.');
      }

      // 5. 修复逻辑：确保存量照片如果属于子文件夹，则正确关联 trip_id
      let reLinkedCount = 0;
      const repairedPhotos = finalDb.photos.map(p => {
        if (!p.trip_id) {
          const parts = p.file_name.replace(/\\/g, '/').split('/');
          const folderName = parts.length > 1 ? parts[0] : null;
          if (folderName) {
            const trip = finalDb.trips.find(t => t.folder_name === folderName);
            if (trip) {
              reLinkedCount++;
              return { ...p, trip_id: trip.trip_id };
            }
          }
        }
        return p;
      });

      if (reLinkedCount > 0) {
        console.log(`Repaired trip_id for ${reLinkedCount} photos.`);
        finalDb = { ...finalDb, photos: repairedPhotos };
        // 同步到文件
        const writable = await dbFileHandle.createWritable();
        await writable.write(JSON.stringify(finalDb, null, 2));
        await writable.close();
        setDbContent(finalDb);
      }

      // Perform incremental sync for new photos or missing EXIF
      await syncPhotosWithExif(files, finalDb, dbFileHandle);
      return true;

    } catch (err) {
      console.error('Failed to restore workspace:', err);
      setError(err.message || '恢复工作区失败。');
      // If handle is invalid, clear it
      if (err.name === 'NotFoundError') {
        await idb.clear();
        setHasPersistedHandle(false);
      }
      return false;
    } finally {
      setIsScanning(false);
    }
  };

  /**
   * 增量同步照片的 EXIF 信息
   */
  const syncPhotosWithExif = async (files, currentDb, fileHandle) => {
    let hasChanges = false;
    const existingPaths = new Set(currentDb.photos.map(p => p.file_name.replace(/\\/g, '/').toLowerCase()));
    
    // Migration: ensure categories, cities, tags are object arrays
    const migrateList = (list) => {
      if (!list || !Array.isArray(list)) return [];
      return list.map(item => typeof item === 'string' ? { name: item, color: '#60a5fa' } : item);
    };

    const categories = migrateList(currentDb.categories || [
      { name: '美食', color: '#f87171' },
      { name: '景点', color: '#60a5fa' },
      { name: '街景', color: '#34d399' },
      { name: '酒店', color: '#fb923c' },
      { name: '交通', color: '#7dd3fc' },
      { name: '自然', color: '#a78bfa' },
      { name: '人像', color: '#f472b6' },
      { name: '购物', color: '#fbbf24' },
      { name: '其他', color: '#94a3b8' }
    ]);
    const cities = migrateList(currentDb.cities || []);
    const tags = migrateList(currentDb.tags || []);
    
    // 1. 发现新照片
    const newPhotos = files.filter(f => !existingPaths.has(f.path.replace(/\\/g, '/').toLowerCase()));
    
    // 2. 检查旧照片是否缺失关键信息 (可选，暂不强制，避免大规模扫描性能问题)
    // 但如果用户说“没有信息”，可能是之前已经扫入库但没解析。
    const missingInfoPhotos = currentDb.photos.filter(p => !p.latitude && !p.date);
    
    if (newPhotos.length === 0 && missingInfoPhotos.length === 0) return;

    console.log(`Syncing EXIF for ${newPhotos.length} new photos and ${missingInfoPhotos.length} existing photos...`);
    
    const updatedPhotos = [...currentDb.photos];
    
    // 处理新照片
    for (const f of newPhotos) {
      const exif = await extractExifData(f.handle);
      
      // 生成并存储缩略图
      try {
        const thumb = await generateThumbnail(f.handle);
        await idb.set(f.path, thumb, 'ThumbnailStore');
      } catch (thumbErr) {
        console.warn(`为照片 ${f.name} 生成缩略图失败:`, thumbErr);
      }

      // 确定所属 Trip
      const parts = f.path.split('/');
      const folderName = parts.length > 1 ? parts[0] : null;
      const trip = folderName ? currentDb.trips.find(t => t.folder_name === folderName) : null;

      updatedPhotos.push({
        photo_id: crypto.randomUUID(),
        file_name: f.path,
        timestamp: exif.date && exif.time ? `${exif.date}T${exif.time}` : new Date().toISOString(),
        date: exif.date || new Date().toISOString().split('T')[0],
        time: exif.time || '',
        latitude: exif.latitude,
        longitude: exif.longitude,
        event_id: null,
        trip_id: trip ? trip.trip_id : null
      });
      hasChanges = true;
    }

    // 处理缺失信息或缩略图的照片
    for (const p of missingInfoPhotos) {
      const fileMatch = files.find(f => f.path.replace(/\\/g, '/') === p.file_name.replace(/\\/g, '/'));
      if (fileMatch) {
         const exif = await extractExifData(fileMatch.handle);
         
         // 检查并补全缩略图
         const existingThumb = await idb.get(p.file_name, 'ThumbnailStore');
         if (!existingThumb) {
           try {
             const thumb = await generateThumbnail(fileMatch.handle);
             await idb.set(p.file_name, thumb, 'ThumbnailStore');
           } catch (e) {
             console.warn(`回填照片 ${p.file_name} 的缩略图失败:`, e);
           }
         }

         const idx = updatedPhotos.findIndex(up => up.photo_id === p.photo_id);
         if (idx !== -1) {
           updatedPhotos[idx] = {
             ...updatedPhotos[idx],
             timestamp: exif.date && exif.time ? `${exif.date}T${exif.time}` : updatedPhotos[idx].timestamp,
             date: exif.date || updatedPhotos[idx].date,
             time: exif.time || updatedPhotos[idx].time || '',
             latitude: exif.latitude ?? updatedPhotos[idx].latitude,
             longitude: exif.longitude ?? updatedPhotos[idx].longitude
           };
           hasChanges = true;
         }
      }
    }

    if (hasChanges) {
      const newDb = { 
        ...currentDb, 
        photos: updatedPhotos,
        categories,
        cities,
        tags
      };
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(newDb, null, 2));
      await writable.close();
      setDbContent(newDb);
      console.log('Incremental EXIF sync completed.');
    }
  };

  return { initWorkspace, restoreWorkspace, checkPersistedWorkspace, hasPersistedHandle, isScanning, photoFiles, error, dbHandle, dbContent, saveToDatabase };
}
