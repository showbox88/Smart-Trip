import { useState, useCallback, useEffect } from 'react';

// Minimal IndexedDB helpers (inlined from removed archive/utils/idb.js)
const IDB_NAME = 'ArchiveStore';
const IDB_STORE = 'KeyValueStore';
function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}
const idb = {
  async get(key, store = IDB_STORE) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = e => reject(e.target.error);
    });
  },
  async set(key, value, store = IDB_STORE) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const req = tx.objectStore(store).put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = e => reject(e.target.error);
    });
  },
};

export function useArchiveSync() {
  const [archiveDb, setArchiveDb] = useState(null);
  const [isLinked, setIsLinked] = useState(false);
  const [thumbnails, setThumbnails] = useState({});
  const [rootHandle, setRootHandle] = useState(null);

  const loadArchiveDb = useCallback(async () => {
    try {
      const handle = await idb.get('last_handle');
      if (!handle) return false;

      const options = { mode: 'readwrite' };
      if ((await handle.queryPermission(options)) === 'granted') {
         const dbFileHandle = await handle.getFileHandle('trip_database.json', { create: false });
         const file = await dbFileHandle.getFile();
         const text = await file.text();
         const data = JSON.parse(text);
         setArchiveDb(data);
         setRootHandle(handle);
         setIsLinked(true);
         return data;
      }
    } catch (e) {
      console.warn('Archive not linked or permission denied', e);
    }
    return false;
  }, []);

  useEffect(() => {
     loadArchiveDb();
  }, [loadArchiveDb]);

  const getThumbnail = useCallback(async (photoId) => {
    if (thumbnails[photoId]) return thumbnails[photoId];
    try {
       const thumb = await idb.get(photoId, 'ThumbnailStore');
       if (thumb) {
         setThumbnails(prev => ({ ...prev, [photoId]: thumb }));
         return thumb;
       }
    } catch (err) {}
    return null;
  }, [thumbnails]);

  const syncToArchive = async (smartTrips, { silent = false } = {}) => {
    if (!isLinked) {
      if (!silent) alert("请先进入相册 (Archive) 页面初始化工作区并授予文件夹权限！");
      return false;
    }
    try {
      const handle = await idb.get('last_handle');
      // create: true so sync works even if the file was deleted
      const dbFileHandle = await handle.getFileHandle('trip_database.json', { create: true });

      // Read fresh data from disk to avoid stale state
      const file = await dbFileHandle.getFile();
      const text = await file.text();
      const freshDb = text ? JSON.parse(text) : { trips: [], events: [], photos: [], cities: [] };

      // Deep copy arrays to avoid mutating state
      const newDb = {
        ...freshDb,
        trips: [...(freshDb.trips || [])],
        events: [...(freshDb.events || [])],
        cities: [...(freshDb.cities || [])],
        photos: [...(freshDb.photos || [])],
      };
      let changed = false;

      smartTrips.forEach(stTrip => {
         // Match by ID only — title matching causes collisions when trips share default names
         let aTrip = newDb.trips.find(t => String(t.trip_id) === String(stTrip.id));
         if (!aTrip) {
            aTrip = {
              trip_id: stTrip.id,
              title: stTrip.title,
              folder_name: stTrip.title,
              date: stTrip.startDate,
              startDate: stTrip.startDate,
              endDate: stTrip.endDate,
              cover_photo_id: null
            };
            newDb.trips.push(aTrip);
            changed = true;
         }

         // Map Stops to Events
         if (stTrip.days) {
           stTrip.days.forEach(day => {
             if (day.stops) {
               day.stops.forEach(stop => {
                  let stopTitle, stopNotes;
                  if (stop.type === 'note') {
                    stopTitle = `📝 ${stop.content ? stop.content.split('\n')[0].slice(0, 20) || '备注' : '备注'}`;
                    stopNotes = stop.content || '';
                  } else if (stop.type === 'list') {
                    stopTitle = `📋 ${stop.title || '清单'}`;
                    stopNotes = stop.items ? stop.items.map(item => `- [${item.checked ? 'x' : ' '}] ${item.text}`).join('\n') : '';
                  } else {
                    stopTitle = stop.location || stop.name;
                    stopNotes = '';
                  }

                  // Match event by stop ID first, then by title+trip_id
                  let aEvent = (stop.id && newDb.events.find(e => String(e.event_id) === String(stop.id)))
                            || newDb.events.find(e => e.title === stopTitle && String(e.trip_id) === String(aTrip.trip_id));

                  if (!aEvent) { // create
                     newDb.events.push({
                       event_id: stop.id || crypto.randomUUID(),
                       trip_id: aTrip.trip_id,
                       title: stopTitle,
                       notes: stopNotes,
                       date: day.date,
                       city: stop.city || '',
                       latitude: stop.lat,
                       longitude: stop.lng,
                       spending: parseFloat(stop.price) || 0,
                       currency: stop.currency || 'CNY',
                       category: stop.category || '未分类'
                     });
                     changed = true;
                  } else {
                     // Update existing event's core info
                     if (aEvent.city !== stop.city || aEvent.date !== day.date || aEvent.latitude !== stop.lat) {
                        aEvent.city = stop.city || '';
                        aEvent.date = day.date;
                        aEvent.latitude = stop.lat;
                        aEvent.longitude = stop.lng;
                        changed = true;
                     }
                  }
               });
             }
           });
         }
      });

      if (changed) {
         const writable = await dbFileHandle.createWritable();
         await writable.write(JSON.stringify(newDb, null, 2));
         await writable.close();
         setArchiveDb(newDb);
      }
      return true;
    } catch (e) {
      console.error('Sync failed', e);
      if (!silent) alert('同步失败: ' + e.message);
      return false;
    }
  };

  // Pick folder, create/load trip_database.json, sync smart trip data, all in one step
  const initAndSync = async (smartTrips) => {
    try {
      const directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      await idb.set('last_handle', directoryHandle);

      // Load or create trip_database.json
      let dbFileHandle;
      let currentDb = { trips: [], events: [], photos: [], cities: [], categories: [] };
      try {
        dbFileHandle = await directoryHandle.getFileHandle('trip_database.json', { create: false });
        const file = await dbFileHandle.getFile();
        currentDb = JSON.parse(await file.text());
      } catch {
        dbFileHandle = await directoryHandle.getFileHandle('trip_database.json', { create: true });
      }

      // Deep copy arrays
      const newDb = {
        ...currentDb,
        trips: [...(currentDb.trips || [])],
        events: [...(currentDb.events || [])],
        cities: [...(currentDb.cities || [])],
        photos: [...(currentDb.photos || [])],
      };
      let changed = false;

      (smartTrips || []).forEach(stTrip => {
        let aTrip = newDb.trips.find(t => String(t.trip_id) === String(stTrip.id));
        if (!aTrip) {
          aTrip = {
            trip_id: stTrip.id,
            title: stTrip.title,
            folder_name: stTrip.title,
            date: stTrip.startDate,
            startDate: stTrip.startDate,
            endDate: stTrip.endDate,
            cover_photo_id: null
          };
          newDb.trips.push(aTrip);
          changed = true;
        }

        if (stTrip.days) {
          stTrip.days.forEach(day => {
            if (day.stops) {
              day.stops.forEach(stop => {
                let stopTitle, stopNotes;
                if (stop.type === 'note') {
                  stopTitle = `📝 ${stop.content ? stop.content.split('\n')[0].slice(0, 20) || '备注' : '备注'}`;
                  stopNotes = stop.content || '';
                } else if (stop.type === 'list') {
                  stopTitle = `📋 ${stop.title || '清单'}`;
                  stopNotes = stop.items ? stop.items.map(item => `- [${item.checked ? 'x' : ' '}] ${item.text}`).join('\n') : '';
                } else {
                  stopTitle = stop.location || stop.name;
                  stopNotes = '';
                }

                let aEvent = (stop.id && newDb.events.find(e => String(e.event_id) === String(stop.id)))
                          || newDb.events.find(e => e.title === stopTitle && String(e.trip_id) === String(aTrip.trip_id));

                if (!aEvent) {
                  newDb.events.push({
                    event_id: stop.id || crypto.randomUUID(),
                    trip_id: aTrip.trip_id,
                    title: stopTitle,
                    notes: stopNotes,
                    date: day.date,
                    city: stop.city || '',
                    latitude: stop.lat,
                    longitude: stop.lng,
                    spending: parseFloat(stop.price) || 0,
                    currency: stop.currency || 'CNY',
                    category: stop.category || '未分类'
                  });
                  changed = true;
                }
              });
            }
          });
        }
      });

      if (changed || !currentDb.trips) {
        const writable = await dbFileHandle.createWritable();
        await writable.write(JSON.stringify(newDb, null, 2));
        await writable.close();
      }

      setArchiveDb(newDb);
      setRootHandle(directoryHandle);
      setIsLinked(true);
      return true;
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('Init & sync failed', e);
        alert('初始化失败: ' + e.message);
      }
      return false;
    }
  };

  return { archiveDb, isLinked, thumbnails, getThumbnail, syncToArchive, initAndSync, loadArchiveDb, rootHandle };
}
