import { useState, useCallback, useEffect } from 'react';
import * as idb from '../archive/utils/idb';

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

  const syncToArchive = async (smartTrips) => {
    console.log('[SYNC ENTRY] Tripping started with trips count:', smartTrips?.length);
    if (!isLinked) {
      alert("请先进入相册 (Archive) 页面初始化工作区并授予文件夹权限！");
      return;
    }
    try {
      const handle = await idb.get('last_handle');
      const dbFileHandle = await handle.getFileHandle('trip_database.json', { create: false });
      
      const newDb = { ...archiveDb };
      let changed = false;

      smartTrips.forEach(stTrip => {
         // Find matching trip in archive by title
         let aTrip = newDb.trips.find(t => t.title === stTrip.title || t.folder_name === stTrip.title);
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

                  let aEvent = newDb.events.find(e => e.title === stopTitle && e.trip_id === aTrip.trip_id);
                  console.log(`[SYNC DEBUG] Title: "${stopTitle}", City: "${stop.city}", Found Match:`, !!aEvent);
                  
                  if (!aEvent) { // create
                     console.log(`[SYNC DEBUG] Creating New Event for: ${stopTitle}`);
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
                     // 即使事件存在，也强制同步最新的城市、日期和其他核心信息
                     if (aEvent.city !== stop.city || aEvent.date !== day.date || aEvent.latitude !== stop.lat) {
                        console.log(`[SYNC DEBUG] Updating Existing Event: ${stopTitle}, New City: ${stop.city}`);
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
         alert("同步成功！Smart Trip 的行程和地点已同步到本地相册数据库。");
      } else {
         alert("暂无需要同步的新数据。");
      }
    } catch (e) {
      console.error('Sync failed', e);
      alert('同步失败: ' + e.message);
    }
  };

  return { archiveDb, isLinked, thumbnails, getThumbnail, syncToArchive, loadArchiveDb, rootHandle };
}
