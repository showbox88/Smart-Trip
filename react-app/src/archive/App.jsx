import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { 
  FolderOpen, Settings, ListFilter, Play, LayoutGrid, AlignJustify, 
  SlidersHorizontal, ArrowUpDown, Search, Plane, Plus, Trash2, 
  ChevronRight, CheckCircle2, ChevronDown, Archive, Calendar, Clock, RefreshCw
} from 'lucide-react';
import { useFileSystemAccess } from './hooks/useFileSystemAccess';
import { useContextMenu } from './hooks/useContextMenu';
import { PhotoCard } from './components/PhotoCard';
import { VirtualGrid } from './components/VirtualGrid';
import { ContextMenu } from './components/ContextMenu';
import { CreateEventModal } from './components/CreateEventModal';
import { CreateTripModal } from './components/CreateTripModal';
import { DetailModal } from './components/DetailModal';
import { Sidebar } from './components/Sidebar';
import { Lightbox } from './components/Lightbox';
import { ActionBar } from './components/ActionBar';
import { AlbumsView } from './components/AlbumsView';
import { MapView } from './components/MapView';
import { PropertyManagerModal } from './components/PropertyManagerModal';
import { MapPin, Tag } from 'lucide-react';
import { FilterMenu } from './components/FilterMenu';
import clsx from 'clsx';
import zh from './locales/zh.json';
import en from './locales/en.json';

const locales = { zh, en };

function NavLink({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "text-sm font-bold transition-colors cursor-pointer",
        active ? "text-white" : "text-neutral-500 hover:text-neutral-300"
      )}
    >
      {label}
    </button>
  );
}

const formatDateHeader = (dateStr, language = 'zh') => {
  if (!dateStr || dateStr === 'unknown') return language === 'zh' ? '未知日期' : 'Unknown Date';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const options = { 
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    };
    
    const locale = language === 'zh' ? 'zh-CN' : 'en-US';
    let formatted = new Intl.DateTimeFormat(locale, options).format(date);
    if (isToday) formatted = language === 'zh' ? `今天, ${formatted}` : `Today, ${formatted}`;
    return formatted;
  } catch (e) {
    return dateStr;
  }
};

