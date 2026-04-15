import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { isAdmin } from '../utils/admin';
import { Navigate } from 'react-router-dom';
import { fetchRouteDuration } from '../utils/transitHelpers';

export default function AdminPage() {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState('api');
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unusedImages, setUnusedImages] = useState([]);
  const [selectedPaths, setSelectedPaths] = useState(new Set());
  const [scanning, setScanning] = useState(false);
  const [cleanupStatus, setCleanupStatus] = useState('');
  const [showSql, setShowSql] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  // API monitoring state
  const [apiSettings, setApiSettings] = useState({});
  const [apiStats, setApiStats] = useState({});
  const [apiLogs, setApiLogs] = useState([]);
  const [apiSaving, setApiSaving] = useState(false);
  const [apiLimitInputs, setApiLimitInputs] = useState({});

  // Repair state
  const [repairLog, setRepairLog] = useState([]);
  const [repairingTripId, setRepairingTripId] = useState(null);

  // Security check
  if (!isAdmin(state.user)) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    if (activeTab === 'itineraries') loadAllTrips();
    if (activeTab === 'api') loadApiData();
  }, [activeTab]);

  useEffect(() => { loadApiData(); }, []);

  const loadAllTrips = async () => {
    setLoading(true);
    try {
      // 1. 获取所有行程 (管理后台不应限制 user_id)
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (tripError) {
        console.error('[Admin] Trips fetch error:', tripError);
        setCleanupStatus(`获取行程失败: ${tripError.message}。这很可能是后端 RLS 策略拒绝了管理员访问。`);
        setShowSql(true);
      }

      // 2. 获取所有用户的 Profile (用于匹配 Email)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email');

      if (profileError) {
        console.warn('[Admin] Profiles table issue (ignore if not setup):', profileError);
      }

      const profileMap = {};
      profileData?.forEach(p => profileMap[p.id] = p.email);

      // 处理空数据保护
      const validTripData = tripData || [];
      const mergedTrips = validTripData.map(t => ({
        ...t,
        profiles: { email: profileMap[t.user_id] }
      }));

      setTrips(mergedTrips);
      
      // 诊断：如果一个行程都看不到，或者只能看到自己的数据，自动显示 SQL 指引
      if (mergedTrips.length === 0 || !profileData || profileData.length === 0) {
          setShowSql(true);
      }
      
      if (mergedTrips.length === 0 && !tripError) {
          setCleanupStatus('注意：数据库中未发现任何行程。如果确实有其他用户的数据，则说明由于 RLS 策略，管理员暂时只能看到自己。请运行下方的 SQL 脚本。');
      }
    } catch (err) {
      console.error('[Admin] Critical fetch failure:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrip = async (tripId) => {
    if (!window.confirm('确定要删除这个行程吗？此操作不可撤销，且会同时清理该行程所有附件图片。')) return;

    setLoading(true);
    try {
      // 1. Fetch trip data to collect attachment paths before deleting
      const { data: tripRow } = await supabase
        .from('trips')
        .select('trip_data')
        .eq('id', tripId)
        .single();

      // 2. Collect all attachment storage paths
      const attachmentPaths = [];
      tripRow?.trip_data?.days?.forEach(day => {
        day.stops?.forEach(stop => {
          stop.attachments?.forEach(att => {
            if (att.path) attachmentPaths.push(att.path);
          });
        });
      });

      // 3. Delete attachment files from Supabase Storage (best-effort)
      if (attachmentPaths.length > 0) {
        const { error: storageErr } = await supabase.storage
          .from('trip-media')
          .remove(attachmentPaths);
        if (storageErr) console.warn('[Admin] Storage cleanup partial error:', storageErr);
      }

      // 4. Delete the trip record
      const { error } = await supabase.from('trips').delete().eq('id', tripId);
      if (error) throw error;

      alert(`行程已删除${attachmentPaths.length > 0 ? `，同时清理了 ${attachmentPaths.length} 个附件文件` : ''}`);
      loadAllTrips();
    } catch (err) {
      console.error('Delete error:', err);
      alert('删除失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Helper: recursively list every file path in a bucket ---
  // Returns objects { path, created_at } so we can filter by age
  const listAllFiles = async (bucket, prefix = '') => {
    const allPaths = [];
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
    if (error || !data) return allPaths;

    for (const item of data) {
      if (!item.id) {
        // item has no id → it's a virtual folder, recurse into it
        const subPrefix = prefix ? `${prefix}/${item.name}` : item.name;
        const subFiles = await listAllFiles(bucket, subPrefix);
        allPaths.push(...subFiles);
      } else {
        // real file
        const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
        allPaths.push({ path: fullPath, created_at: item.created_at });
      }
    }
    return allPaths;
  };

  const scanForUnusedImages = async () => {
    setScanning(true);
    setCleanupStatus('正在递归扫描存储桶（包含子文件夹）...');
    try {
      const bucketName = 'trip-media';

      // 1. Recursively get ALL file paths in the bucket
      const allFileEntries = await listAllFiles(bucketName);
      // Ignore files uploaded within the last 10 minutes — they may not yet be written to DB
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      const allFilePaths = allFileEntries
        .filter(f => !f.created_at || new Date(f.created_at).getTime() < tenMinutesAgo)
        .map(f => f.path);
      setCleanupStatus(`已找到 ${allFileEntries.length} 个文件（过滤掉 ${allFileEntries.length - allFilePaths.length} 个10分钟内新上传），正在对比数据库...`);

      // 2. Get all image URLs / paths from database
      const { data: allTrips } = await supabase.from('trips').select('thumb, trip_data');

      const usedPaths = new Set();

      allTrips?.forEach(t => {
        // Trip thumbnail (root-level file, only filename)
        if (t.thumb && t.thumb.includes(bucketName)) {
          const fileName = t.thumb.split('/').pop().split('?')[0];
          usedPaths.add(fileName);
        }

        const tripData = t.trip_data;
        tripData?.days?.forEach(day => {
          day.stops?.forEach(stop => {
            // Stop cover photo (root-level file, only filename)
            if (stop.photo && stop.photo.includes(bucketName)) {
              const fileName = stop.photo.split('/').pop().split('?')[0];
              usedPaths.add(fileName);
            }

            // Stop attachments (nested paths like userId/tripId/stopId/attachments/file)
            stop.attachments?.forEach(att => {
              if (att.path) {
                // We stored the full path at upload time
                usedPaths.add(att.path);
              } else if (att.url && att.url.includes(bucketName)) {
                // Fallback: extract filename from URL
                const fileName = att.url.split('/').pop().split('?')[0];
                usedPaths.add(fileName);
              }
            });
          });
        });
      });

      // 3. Find unused
      const unused = allFilePaths.filter(path =>
        path !== '.emptyFolderPlaceholder' &&
        !usedPaths.has(path)
      );

      setUnusedImages(unused);

      // Safety guard
      if (usedPaths.size === 0 && allFilePaths.length > 0) {
        setCleanupStatus('⚠️ 危险警告：扫描发现 0 个已使用图片，但存储桶中有文件。这说明权限不足，无法读取行程数据。请【不要】执行删除！');
        setUnusedImages([]);
      } else {
        setCleanupStatus(
          `扫描完成。对比了 ${allTrips?.length || 0} 个行程，` +
          `存储桶共 ${allFilePaths.length} 个文件（含附件子目录），` +
          `找到 ${unused.length} 个未引用的孤立文件。`
        );
      }
    } catch (err) {
      console.error('Scan error:', err);
      setCleanupStatus('扫描失败: ' + err.message);
    } finally {
      setScanning(false);
    }
  };

  // After scan, auto-select all found orphans
  const handleScanClick = async () => {
    setSelectedPaths(new Set());
    await scanForUnusedImages();
  };

  const getPublicUrl = (path) => {
    const { data } = supabase.storage.from('trip-media').getPublicUrl(path);
    return data?.publicUrl || '';
  };

  const toggleSelect = (path) => {
    setSelectedPaths(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };

  const selectAll = () => setSelectedPaths(new Set(unusedImages));
  const deselectAll = () => setSelectedPaths(new Set());

  const deleteUnusedImages = async () => {
    if (!selectedPaths.size) return;
    if (!confirm(`确定要删除选中的 ${selectedPaths.size} 个文件吗？此操作不可撤销。`)) return;

    const toDelete = Array.from(selectedPaths);
    setScanning(true);
    setCleanupStatus('正在删除...');
    try {
      const { error } = await supabase.storage.from('trip-media').remove(toDelete);
      if (error) throw error;

      const remaining = unusedImages.filter(p => !selectedPaths.has(p));
      setUnusedImages(remaining);
      setSelectedPaths(new Set());
      setCleanupStatus(`成功删除 ${toDelete.length} 个文件，剩余 ${remaining.length} 个待处理。`);
    } catch (err) {
      setCleanupStatus('删除失败: ' + err.message);
    } finally {
      setScanning(false);
    }
  };

  // ── API monitoring helpers ─────────────────────────────────

  const API_TYPES = ['places_search', 'place_details', 'directions'];

  const loadApiData = async () => {
    // Load settings
    const { data: settings } = await supabase.from('system_settings').select('key, value');
    const map = {};
    settings?.forEach(s => { map[s.key] = s.value; });
    setApiSettings(map);
    setApiLimitInputs({
      daily_api_limit: map.daily_api_limit ?? 200,
      per_2min_api_limit: map.per_2min_api_limit ?? 20,
    });

    // Load stats
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);

    const stats = {};
    await Promise.all(API_TYPES.map(async (type) => {
      const [{ count: today }, { count: recent }, { count: totalBlocked }] = await Promise.all([
        supabase.from('api_logs').select('*', { count: 'exact', head: true })
          .eq('api_type', type).eq('status', 'success').gte('created_at', startOfDay.toISOString()),
        supabase.from('api_logs').select('*', { count: 'exact', head: true })
          .eq('api_type', type).eq('status', 'success').gte('created_at', twoMinAgo.toISOString()),
        supabase.from('api_logs').select('*', { count: 'exact', head: true })
          .eq('api_type', type).eq('status', 'blocked').gte('created_at', startOfDay.toISOString()),
      ]);
      stats[type] = { today: today || 0, recent: recent || 0, blocked: totalBlocked || 0 };
    }));
    setApiStats(stats);

    // Recent logs
    const { data: logs } = await supabase.from('api_logs')
      .select('api_type, status, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    setApiLogs(logs || []);
  };

  const toggleApiSwitch = async (key, currentValue) => {
    const newValue = currentValue === true || currentValue === 'true' ? 'false' : 'true';
    setApiSaving(true);
    await supabase.from('system_settings')
      .update({ value: newValue, updated_at: new Date().toISOString() })
      .eq('key', key);
    await loadApiData();
    setApiSaving(false);
  };

  const saveLimits = async () => {
    setApiSaving(true);
    await Promise.all([
      supabase.from('system_settings').update({ value: String(apiLimitInputs.daily_api_limit), updated_at: new Date().toISOString() }).eq('key', 'daily_api_limit'),
      supabase.from('system_settings').update({ value: String(apiLimitInputs.per_2min_api_limit), updated_at: new Date().toISOString() }).eq('key', 'per_2min_api_limit'),
    ]);
    await loadApiData();
    setApiSaving(false);
  };

  const API_SWITCH_KEYS = ['places_search_enabled', 'place_details_enabled', 'directions_enabled'];

  const toggleAllApis = async (enable) => {
    setApiSaving(true);
    const value = enable ? 'true' : 'false';
    await Promise.all(
      API_SWITCH_KEYS.map(key =>
        supabase.from('system_settings')
          .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      )
    );
    await loadApiData();
    setApiSaving(false);
  };


  // ── Repair helpers ─────────────────────────────────────

  function getStreetViewThumb(lat, lng) {
    return new Promise((resolve) => {
      if (!window.google?.maps?.StreetViewService) { resolve(null); return; }
      const sv = new window.google.maps.StreetViewService();
      sv.getPanorama({ location: { lat: Number(lat), lng: Number(lng) }, radius: 100 }, (data, status) => {
        if (status === 'OK') {
          const pano = data.location.pano;
          const heading = data.links?.[0]?.heading ?? 90;
          resolve(`https://streetviewpixels-pa.googleapis.com/v1/thumbnail?panoid=${pano}&cb_client=maps_sv.tactile.gps&w=320&h=240&yaw=${heading}&pitch=0&thumbfov=100`);
        } else {
          resolve(null);
        }
      });
    });
  }

  const repairTripData = async (trip) => {
    if (!window.google?.maps) {
      alert('Google Maps 未就绪，请先打开一个行程页面再回来重试');
      return;
    }
    setRepairingTripId(trip.id);
    setRepairLog([`▶ 开始修复: ${trip.title}`]);

    const { data: tripDays, error } = await supabase
      .from('trip_days')
      .select('days_v2 ( id, date, stops_data )')
      .eq('trip_id', trip.id);

    if (error) {
      setRepairLog(l => [...l, `加载失败: ${error.message}`]);
      setRepairingTripId(null);
      return;
    }

    let totalPhotos = 0;
    let totalTransit = 0;
    const lines = [];

    for (const td of (tripDays || [])) {
      const day = td.days_v2;
      if (!day || !Array.isArray(day.stops_data)) continue;

      const stops = day.stops_data.map(s => ({ ...s }));
      let changed = false;

      // Fill missing photos
      for (const stop of stops) {
        if (!stop.photo && stop.lat && stop.lng) {
          const url = await getStreetViewThumb(stop.lat, stop.lng);
          if (url) {
            stop.photo = url;
            changed = true;
            totalPhotos++;
            lines.push(`  📸 ${day.date} · ${stop.name || stop.location || 'Stop'}: 补充图片`);
          }
        }
      }

      // Fill missing transit between consecutive stops with coordinates
      const locStops = stops.filter(s => s.lat && s.lng);
      for (let i = 0; i < locStops.length - 1; i++) {
        const curr = locStops[i];
        const next = locStops[i + 1];
        if (!curr.transitToNext) {
          const result = await fetchRouteDuration(
            { lat: curr.lat, lng: curr.lng },
            { lat: next.lat, lng: next.lng },
            curr.transitMode || 'DRIVE'
          );
          if (result) {
            curr.transitToNext = { ...result, mode: curr.transitMode || 'DRIVE' };
            changed = true;
            totalTransit++;
            lines.push(`  🗺 ${day.date} · ${curr.name || curr.location} → ${next.name || next.location}: 路线已计算`);
          }
        }
      }

      if (changed) {
        await supabase.from('days_v2').update({ stops_data: stops }).eq('id', day.id);
      }
    }

    lines.push(`✅ 完成: 补充 ${totalPhotos} 张图片、${totalTransit} 条路线`);
    setRepairLog(lines);
    setRepairingTripId(null);
  };


  return (
    <div className="admin-page">
      <header>
        <div>
          <h1>Admin Dashboard</h1>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => setActiveTab('api')} className={`admin-tab-btn ${activeTab === 'api' ? 'active' : ''}`}>
              API 监控
            </button>
            <button onClick={() => setActiveTab('itineraries')} className={`admin-tab-btn ${activeTab === 'itineraries' ? 'active' : ''}`}>
              All Itineraries
            </button>
            <button onClick={() => setActiveTab('cleanup')} className={`admin-tab-btn ${activeTab === 'cleanup' ? 'active' : ''}`}>
              Image Cleanup
            </button>
          </div>
        </div>
        <button 
          onClick={() => setShowSql(!showSql)}
          style={{ 
            background: showSql ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.05)', 
            border: `1px solid ${showSql ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`, 
            color: showSql ? '#38bdf8' : 'var(--md-sys-color-on-surface-variant)',
            padding: '0.6rem 1rem',
            borderRadius: '10px',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>help</span>
          {showSql ? '隐藏设置指引' : '查看权限设置'}
        </button>
      </header>

      {activeTab === 'itineraries' && (
        <section>
          {loading ? (
            <p>Loading trips...</p>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Email</th>
                    <th>架构</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map(trip => {
                    const isV2 = trip.trip_data == null;
                    return (
                    <tr key={trip.id}>
                      <td>{trip.title}</td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {trip.profiles?.email || <span style={{ opacity: 0.5 }}>{trip.user_id?.substring(0, 8) || 'unknown'}...</span>}
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
                          background: isV2 ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.15)',
                          color: isV2 ? 'var(--st-color-hotel-checkin)' : '#fbbf24',
                          border: `1px solid ${isV2 ? 'rgba(34,197,94,0.3)' : 'rgba(251,191,36,0.3)'}`,
                        }}>
                          {isV2 ? 'V2 新' : 'V1 旧'}
                        </span>
                      </td>
                      <td>{new Date(trip.created_at).toLocaleDateString()}</td>
                      <td style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button
                          onClick={() => window.open(isV2 ? `/trip-v2/${trip.id}` : `/trip/${trip.id}`, '_blank')}
                          className="admin-ghost-btn" style={{ color: 'var(--accent)' }}
                        >
                          View
                        </button>
                        {isV2 && (
                          <button
                            onClick={() => repairTripData(trip)}
                            disabled={repairingTripId === trip.id}
                            className="admin-ghost-btn" style={{ color: '#a78bfa', cursor: repairingTripId === trip.id ? 'not-allowed' : 'pointer', opacity: repairingTripId === trip.id ? 0.5 : 1 }}
                          >
                            {repairingTripId === trip.id ? '修复中...' : '🔧 Repair'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteTrip(trip.id)}
                          className="admin-ghost-btn" style={{ color: 'var(--md-sys-color-error)' }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Repair log */}
          {repairLog.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <div className="admin-section-label">修复日志</div>
              <pre style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '8px', padding: '1rem', fontSize: '0.78rem', color: 'var(--st-color-text-muted)', maxHeight: '240px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                {repairLog.join('\n')}
              </pre>
            </div>
          )}
        </section>
      )}

      {activeTab === 'cleanup' && (
        <section className="admin-section">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Storage Optimizer</h2>
          <p style={{ color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
            扫描 Supabase 存储桶中不再被任何行程引用的孤立文件（含附件子目录）。勾选要删除的文件后点击删除。
          </p>

          {/* Action bar */}
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleScanClick}
              disabled={scanning}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'var(--accent)', border: 'none', color: '#fff', cursor: scanning ? 'not-allowed' : 'pointer', opacity: scanning ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{scanning ? 'sync' : 'search'}</span>
              {scanning ? 'Scanning...' : 'Scan Storage'}
            </button>

            {unusedImages.length > 0 && !scanning && (
              <>
                <button onClick={selectAll} style={{ padding: '0.5rem 0.9rem', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}>
                  全选 ({unusedImages.length})
                </button>
                <button onClick={deselectAll} style={{ padding: '0.5rem 0.9rem', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}>
                  取消全选
                </button>
                {selectedPaths.size > 0 && (
                  <button
                    onClick={deleteUnusedImages}
                    style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: '#e11d48', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                    删除选中 ({selectedPaths.size})
                  </button>
                )}
              </>
            )}
          </div>

          {/* Status bar */}
          <div style={{ padding: '0.8rem 1rem', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', minHeight: '38px' }}>
            {cleanupStatus || '准备扫描...'}
          </div>

          {/* Thumbnail grid */}
          {unusedImages.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
              {unusedImages.map(path => {
                const url = getPublicUrl(path);
                const isSelected = selectedPaths.has(path);
                const fileName = path.split('/').pop();
                const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName);

                return (
                  <div
                    key={path}
                    onClick={() => toggleSelect(path)}
                    style={{
                      position: 'relative',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: isSelected ? '2px solid #e11d48' : '2px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer',
                      background: 'rgba(255,255,255,0.03)',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    {/* Thumbnail */}
                    <div style={{ aspectRatio: '1', overflow: 'hidden', background: 'var(--md-sys-color-surface-container-lowest)' }}>
                      {isImage ? (
                        <img
                          src={url}
                          alt={fileName}
                          loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--st-color-text-muted)' }}>insert_drive_file</span>
                        </div>
                      )}
                    </div>

                    {/* Zoom button */}
                    {isImage && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setPreviewUrl(url); }}
                        style={{ position: 'absolute', top: '4px', left: '4px', background: 'rgba(0,0,0,0.65)', border: 'none', borderRadius: '6px', padding: '3px 5px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>zoom_in</span>
                      </button>
                    )}

                    {/* Checkbox indicator */}
                    <div style={{ position: 'absolute', top: '4px', right: '4px', width: '20px', height: '20px', borderRadius: '50%', background: isSelected ? '#e11d48' : 'rgba(0,0,0,0.6)', border: '2px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isSelected && <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#fff' }}>check</span>}
                    </div>

                    {/* Filename */}
                    <div style={{ padding: '4px 6px', fontSize: '0.65rem', color: 'var(--st-color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', background: 'rgba(0,0,0,0.4)' }}>
                      {fileName}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {activeTab === 'api' && (
        <section className="admin-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem' }}>Google API 监控</h2>
            <button onClick={loadApiData} disabled={apiSaving} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '0.4rem 0.9rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>刷新
            </button>
          </div>

          {/* Master toggle */}
          {(() => {
            const API_SWITCH_KEYS_LOCAL = ['places_search_enabled', 'place_details_enabled', 'directions_enabled'];
            const allOn = API_SWITCH_KEYS_LOCAL.every(k => apiSettings[k] === true || apiSettings[k] === 'true');
            const allOff = API_SWITCH_KEYS_LOCAL.every(k => apiSettings[k] !== true && apiSettings[k] !== 'true');
            return (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: allOn ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${allOn ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '14px', padding: '1rem 1.4rem', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>总开关</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--st-color-text-muted)', marginTop: '2px' }}>
                    {allOn ? '所有 Google API 已开启' : allOff ? '所有 Google API 已关闭' : '部分 API 已开启'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => !apiSaving && toggleAllApis(true)}
                    disabled={apiSaving || allOn}
                    style={{ padding: '0.5rem 1.1rem', borderRadius: '8px', background: allOn ? 'rgba(34,197,94,0.15)' : 'var(--st-color-hotel-checkin)', border: `1px solid ${allOn ? 'rgba(34,197,94,0.3)' : '#16a34a'}`, color: allOn ? 'var(--st-color-hotel-checkin)' : '#fff', fontWeight: 600, fontSize: '0.85rem', cursor: allOn || apiSaving ? 'not-allowed' : 'pointer', opacity: allOn || apiSaving ? 0.6 : 1, transition: 'all 0.2s' }}
                  >
                    全部开启
                  </button>
                  <button
                    onClick={() => !apiSaving && toggleAllApis(false)}
                    disabled={apiSaving || allOff}
                    style={{ padding: '0.5rem 1.1rem', borderRadius: '8px', background: allOff ? 'rgba(239,68,68,0.15)' : 'var(--md-sys-color-error)', border: `1px solid ${allOff ? 'rgba(239,68,68,0.3)' : '#dc2626'}`, color: allOff ? '#f87171' : '#fff', fontWeight: 600, fontSize: '0.85rem', cursor: allOff || apiSaving ? 'not-allowed' : 'pointer', opacity: allOff || apiSaving ? 0.6 : 1, transition: 'all 0.2s' }}
                  >
                    全部关闭
                  </button>
                </div>
              </div>
            );
          })()}

          {/* API switches + stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { key: 'places_search_enabled', label: 'Places Search', type: 'places_search', desc: '地点搜索自动补全' },
              { key: 'place_details_enabled', label: 'Place Details', type: 'place_details', desc: '地点详情 / 添加 stop' },
              { key: 'directions_enabled', label: 'Directions', type: 'directions', desc: '路线和交通时间' },
            ].map(({ key, label, type, desc }) => {
              const on = apiSettings[key] === true || apiSettings[key] === 'true';
              const stats = apiStats[type] || {};
              return (
                <div key={key} style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '12px', padding: '1.2rem', border: `1px solid ${on ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{label}</div>
                      <div style={{ color: 'var(--st-color-text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>{desc}</div>
                    </div>
                    {/* Toggle switch */}
                    <div
                      onClick={() => !apiSaving && toggleApiSwitch(key, apiSettings[key])}
                      style={{ width: '44px', height: '24px', borderRadius: '12px', background: on ? 'var(--st-color-hotel-checkin)' : '#374151', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
                    >
                      <div style={{ position: 'absolute', top: '3px', left: on ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.78rem' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--st-color-text-muted)' }}>今日</div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#60a5fa' }}>{stats.today ?? '—'}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--st-color-text-muted)' }}>近2分钟</div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#a78bfa' }}>{stats.recent ?? '—'}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--st-color-text-muted)' }}>今日拦截</div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f87171' }}>{stats.blocked ?? '—'}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Limits config */}
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '1.2rem', marginBottom: '1.5rem' }}>
            <div style={{ fontWeight: 600, marginBottom: '1rem' }}>限额设置</div>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--st-color-text-muted)', marginBottom: '4px' }}>每日最大调用次数（所有类型合计）</label>
                <input
                  type="number" min="1"
                  value={apiLimitInputs.daily_api_limit ?? ''}
                  onChange={e => setApiLimitInputs(p => ({ ...p, daily_api_limit: e.target.value }))}
                  className="admin-input" style={{ width: '120px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--st-color-text-muted)', marginBottom: '4px' }}>2分钟内最大次数（超限自动切断）</label>
                <input
                  type="number" min="1"
                  value={apiLimitInputs.per_2min_api_limit ?? ''}
                  onChange={e => setApiLimitInputs(p => ({ ...p, per_2min_api_limit: e.target.value }))}
                  className="admin-input" style={{ width: '120px' }}
                />
              </div>
              <button onClick={saveLimits} disabled={apiSaving} style={{ padding: '0.5rem 1.2rem', borderRadius: '8px', background: 'var(--accent)', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600, opacity: apiSaving ? 0.6 : 1 }}>
                保存
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--st-color-text-muted)', marginTop: '0.8rem' }}>超限时对应 API 开关会被自动关闭，需手动重新开启。</p>
          </div>

          {/* Recent log */}
          {apiLogs.length > 0 && (
            <div>
              <div className="admin-section-label">最近 50 条记录</div>
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', overflow: 'hidden', maxHeight: '300px', overflowY: 'auto' }}>
                <table className="admin-log-table">
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>类型</th>
                      <th>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiLogs.map((log, i) => (
                      <tr key={i}>
                        <td style={{ color: 'var(--st-color-text-muted)' }}>{new Date(log.created_at).toLocaleTimeString()}</td>
                        <td>{log.api_type}</td>
                        <td>
                          <span style={{ color: log.status === 'success' ? 'var(--st-color-hotel-checkin)' : log.status === 'blocked' ? '#f87171' : '#fbbf24', fontWeight: 600 }}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Lightbox */}
      {previewUrl && (
        <div onClick={() => setPreviewUrl(null)} className="admin-lightbox">
          <img src={previewUrl} alt="preview" />
          <button onClick={() => setPreviewUrl(null)} className="admin-lightbox-close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {showSql && (
        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '12px' }}>
          <h3 style={{ color: '#38bdf8', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
            <span className="material-symbols-outlined">key</span>
            管理员 RLS 权限配置 (SQL 脚本)
          </h3>
          <p style={{ fontSize: '0.88rem', marginBottom: '1.2rem', color: 'var(--st-color-text-muted)', lineHeight: '1.5' }}>
            由于 Supabase RLS 默认拦截非所属数据的查询，管理员需手动开启后端访问权限。请将在 Supabase SQL Editor 中运行下方脚本：
          </p>
          <div style={{ position: 'relative' }}>
            <pre style={{ background: '#000', padding: '1.2rem', borderRadius: '8px', fontSize: '0.8rem', color: '#cbd5e1', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.1)' }}>
{`/* --- 管理员权限一键配置脚本 (增强版) --- */

-- 1. 行程元数据 (trips): 全局操作权限
DROP POLICY IF EXISTS "Admins can manage all trips" ON trips;
CREATE POLICY "Admins can manage all trips" ON trips FOR ALL
USING (auth.jwt() ->> 'email' = '${state.user?.email || 'showbox88@gmail.com'}');

-- 2. V2 天数据 (days_v2): 全局操作权限
DROP POLICY IF EXISTS "Admins can manage all days" ON days_v2;
CREATE POLICY "Admins can manage all days" ON days_v2 FOR ALL 
USING (auth.jwt() ->> 'email' = '${state.user?.email || 'showbox88@gmail.com'}' OR auth.uid() = user_id);

-- 3. V2 关联表 (trip_days): 全局操作权限
DROP POLICY IF EXISTS "Admins can manage all trip_days" ON trip_days;
CREATE POLICY "Admins can manage all trip_days" ON trip_days FOR ALL 
USING (auth.jwt() ->> 'email' = '${state.user?.email || 'showbox88@gmail.com'}');

-- 4. 用户资料表 (profiles): 允许管理员查看用户 Email 
CREATE TABLE IF NOT EXISTS profiles ( id uuid REFERENCES auth.users PRIMARY KEY, email text );
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT 
USING (auth.jwt() ->> 'email' = '${state.user?.email || 'showbox88@gmail.com'}' OR auth.uid() = id);

-- 5. 存储桶权限 (Storage): 请前往 Storage -> Policies 页面手动添加针对 'trip-media' 的策略：
-- ALLOW ALL to authenticated users with condition: (auth.jwt() ->> 'email' = '${state.user?.email || 'showbox88@gmail.com'}')`}
            </pre>
            <button 
              onClick={() => {
                const text = `/* --- 管理员权限配置 --- */\n\n-- 1. trips\nDROP POLICY IF EXISTS "Admins can manage all trips" ON trips;\nCREATE POLICY "Admins can manage all trips" ON trips FOR ALL\nUSING (auth.jwt() ->> 'email' = '${state.user?.email || 'showbox88@gmail.com'}');\n\n-- 2. days_v2\nDROP POLICY IF EXISTS "Admins can manage all days" ON days_v2;\nCREATE POLICY "Admins can manage all days" ON days_v2 FOR ALL \nUSING (auth.jwt() ->> 'email' = '${state.user?.email || 'showbox88@gmail.com'}' OR auth.uid() = user_id);\n\n-- 3. trip_days\nDROP POLICY IF EXISTS "Admins can manage all trip_days" ON trip_days;\nCREATE POLICY "Admins can manage all trip_days" ON trip_days FOR ALL \nUSING (auth.jwt() ->> 'email' = '${state.user?.email || 'showbox88@gmail.com'}');\n\n-- 4. profiles\nCREATE TABLE IF NOT EXISTS profiles ( id uuid REFERENCES auth.users PRIMARY KEY, email text );\nALTER TABLE profiles ENABLE ROW LEVEL SECURITY;\nDROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;\nCREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT \nUSING (auth.jwt() ->> 'email' = '${state.user?.email || 'showbox88@gmail.com'}' OR auth.uid() = id);`;
                navigator.clipboard.writeText(text);
                alert('脚本已复制到剪贴板！');
              }}
              style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--accent)', border: 'none', borderRadius: '6px', padding: '5px 12px', color: '#fff', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
            >
              复制 SQL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