function App({ smartTrips = [] }) {
  const {
    initWorkspace,
    restoreWorkspace,
    resyncExif,
    checkPersistedWorkspace,
    hasPersistedHandle,
    isScanning,
    photoFiles,
    error,
    dbHandle,
    dbContent,
    saveToDatabase
  } = useFileSystemAccess();
  
  const { contextMenu, handleContextMenu, closeMenu } = useContextMenu();

  // Create a fast lookup map for DB records by path/filename (Case-insensitive)
  const dbPhotoMap = useMemo(() => {
    const map = new Map();
    (dbContent.photos || []).forEach(p => {
      const key = p.file_name.replace(/\\/g, '/').toLowerCase();
      map.set(key, p);
    });
    return map;
  }, [dbContent.photos]);

  // Merge scan results (handles) with DB metadata
  const enrichedPhotos = useMemo(() => {
    return photoFiles.map(file => {
      const normalizedPath = file.path.replace(/\\/g, '/');
      const record = dbPhotoMap.get(normalizedPath.toLowerCase()) || {};
      return { ...file, ...record, path: normalizedPath };
    });
  }, [photoFiles, dbPhotoMap]);

  const [appMode, setAppMode] = useState('gallery');
  const [activeFilter, setActiveFilter] = useState({ type: 'all' });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [toast, setToast] = useState(null);
  const [activePhotos, setActivePhotos] = useState([]);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState([]);
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0);
  const [viewMode, setViewMode] = useState('gallery'); // 'gallery' | 'table'
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);
  const [animatingTargetId, setAnimatingTargetId] = useState(null);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState(null); // 当前选中的行程作用域
  const [language, setLanguage] = useState('zh');

  const PRESET_COLORS = useMemo(() => [
    '#60a5fa', '#f87171', '#34d399', '#fb923c', '#a78bfa',
    '#f472b6', '#fbbf24', '#94a3b8', '#38bdf8', '#4ade80'
  ], []);
  const [filterState, setFilterState] = useState({ unclassified: false, noCity: false, showClassified: false, isWallMode: false });

  const t = (path) => {
    const keys = path.split('.');
    let result = locales[language];
    for (const key of keys) {
      if (result != null && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return path;
      }
    }
    return typeof result === 'string' ? result : path;
  };
  // Ensure metadata defaults and migrate old or malformed data to object structure
  const robustMigrate = (list, defaultList = []) => {
    // CRITICAL: If the list exists but names are truncated (e.g., '美' instead of '美食'), 
    // it's corrupted from a previous bug. We must heal it.
    const isCorrupted = Array.isArray(list) && list.length > 0 && list.some(item => 
      typeof item === 'object' && item !== null && item.name && item.name.length === 1 && '美食景点街景酒店交通自然人像购物其他'.includes(item.name)
    );

    if (!list || !Array.isArray(list) || isCorrupted) return defaultList;

    return list.map((item, idx) => {
      const presets = [
        '#60a5fa', '#f87171', '#34d399', '#fb923c', '#a78bfa', 
        '#f472b6', '#fbbf24', '#94a3b8', '#38bdf8', '#4ade80'
      ];
      const defaultColor = presets[idx % presets.length];

      // Case 1: Pure string
      if (typeof item === 'string') {
        return { name: item, color: defaultColor };
      }
      
      // Case 2: Object but might be malformed
      if (typeof item === 'object' && item !== null) {
        if (item.name && typeof item.name === 'string' && item.name.length > 1) return item;
        
        let name = '未知';
        if (item.name) name = item.name;
        else if (item.label) name = item.label;
        else {
          const stringVal = Object.values(item).find(v => typeof v === 'string' && v.length > 0);
          if (stringVal) name = stringVal;
        }
        
        const color = item.color || item[1] || defaultColor;
        return { name: String(name), color: String(color) };
      }
      
      return { name: `未知 ${idx}`, color: defaultColor };
    });
  };

  const metadata = useMemo(() => {
    const defaultCategories = [
      { name: '美食', color: '#f87171' },
      { name: '景点', color: '#60a5fa' },
      { name: '街景', color: '#34d399' },
      { name: '酒店', color: '#fb923c' },
      { name: '交通', color: '#7dd3fc' },
      { name: '自然', color: '#a78bfa' },
      { name: '人像', color: '#f472b6' },
      { name: '购物', color: '#fbbf24' },
      { name: '其他', color: '#94a3b8' }
    ];

    return {
      categories: robustMigrate(dbContent.categories, defaultCategories),
      cities: robustMigrate(dbContent.cities),
      tags: robustMigrate(dbContent.tags)
    };
  }, [dbContent.categories, dbContent.cities, dbContent.tags]);


  useEffect(() => {
    checkPersistedWorkspace();
  }, [checkPersistedWorkspace]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleInitialize = async () => {
    let success = false;
    if (hasPersistedHandle) {
      success = await restoreWorkspace();
    } else {
      success = await initWorkspace();
    }
    if (success) {
      setAppMode('gallery');
    }
  };

  // Deep linking logic matching Smart Trip's Album View click
  useEffect(() => {
    if (appMode !== 'gallery' && !hasPersistedHandle) return;
    
    const params = new URLSearchParams(window.location.search);
    const tripTitle = params.get('tripTitle');
    
    if (tripTitle && dbContent?.trips?.length > 0) {
      const targetTrip = dbContent.trips.find(t => t.title === tripTitle || t.folder_name === tripTitle);
      if (targetTrip) {
        setSelectedTripId(targetTrip.trip_id);
        setActiveFilter({ type: 'all' });
      }
    }
  }, [dbContent.trips, appMode, hasPersistedHandle]);

  const handleSyncFromSmartTrip = async () => {
    if (!smartTrips || smartTrips.length === 0) {
      showToast('Smart Trip 没有数据可同步', 'orange');
      return;
    }
    
    if (!dbContent || !dbHandle) {
      showToast('请先初始化相册工作区', 'orange');
      return;
    }

    const newDb = { ...dbContent };
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
                let aEvent = newDb.events.find(e => e.title === (stop.location || stop.name) && String(e.trip_id) === String(aTrip.trip_id));
                if (!aEvent) { // create 
                   newDb.events.push({
                     event_id: stop.id || (window.crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)),
                     trip_id: aTrip.trip_id,
                     title: stop.location || stop.name,
                     date: day.date,
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

    if (changed) {
       await saveToDatabase(newDb);
       showToast("同步成功！Smart Trip 的行程和地标已导入为本地相册事件。", "purple");
    } else {
       showToast("暂无需要同步的新数据。", "blue");
    }
  };

  // Handler for all metadata updates (inline/detail modal)

  const handleUpdateItem = async (id, updates, typeOverride) => {
    // Determine type from id or override
    const normalizedId = String(id).replace(/\\/g, '/');
    let itemType = typeOverride;
    
    if (!itemType) {
      if (dbContent.trips.find(t => String(t.trip_id) === String(id))) itemType = 'trip';
      else if (dbContent.events.find(e => String(e.event_id) === String(id))) itemType = 'event';
      else itemType = 'photo';
    }

    const newDbContent = { ...dbContent };

    if (itemType === 'trip') {
      newDbContent.trips = dbContent.trips.map(t => 
        String(t.trip_id) === String(id) ? { ...t, ...updates } : t
      );
    } else if (itemType === 'event') {
      newDbContent.events = dbContent.events.map(e => 
        String(e.event_id) === String(id) ? { ...e, ...updates } : e
      );
    } else if (itemType === 'photo') {
      newDbContent.photos = dbContent.photos.map(p => 
        p.file_name.replace(/\\/g, '/').toLowerCase() === normalizedId.toLowerCase() ? { ...p, ...updates } : p
      );
    }

    await saveToDatabase(newDbContent);
    showToast(`信息已更新`, itemType === 'trip' ? 'purple' : (itemType === 'event' ? 'orange' : 'blue'));
  };

  // Deprecated: keeping for compatibility with existing components for a moment
  const handleUpdateTrip = (id, updates) => handleUpdateItem(id, updates, 'trip');

  const handleToggleDateSelection = (date, shouldSelect) => {
    const photosOnDate = displayedItems
      .filter(item => item.type === 'photo' && item.date === date)
      .map(item => item.path);
    
    setSelectedIds(prev => {
      const next = new Set(prev);
      photosOnDate.forEach(path => {
        if (shouldSelect) next.add(path);
        else next.delete(path);
      });
      return next;
    });
  };

  const toggleSelection = (id, indexOrBulk, event) => {
    setSelectedIds(prev => {
      // Handle bulk update (like clearing or rectangle selection)
      if (indexOrBulk === true) {
        return new Set(id);
      }

      const next = new Set(prev);
      const index = typeof indexOrBulk === 'number' ? indexOrBulk : undefined;
      
      // Handle Shift-Click for range selection
      if (event?.shiftKey && lastSelectedIndex !== null && index !== undefined) {
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        
        // Items between start and end inclusive
        const rangeItems = displayedItems.slice(start, end + 1);
        rangeItems.forEach(item => {
          const itemId = item.type === 'photo' ? item.path : `${item.type}:${item.id}`;
          next.add(itemId);
        });
      } else {
        // Normal click
        if (next.has(id)) next.delete(id);
        else next.add(id);
        
        if (index !== undefined) {
          setLastSelectedIndex(index);
        }
      }
      
      return next;
    });
  };

  const handleItemContextMenu = (event, item) => {
    const itemKey = item.type === 'photo' ? item.path : `${item.type}:${item.id}`;
    if (!selectedIds.has(itemKey)) {
      setSelectedIds(new Set([itemKey]));
    }
    handleContextMenu(event, item);
  };

  const onMenuAction = async (actionId, targetItem, extraData) => {
    if (actionId === 'create-event') {
      const targets = enrichedPhotos.filter(p => selectedIds.has(p.path));
      setActivePhotos(targets.length > 0 ? targets : [targetItem]);
      setIsEventModalOpen(true);
    } else if (actionId === 'create-trip') {
      setIsTripModalOpen(true);
    } else if (actionId === 'assign-to-trip') {
      const selectedEventIds = Array.from(selectedIds)
        .filter(id => id.startsWith('event:'))
        .map(id => id.replace('event:', ''));
      
      // If none selected, use the target item
      const finalIds = selectedEventIds.length > 0 ? selectedEventIds : [targetItem.id];
      handleAssignToTrip(extraData.tripId, finalIds);
    } else if (actionId === 'assign-to-event') {
      const selectedPhotoPaths = Array.from(selectedIds)
        .filter(id => !id.startsWith('event:'));
      
      const finalPaths = selectedPhotoPaths.length > 0 ? selectedPhotoPaths : [targetItem.path];
      handleAssignToEvent(extraData.eventId, finalPaths);
    } else if (actionId === 'set-trip-cover') {
      const tripId = targetItem.trip_id || extraData?.trip_id || selectedTripId;
      if (tripId && targetItem.path) {
        await handleUpdateItem(tripId, { cover_photo_id: targetItem.path }, 'trip');
        const trip = dbContent.trips.find(t => String(t.trip_id) === String(tripId));
        showToast(`已将照片设为 "${trip?.title || '行程'}" 的封面`, 'purple');
      }
    } else if (actionId === 'set-category') {
      const selectedPhotoPaths = Array.from(selectedIds)
        .filter(id => !id.startsWith('event:'));
      const finalPaths = selectedPhotoPaths.length > 0 ? selectedPhotoPaths : [targetItem.path];
      const normalizedTargets = new Set(finalPaths.map(p => p.replace(/\\/g, '/').toLowerCase()));
      
      const newPhotos = dbContent.photos.map(p => {
        const pPath = p.file_name.replace(/\\/g, '/').toLowerCase();
        if (normalizedTargets.has(pPath)) {
          return { ...p, category: extraData.category };
        }
        return p;
      });
      
      await saveToDatabase({ ...dbContent, photos: newPhotos });
      showToast(`已将 ${finalPaths.length} 张照片批量分类为 "${extraData.category}"`, 'blue');
      setSelectedIds(new Set());
    } else if (actionId === 'create-category') {
      const catName = window.prompt('请输入新的分类名称:');
      if (catName && catName.trim()) {
        const trimmedCat = catName.trim();
        const selectedPhotoPaths = Array.from(selectedIds)
          .filter(id => !id.startsWith('event:'));
        const finalPaths = selectedPhotoPaths.length > 0 ? selectedPhotoPaths : [targetItem.path];
        const normalizedTargets = new Set(finalPaths.map(p => p.replace(/\\/g, '/').toLowerCase()));

        // 1. Update photos
        const newPhotos = dbContent.photos.map(p => {
          const pPath = p.file_name.replace(/\\/g, '/').toLowerCase();
          if (normalizedTargets.has(pPath)) {
            return { ...p, category: trimmedCat };
          }
          return p;
        });

        // 2. Add to global categories if missing
        let newCats = [...(dbContent.categories || [])];
        if (!newCats.some(c => (typeof c === 'string' ? c : c.name) === trimmedCat)) {
           const sequentialColor = PRESET_COLORS[newCats.length % PRESET_COLORS.length];
           newCats.push({ name: trimmedCat, color: sequentialColor });
        }

        await saveToDatabase({ 
          ...dbContent, 
          photos: newPhotos,
          categories: newCats
        });
        showToast(`已创建并分类为 ${trimmedCat}`, 'blue');
        setSelectedIds(new Set());
      }
    } else if (actionId === 'set-rating') {
      const selectedPhotoPaths = Array.from(selectedIds)
        .filter(id => !id.startsWith('event:'));
      const finalPaths = selectedPhotoPaths.length > 0 ? selectedPhotoPaths : [targetItem.path];
      const normalizedTargets = new Set(finalPaths.map(p => p.replace(/\\/g, '/').toLowerCase()));
      
      const newPhotos = dbContent.photos.map(p => {
        const pPath = p.file_name.replace(/\\/g, '/').toLowerCase();
        if (normalizedTargets.has(pPath)) {
          return { ...p, rating: extraData.rating };
        }
        return p;
      });
      
      await saveToDatabase({ ...dbContent, photos: newPhotos });
      showToast(`已将 ${finalPaths.length} 张照片的好感度更新为 ${extraData.rating}`, 'red');
      setSelectedIds(new Set());
    } else if (actionId === 'set-event-cover') {
      const eventId = targetItem.event_id || extraData?.event_id;
      if (eventId && targetItem.path) {
        handleUpdateItem(eventId, { cover_photo_id: targetItem.path }, 'event');
        const event = dbContent.events.find(e => String(e.event_id) === String(eventId));
        showToast(`已将照片设为 "${event?.title || '事件'}" 的封面`, 'orange');
      }
    } else if (actionId === 'set-city') {
      const selectedPhotoPaths = Array.from(selectedIds)
        .filter(id => !id.startsWith('event:'));
      const finalPaths = selectedPhotoPaths.length > 0 ? selectedPhotoPaths : [targetItem.path];
      const normalizedTargets = new Set(finalPaths.map(p => p.replace(/\\/g, '/').toLowerCase()));
      
      const newPhotos = dbContent.photos.map(p => {
        const pPath = p.file_name.replace(/\\/g, '/').toLowerCase();
        if (normalizedTargets.has(pPath)) {
          return { ...p, city: extraData.city };
        }
        return p;
      });
      
      await saveToDatabase({ ...dbContent, photos: newPhotos });
      showToast(`已将 ${finalPaths.length} 张照片的城市更新为 ${extraData.city}`, 'emerald');
      setSelectedIds(new Set());
    } else if (actionId === 'create-city') {
      const cityName = window.prompt('请输入新的城市名称:');
      if (cityName && cityName.trim()) {
        const trimmedCity = cityName.trim();
        const selectedPhotoPaths = Array.from(selectedIds)
          .filter(id => !id.startsWith('event:'));
        const finalPaths = selectedPhotoPaths.length > 0 ? selectedPhotoPaths : [targetItem.path];
        const normalizedTargets = new Set(finalPaths.map(p => p.replace(/\\/g, '/').toLowerCase()));

        // 1. Update photos
        const newPhotos = dbContent.photos.map(p => {
          const pPath = p.file_name.replace(/\\/g, '/').toLowerCase();
          if (normalizedTargets.has(pPath)) {
            return { ...p, city: trimmedCity };
          }
          return p;
        });

        // 2. Add to global cities if missing
        let newCities = [...(dbContent.cities || [])];
        if (!newCities.some(c => c.name === trimmedCity)) {
           const sequentialColor = PRESET_COLORS[newCities.length % PRESET_COLORS.length];
           newCities.push({ name: trimmedCity, color: sequentialColor });
        }
        newCities.sort((a, b) => a.name.localeCompare(b.name));

        await saveToDatabase({ 
          ...dbContent, 
          photos: newPhotos,
          cities: newCities
        });
        showToast(`已创建预览并标记为 ${trimmedCity}`, 'emerald');
        setSelectedIds(new Set());
      }
    } else if (actionId === 'info') {
      const type = targetItem.type || (targetItem.path ? 'photo' : (targetItem.trip_id ? 'trip' : 'event'));
      const data = targetItem.item || targetItem;
      setDetailItem({ type, data });
      setIsDetailModalOpen(true);
    } else if (actionId === 'delete') {
      // Implement basic delete if exists (or skip if not requested, but good practice)
      showToast('删除功能尚未完全实现', 'orange');
    }
  };

  const handleCreateEvent = async (eventData) => {
    const newEventId = crypto.randomUUID();
    
    // 确定所属 Trip ID：优先使用传入的，其次使用当前作用域，最后尝试从第一张照片推断
    const firstPhoto = dbContent.photos.find(p => 
      p.file_name.replace(/\\/g, '/') === eventData.photoIds[0].replace(/\\/g, '/')
    );
    const inheritedTripId = eventData.tripId || selectedTripId || firstPhoto?.trip_id || null;

    const newEvent = {
        event_id: newEventId,
        trip_id: inheritedTripId,
        title: eventData.title || "未命名事件",
        rating: eventData.rating || 0, // 1-10
        category: eventData.category || "未分类",
        city: eventData.city || "",
        date: eventData.date || new Date().toISOString().split('T')[0],
        spending: eventData.spending || 0,
        currency: eventData.currency || "CNY",
        latitude: eventData.latitude || null,
        longitude: eventData.longitude || null,
        tags: eventData.tags || [],
        notes: eventData.notes || ""
    };

    const updatedPhotos = dbContent.photos.map(p => {
        const pNormalized = p.file_name.replace(/\\/g, '/').toLowerCase();
        if (eventData.photoIds.some(id => id.replace(/\\/g, '/').toLowerCase() === pNormalized)) {
            return { 
              ...p, 
              event_id: newEventId, 
              trip_id: eventData.tripId || p.trip_id
            };
        }
        return p;
    });

    await saveToDatabase({
        ...dbContent,
        events: [...dbContent.events, newEvent],
        photos: updatedPhotos
    });
    setSelectedIds(new Set());
    showToast(`事件 "${eventData.title}" 已创建`, 'orange');
  };

  const handleCreateTrip = async (tripData) => {
    const newTripId = crypto.randomUUID();
    
    // Calculate duration
    let duration = 0;
    if (tripData.startDate && tripData.endDate) {
      const start = new Date(tripData.startDate);
      const end = new Date(tripData.endDate);
      const diffTime = Math.abs(end - start);
      duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive
    }

    const newTrip = {
      trip_id: newTripId,
      title: tripData.title || "未命名行程",
      rating: tripData.rating || 0,
      category: tripData.category || "旅行",
      city: tripData.city || "",
      date: tripData.startDate || new Date().toISOString().split('T')[0],
      startDate: tripData.startDate,
      endDate: tripData.endDate,
      duration: duration,
      spending: tripData.spending || 0,
      currency: tripData.currency || "CNY",
      latitude: tripData.latitude || null,
      longitude: tripData.longitude || null,
      tags: tripData.tags || [],
      notes: tripData.notes || "",
      cover_photo_id: null
    };

    // Link events to trip
    let eventIdsToLink = tripData.eventIds || [];
    if (eventIdsToLink.length === 0) {
       eventIdsToLink = Array.from(selectedIds)
         .filter(id => id.startsWith('event:'))
         .map(id => id.replace('event:', ''));
    }

    // Also link photos directly to trip if selected
    let photoPathsToLink = Array.from(selectedIds)
      .filter(id => !id.includes(':')) // Pure paths are photos
      .concat(tripData.photoIds || []);

    const updatedEvents = dbContent.events.map(e => {
       if (eventIdsToLink.includes(e.event_id)) {
           return { ...e, trip_id: newTripId };
       }
       return e;
    });

    const updatedPhotos = dbContent.photos.map(p => {
      const pNormalized = p.file_name.replace(/\\/g, '/');
      if (photoPathsToLink.some(path => path.replace(/\\/g, '/') === pNormalized)) {
          return { ...p, trip_id: newTripId };
      }
      return p;
    });

    await saveToDatabase({
      ...dbContent,
      trips: [...dbContent.trips, newTrip],
      events: updatedEvents,
      photos: updatedPhotos
    });
    
    setSelectedIds(new Set());
    showToast(`行程 "${tripData.title}" 已开启`, 'purple');
  };

  const handleAssignToTrip = async (tripId, eventIds) => {
    setAnimatingTargetId(`trip:${tripId}`);
    const updatedEvents = dbContent.events.map(e => {
        if (eventIds.includes(e.event_id)) {
            return { ...e, trip_id: tripId };
        }
        return e;
    });

    await saveToDatabase({
        ...dbContent,
        events: updatedEvents
    });
    setSelectedIds(new Set());
    setTimeout(() => setAnimatingTargetId(null), 1000);
    showToast(`成功将事件归类到行程`, 'trip');
  };

  const handleAssignToEvent = async (eventId, photoPaths) => {
    setAnimatingTargetId(`event:${eventId}`);
    const updatedPhotos = dbContent.photos.map(p => {
        const pNormalized = p.file_name.replace(/\\/g, '/').toLowerCase();
        if (photoPaths.some(path => path.replace(/\\/g, '/').toLowerCase() === pNormalized)) {
            return { ...p, event_id: eventId };
        }
        return p;
    });

    await saveToDatabase({
        ...dbContent,
        photos: updatedPhotos
    });
    setSelectedIds(new Set());
    setTimeout(() => setAnimatingTargetId(null), 1000);
    const event = dbContent.events.find(e => e.event_id === eventId);
    showToast(`成功将照片添加到事件 "${event?.title || '未知事件'}"`, 'orange');
  };

  const handleUpdateMetadata = async (newMetadata) => {
    await saveToDatabase({
      ...dbContent,
      ...newMetadata
    });
    showToast('属性列表已更新', 'blue');
  };

  const handleResetDatabase = async () => {
    console.log('--- RESET DATABASE START ---');
    if (!window.confirm(t('app.controls.resetConfirm'))) return;
    
    try {
      const basePhotos = (photoFiles || []).map(f => {
         // Try to find if we already have a UUID for this path in current state
         const existing = (dbContent.photos || []).find(p => p.file_name === f.path);
         return {
            photo_id: existing?.photo_id || (window.crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)),
            file_name: f.path,
            timestamp: existing?.timestamp || new Date().toISOString(),
            event_id: null
         };
      });

      console.log('Constructed basePhotos, length:', basePhotos.length);

      const resetContent = {
        trips: [],
        events: [],
        photos: basePhotos
      };
      
      console.log('Sending reset payload to drive...');
      await saveToDatabase(resetContent);
      console.log('Save to database call returned.');
      
      setActiveFilter({ type: 'all' });
      setSelectedIds(new Set());
      console.log('--- RESET DATABASE COMPLETE ---');
    } catch (err) {
      console.error('CRITICAL: Reset Database Failed:', err);
    }
  };

  const handleNavigate = (target) => {
    if (target.type === 'photo') {
      // Find index in the current filtered/displayed list for seamless browsing
      const index = displayedItems.findIndex(item => item.type === 'photo' && item.path === target.data.path);
      const photosOnly = displayedItems.filter(item => item.type === 'photo');
      const photoIndex = photosOnly.findIndex(p => p.path === target.data.path);
      
      setLightboxPhotos(photosOnly);
      setLightboxInitialIndex(photoIndex >= 0 ? photoIndex : 0);
      setIsLightboxOpen(true);
    } else {
      // Drill down into Trip or Event
      if (target.type === 'trip') {
        setSelectedTripId(target.id);
        setActiveFilter({ type: 'all' }); // 默认进入行程后显示该行程的所有照片
      } else {
        setActiveFilter({ 
          type: target.type, 
          id: target.id 
        });
      }
    }
  };



  // Hierarchy Logic: What to show in the grid
  const displayedItems = useMemo(() => {
    // 基础过滤：如果选定了行程，则只显示该行程下的内容
    let basePhotos = enrichedPhotos;
    let baseEvents = dbContent.events || [];
    let baseTrips = dbContent.trips || [];

    if (selectedTripId) {
      const tripEventIds = new Set(
        (dbContent.events || [])
          .filter(e => String(e.trip_id) === String(selectedTripId))
          .map(e => String(e.event_id))
      );

      basePhotos = enrichedPhotos.filter(p => 
        String(p.trip_id) === String(selectedTripId) || 
        (p.event_id && tripEventIds.has(String(p.event_id)))
      );

      baseEvents = (dbContent.events || []).filter(e => String(e.trip_id) === String(selectedTripId));
      // 在行程内视图下，不再显示其他行程列表
      baseTrips = [];
    }

    // --- Filter logic (Multi-select) ---
    const isFiltering = filterState.unclassified || filterState.noCity;
    const itemsToProcess = isFiltering 
      ? basePhotos.filter(p => {
          if (filterState.unclassified && !p.category) return true;
          if (filterState.noCity && !p.city) return true;
          return false;
        })
      : null;

    if (itemsToProcess) {
       const sorted = [...itemsToProcess].sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));
       const result = [];
       let lastDate = null;
       const seenPaths = new Set();
       sorted.forEach(photo => {
         const pathKey = photo.path.toLowerCase();
         if (seenPaths.has(pathKey)) return;
         seenPaths.add(pathKey);
         
         const currentDate = photo.date || 'unknown';
         if (!filterState.isWallMode && currentDate !== lastDate) {
           result.push({
             type: 'date-header',
             id: `header-filter-multi-${currentDate}`,
             title: formatDateHeader(currentDate, language),
             date: currentDate
           });
           lastDate = currentDate;
         }
         result.push({ ...photo, type: 'photo' });
       });
       return result;
    }

    // 1. If we are focused on a specific Event
    if (activeFilter.type === 'event') {
       const eventPhotos = basePhotos
         .filter(p => String(p.event_id) === String(activeFilter.id))
         .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));

       const result = [];
       let lastDate = null;
       eventPhotos.forEach(photo => {
         const currentDate = photo.date || 'unknown';
         if (!filterState.isWallMode && currentDate !== lastDate) {
           result.push({
             type: 'date-header',
             id: `header-event-${currentDate}`,
             title: formatDateHeader(currentDate, language),
             date: currentDate
           });
           lastDate = currentDate;
         }
         result.push({ ...photo, type: 'photo' });
       });
       return result;
    }

    // 2.5 Show ALL Events (Categorized View)
    if (activeFilter.type === 'all-events') {
      return baseEvents.map(event => ({
        type: 'event',
        id: event.event_id,
        title: event.title,
        item: event,
        photos: basePhotos.filter(p => p.event_id === event.event_id)
      }));
    }

    // 2.6 Show ALL Albums/Trips (Categorized View)
    if (activeFilter.type === 'all-albums' || activeFilter.type === 'map') {
      return baseTrips.map(trip => ({
        type: 'trip',
        id: trip.trip_id,
        title: trip.title,
        item: trip,
        photos: basePhotos.filter(p => {
          const isDirect = String(p.trip_id) === String(trip.trip_id);
          const isIndirect = p.event_id && dbContent.events.some(e => 
            String(e.event_id) === String(p.event_id) && String(e.trip_id) === String(trip.trip_id)
          );
          return isDirect || isIndirect;
        }),
        associatedEvents: dbContent.events.filter(e => String(e.trip_id) === String(trip.trip_id))
      }));
    }

    // 3. Default "All Memories" / Archive View
    // 如果在行程模式下，显示该行程的所有事件 + 未分类照片
    if (selectedTripId) {
      const result = [];
      // 1. 添加该行程的所有事件 (如果不是照片墙模式)
      if (!filterState.isWallMode) {
        baseEvents.forEach(event => {
          result.push({
            type: 'event',
            id: event.event_id,
            title: event.title,
            item: event,
            photos: basePhotos.filter(p => p.event_id === event.event_id)
          });
        });
      }

      // 2. 添加该行程下的未分类照片 (带日期分组)
      const unclassifiedPhotos = basePhotos
        .filter(p => filterState.showClassified || !p.event_id)
        .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));

      let lastDate = null;
      unclassifiedPhotos.forEach(photo => {
        const currentDate = photo.date || 'unknown';
        if (!filterState.isWallMode && currentDate !== lastDate) {
          result.push({
            type: 'date-header',
            id: `header-${currentDate}`,
            title: formatDateHeader(currentDate, language),
            date: currentDate
          });
          lastDate = currentDate;
        }
        result.push({ ...photo, type: 'photo' });
      });

      return result;
    }

    // 全局视图首页逻辑
    const result = [];
    if (!filterState.isWallMode) {
      baseTrips.forEach(trip => {
        result.push({
          type: 'trip',
          id: trip.trip_id,
          title: trip.title,
          item: trip,
          photos: enrichedPhotos.filter(p => {
            const isDirect = String(p.trip_id) === String(trip.trip_id);
            const isIndirect = p.event_id && dbContent.events.some(e => 
              String(e.event_id) === String(p.event_id) && String(e.trip_id) === String(trip.trip_id)
            );
            return isDirect || isIndirect;
          }),
          associatedEvents: dbContent.events.filter(e => String(e.trip_id) === String(trip.trip_id))
        });
      });
    }

    // 全局视图下不在任何 Trip 文件夹里的独立事件 (如果不是照片墙模式)
    if (!filterState.isWallMode) {
      baseEvents.filter(e => !e.trip_id).forEach(event => {
        result.push({
          type: 'event',
          id: event.event_id,
          title: event.title,
          item: event,
          photos: enrichedPhotos.filter(p => p.event_id === event.event_id)
        });
      });
    }


    // Legacy single-select filter fallback
    if (activeFilter.type === 'favorites') {
      const favPhotos = basePhotos.filter(p => p.rating >= 9);
      const result = [];
      let lastDate = null;
      const seenFavPaths = new Set();
      favPhotos.sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date)).forEach(photo => {
        const pathKey = photo.path.toLowerCase();
        if (seenFavPaths.has(pathKey)) return;
        seenFavPaths.add(pathKey);
        
        const currentDate = photo.date || 'unknown';
        if (!filterState.isWallMode && currentDate !== lastDate) {
          result.push({
            type: 'date-header',
            id: `header-fav-${currentDate}`,
            title: formatDateHeader(currentDate, language),
            date: currentDate
          });
          lastDate = currentDate;
        }
        result.push({ ...photo, type: 'photo' });
      });
      return result;
    }

    // 全局视图下的照片列表 (根据开关决定是否显示已归类的)
    const lonelyPhotos = basePhotos
      .filter(p => filterState.showClassified || (!p.event_id && !p.trip_id))
      .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));

    let lastGlobalDate = null;
    const seenGlobalPaths = new Set();
    lonelyPhotos.forEach(photo => {
      const pathKey = photo.path.toLowerCase();
      if (seenGlobalPaths.has(pathKey)) return;
      seenGlobalPaths.add(pathKey);

      const currentDate = photo.date || 'unknown';
      if (!filterState.isWallMode && currentDate !== lastGlobalDate) {
        result.push({
          type: 'date-header',
          id: `header-global-${currentDate}`,
          title: formatDateHeader(currentDate, language),
          date: currentDate
        });
        lastGlobalDate = currentDate;
      }
      result.push({ ...photo, type: 'photo' });
    });

    return result;
  }, [enrichedPhotos, activeFilter, dbContent, selectedTripId, filterState]);

  return (
    <div className="min-h-screen bg-[#0b0c10] text-[#f8f9fa] flex flex-col items-center justify-center relative overflow-hidden font-sans">
      
      {/* Dynamic Background Blur effects based on mode */}
      <motion.div 
        animate={{
          scale: appMode === 'gallery' ? 1.5 : 1,
          opacity: appMode === 'gallery' ? 0.3 : 0.6,
          y: appMode === 'gallery' ? -300 : 0
        }}
        transition={{ duration: 1.5, ease: "anticipate" }}
        className="fixed top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[140px] pointer-events-none z-0" 
      />
      <motion.div 
        animate={{
          scale: appMode === 'gallery' ? 0 : 1,
          opacity: appMode === 'gallery' ? 0 : 0.6,
        }}
        transition={{ duration: 1.0, ease: "anticipate" }}
        className="fixed bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none z-0" 
      />
      
      {/* ----------------- HOME VIEW ----------------- */}
      <AnimatePresence mode="wait">
        {appMode === 'home' && (
          <motion.div 
            key="home"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
            transition={{ duration: 0.6, ease: "circInOut" }}
            className="text-center z-10 w-full max-w-4xl px-6"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex items-center justify-center p-6 bg-white/5 rounded-[2rem] mb-12 ring-2 ring-white/10 shadow-2xl backdrop-blur-3xl"
            >
              <FolderOpen size={64} className="text-blue-400 drop-shadow-lg" />
            </motion.div>

            <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 bg-gradient-to-br from-white via-white to-neutral-500 bg-clip-text text-transparent drop-shadow-sm">
              {t('app.title')}
            </h1>
            <p className="text-xl md:text-2xl text-neutral-400 max-w-2xl mx-auto mb-16 font-light leading-relaxed">
              {t('app.subtitle')} <br className="hidden md:block"/>
              {t('app.zeroUploads')}
            </p>
            
            <motion.button
              onClick={handleInitialize}
              disabled={isScanning}
              whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
              whileTap={{ scale: 0.95 }}
              className={clsx(
                  "relative group px-10 py-5 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl text-xl font-medium transition-all shadow-2xl flex items-center justify-center gap-4 mx-auto",
                  isScanning && "opacity-50 cursor-not-allowed"
              )}
            >
              {isScanning ? (
                <>
                  <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                  {t('app.grantingAccess')}
                </>
              ) : (
                <>
                  <Play size={24} className="text-blue-400 fill-blue-400/20 group-hover:fill-blue-400 transition-colors" />
                  {hasPersistedHandle ? t('app.restoreArchive') : t('app.selectFolder')}
                </>
              )}
            </motion.button>
            
            {hasPersistedHandle && !isScanning && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={async () => {
                   const success = await initWorkspace();
                   if (success) setAppMode('gallery');
                }}
                className="mt-6 mx-auto block text-sm font-semibold text-neutral-400 hover:text-white underline decoration-white/30 decoration-dashed transition-colors"
              >
                {t('app.reselectFolder') || "重新选择文件夹"}
              </motion.button>
            )}

            <AnimatePresence>
              {error && (
                <motion.p 
                  initial={{ opacity: 0, y: 10, scale: 0.9 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-8 text-red-400 font-medium max-w-md mx-auto p-4 bg-red-500/10 rounded-2xl border border-red-500/20 shadow-xl backdrop-blur-md"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ----------------- GALLERY LAYOUT (THE GATHERING) ----------------- */}
      <AnimatePresence>
        {appMode === 'gallery' && (
          <motion.div 
            key="gallery"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-20 flex flex-col bg-black/40 backdrop-blur-3xl"
          >
            <LayoutGroup id="main-archive-layout">
            {/* ── Design-Specific Top Header ── */}
            <header className="w-full h-20 shrink-0 bg-[#0b1014] border-b border-white/5 flex items-center justify-between px-10 z-[100]">
              <div className="flex items-center gap-12">
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => {
                  setSelectedTripId(null);
                  setActiveFilter({ type: 'all' });
                }}>
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform">
                    <Archive size={20} className="text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-black tracking-tight text-white leading-none">Trip Archive</span>
                    {selectedTripId && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">{t('sidebar.trips')}</span>
                        <ChevronRight size={10} className="text-neutral-700" />
                        <span className="text-[10px] text-blue-400 uppercase tracking-widest font-black truncate max-w-[120px]">
                          {dbContent.trips.find(t_item => String(t_item.trip_id) === String(selectedTripId))?.title || t('grid.unnamedTrip')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <nav className="hidden md:flex items-center gap-8">
                  <NavLink 
                    label={t('app.nav.albums')} 
                    active={activeFilter.type === 'all-albums' && !selectedTripId}
                    onClick={() => {
                      setSelectedTripId(null);
                      setActiveFilter({ type: 'all-albums' });
                    }}
                  />
                  <NavLink 
                    label={t('app.nav.events')} 
                    active={activeFilter.type === 'all-events'}
                    onClick={() => setActiveFilter({ type: 'all-events' })}
                  />
                  <NavLink 
                    label={t('app.nav.allPhotos')} 
                    active={activeFilter.type === 'all'}
                    onClick={() => {
                      setActiveFilter({ type: 'all' });
                    }} 
                  />
                  <NavLink
                    label={t('app.nav.map')}
                    active={activeFilter.type === 'map'}
                    onClick={() => {
                      setSelectedTripId(null);
                      setActiveFilter({ type: 'map' });
                    }}
                  />
                </nav>
              </div>

              <div className="flex items-center gap-6">
                {isScanning ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-neutral-400 text-xs font-bold">
                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    {language === 'zh' ? '扫描中...' : 'Scanning...'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {hasPersistedHandle && !dbHandle ? (
                      <button
                        onClick={handleInitialize}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 hover:bg-blue-600/30 transition-all text-xs font-bold animate-pulse"
                      >
                        <FolderOpen size={14} />
                        {language === 'zh' ? '恢复档案' : 'Restore Archive'}
                      </button>
                    ) : (
                      <button
                        onClick={async () => { await initWorkspace(); }}
                        title={language === 'zh' ? (dbHandle ? '重新选择文件夹' : '选择文件夹') : (dbHandle ? 'Reselect Folder' : 'Select Folder')}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:bg-white/10 transition-all text-xs font-bold"
                      >
                        <FolderOpen size={14} />
                        {dbHandle
                          ? (language === 'zh' ? '重新选择' : 'Reselect')
                          : (language === 'zh' ? '选择文件夹' : 'Select Folder')}
                      </button>
                    )}
                    {dbHandle && (
                      <button
                        onClick={resyncExif}
                        title={language === 'zh' ? '重新读取照片信息' : 'Re-read photo info'}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:bg-white/10 transition-all text-xs font-bold"
                      >
                        <RefreshCw size={14} />
                        {language === 'zh' ? '重新读取' : 'Resync'}
                      </button>
                    )}
                  </div>
                )}
                <div className="relative group">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-[#0d7ff2] transition-colors" />
                  <input
                    type="text"
                    placeholder={t('app.searchPlaceholder')}
                    className="w-80 h-12 pl-12 pr-4 bg-slate-800/50 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0d7ff2] focus:border-transparent transition-all font-medium"
                  />
                </div>
                
                <div className="relative">
                  <div 
                    onClick={() => setIsAvatarMenuOpen(!isAvatarMenuOpen)}
                    className="h-10 w-10 rounded-full bg-[#0d7ff2]/20 border border-[#0d7ff2]/40 flex items-center justify-center text-[#0d7ff2] font-bold overflow-hidden active:scale-95 transition-transform cursor-pointer ring-offset-2 ring-offset-black hover:ring-2 hover:ring-[#0d7ff2]/50 transition-all"
                  >
                    <img src="https://ui-avatars.com/api/?name=User&background=333&color=fff" alt="Avatar" className="w-full h-full object-cover" />
                  </div>

                  <AnimatePresence>
                    {isAvatarMenuOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-[140]" 
                          onClick={() => setIsAvatarMenuOpen(false)} 
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-3 w-56 bg-[#1a1b1e]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2 z-[150] ring-1 ring-black/50"
                        >
                          <div className="px-3 py-2 border-b border-white/5 mb-1">
                            <p className="text-xs font-bold text-white">{t('app.account.title')}</p>
                            <p className="text-[10px] text-neutral-500">{t('app.account.offlineMode')}</p>
                          </div>
                          
                          <button
                            onClick={() => { setIsAvatarMenuOpen(false); showToast(t('app.account.settingsWip'), 'blue'); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-all group text-neutral-400"
                          >
                            <Settings size={18} className="group-hover:rotate-45 transition-transform" />
                            <span className="text-sm font-medium text-neutral-200 group-hover:text-white">{t('app.account.systemSettings')}</span>
                          </button>

                          <div className="px-2 py-1">
                            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl">
                              <button 
                                onClick={() => setLanguage('zh')}
                                className={clsx(
                                  "flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all",
                                  language === 'zh' ? "bg-blue-600 text-white shadow-lg" : "text-neutral-500 hover:text-neutral-300"
                                )}
                              >
                                中文
                              </button>
                              <button 
                                onClick={() => setLanguage('en')}
                                className={clsx(
                                  "flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all",
                                  language === 'en' ? "bg-blue-600 text-white shadow-lg" : "text-neutral-500 hover:text-neutral-300"
                                )}
                              >
                                EN
                              </button>
                            </div>
                          </div>

                          <button
                            onClick={() => { setIsAvatarMenuOpen(false); setIsPropertyModalOpen(true); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-all group text-blue-400"
                          >
                            <SlidersHorizontal size={18} className="group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium text-neutral-200 group-hover:text-white">{t('app.account.propertyEdge')}</span>
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </header>

            {/* Content Area Rendering Logic */}
            {activeFilter.type === 'all-albums' ? (
              <AlbumsView
                trips={displayedItems}
                onNavigate={handleNavigate}
                onContextMenu={onMenuAction}
                onUpdateTrip={handleUpdateItem}
                onCreateNew={() => setIsTripModalOpen(true)}
                t={t}
              />
            ) : activeFilter.type === 'map' ? (
              <MapView
                trips={displayedItems}
                allPhotos={enrichedPhotos}
                onNavigate={handleNavigate}
                t={t}
              />
            ) : (
              <div className={`flex-1 flex flex-col min-h-0 ${activeFilter.type === 'all' ? 'bg-[#101922]' : ''}`}>
            {/* Main Layout Area */}
            <div className="flex-1 flex overflow-hidden">
              {/* Sidebar: only show in table view */}
              {viewMode === 'table' && (
                <Sidebar
                  dbContent={dbContent}
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                  photos={enrichedPhotos}
                  t={t}
                />
              )}

              <div className="flex-1 flex flex-col relative">
                {/* Virtualized Infinite Grid */}
                <VirtualGrid
                  items={displayedItems}
                  onContextMenu={handleItemContextMenu}
                  selectedIds={selectedIds}
                  onToggleSelection={toggleSelection}
                  onToggleDateSelection={handleToggleDateSelection}
                  onNavigate={handleNavigate}
                  onUpdateItem={handleUpdateItem}
                  animatingTargetId={animatingTargetId}
                  metadata={dbContent}
                  t={t}
                  subHeader={
                    <div className="px-0 pt-12 pb-8 flex items-center justify-between">
                      <div className="space-y-2">
                        <h2 className="text-4xl font-black tracking-tight text-white">{t('app.pageTitle')}</h2>
                        <div className="flex items-center gap-3 text-neutral-500 font-bold text-sm">
                          <Calendar size={14} />
                          <span>August 12 - August 24</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-700 mx-1" />
                          <span>{t('app.imagesCount').replace('{{count}}', dbContent.photos.length)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleResetDatabase}
                          className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs font-bold text-red-400 hover:bg-red-500/20 transition-all active:scale-95"
                          title={t('app.controls.resetDb')}
                        >
                          <Trash2 size={16} />
                          {t('app.controls.resetDb')}
                        </button>
                        <button
                          onClick={() => setFilterState(prev => ({ ...prev, showClassified: !prev.showClassified }))}
                          className={clsx(
                            "flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all active:scale-95 border",
                            filterState.showClassified 
                              ? "bg-blue-500/20 border-blue-500/40 text-blue-400" 
                              : "bg-white/5 border-white/10 text-neutral-500 hover:text-neutral-300"
                          )}
                        >
                          <div className={clsx(
                            "w-2 h-2 rounded-full",
                            filterState.showClassified ? "bg-blue-400 animate-pulse" : "bg-neutral-700"
                          )} />
                          {t('app.controls.showClassified')}
                        </button>
                        <button
                          onClick={() => setFilterState(prev => ({ ...prev, isWallMode: !prev.isWallMode }))}
                          className={clsx(
                            "flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all active:scale-95 border",
                            filterState.isWallMode 
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
                              : "bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)]"
                          )}
                        >
                          {filterState.isWallMode ? (
                            <>
                              <LayoutGrid size={16} className="animate-pulse" />
                              <span>{t('app.controls.wallMode')}</span>
                            </>
                          ) : (
                            <>
                              <Clock size={16} />
                              <span>{t('app.controls.timelineMode')}</span>
                            </>
                          )}
                        </button>
                        <FilterMenu
                          filterState={filterState}
                          onFilterChange={setFilterState}
                          photos={enrichedPhotos}
                          t={t}
                        />
                        <button 
                          onClick={handleSyncFromSmartTrip}
                          className="flex items-center gap-2 px-4 py-3 bg-purple-600/20 text-purple-400 rounded-2xl hover:bg-purple-600/30 font-bold transition-all border border-purple-500/30 text-xs shadow-lg shadow-purple-600/10 active:scale-95"
                        >
                          <RefreshCw size={16} />
                          {t('app.syncSmartTrip') || '同步 Smart Trip'}
                        </button>
                        <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 rounded-2xl text-sm font-bold text-white hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 active:scale-95">
                          <Plus size={18} />
                          {t('app.controls.upload')}
                        </button>
                      </div>
                    </div>
                  }
                />

                <ActionBar 
                  selectedIds={selectedIds}
                  onClear={() => setSelectedIds(new Set())}
                  onMerge={() => onMenuAction('create-event', { type: 'photo', path: Array.from(selectedIds)[0] })}
                  onDownload={() => showToast('Starting download...', 'trip')}
                />
              </div>
            </div>
            </div>
            )}

            <ContextMenu 
              menu={contextMenu} 
              onClose={closeMenu} 
              onAction={onMenuAction} 
              selectionCount={selectedIds.size}
              trips={dbContent.trips}
              events={dbContent.events}
              categories={metadata.categories}
              cities={metadata.cities}
              selectedTripId={selectedTripId}
              t={t}
            />

            <PropertyManagerModal
              isOpen={isPropertyModalOpen}
              onClose={() => setIsPropertyModalOpen(false)}
              metadata={metadata}
              onUpdate={handleUpdateMetadata}
              t={t}
            />

            <CreateEventModal 
              isOpen={isEventModalOpen}
              onClose={() => setIsEventModalOpen(false)}
              photos={activePhotos}
              metadata={metadata}
              onCreate={handleCreateEvent}
            />

            <CreateTripModal
              isOpen={isTripModalOpen}
              onClose={() => setIsTripModalOpen(false)}
              trips={dbContent.trips}
              events={dbContent.events.filter(e => !e.trip_id)}
              metadata={metadata}
              initialSelectedIds={Array.from(selectedIds)
                .filter(id => typeof id === 'string' && id.startsWith('event:'))
                .map(id => id.replace('event:', ''))}
              onCreate={handleCreateTrip}
              onAssign={handleAssignToTrip}
              allPhotos={enrichedPhotos}
            />

            <DetailModal
              isOpen={isDetailModalOpen}
              onClose={() => {
                setIsDetailModalOpen(false);
                setDetailItem(null);
              }}
              type={detailItem?.type}
              item={detailItem?.data}
              allPhotos={enrichedPhotos}
              metadata={dbContent}
              onUpdate={handleUpdateItem}
            />

            <Lightbox 
              isOpen={isLightboxOpen}
              onClose={() => setIsLightboxOpen(false)}
              photos={lightboxPhotos}
              initialIndex={lightboxInitialIndex}
              events={dbContent.events}
            />


            {/* Global Toast (Glow Style) - Fixed Insertion */}
            <AnimatePresence>
              {toast && (
                <motion.div
                  initial={{ y: 50, opacity: 0, scale: 0.9 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 20, opacity: 0, scale: 0.9 }}
                  className={clsx(
                    "fixed top-24 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center gap-3",
                    toast.type === 'trip' || toast.type === 'purple'
                      ? "bg-purple-500/10 border-purple-500/30 text-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.2)]" 
                      : toast.type === 'orange' || toast.type === 'event'
                      ? "bg-orange-500/10 border-orange-500/30 text-orange-400 shadow-[0_0_30px_rgba(249,115,22,0.2)]"
                      : "bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.2)]"
                  )}
                >
                  <CheckCircle2 size={18} />
                  <span className="text-sm font-bold">{toast.message}</span>
                </motion.div>
              )}
            </AnimatePresence>
            </LayoutGroup>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
