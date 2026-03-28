import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { isAdmin } from '../utils/admin';
import { Navigate } from 'react-router-dom';

export default function AdminPage() {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState('itineraries');
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unusedImages, setUnusedImages] = useState([]);
  const [selectedPaths, setSelectedPaths] = useState(new Set());
  const [scanning, setScanning] = useState(false);
  const [cleanupStatus, setCleanupStatus] = useState('');
  const [showSql, setShowSql] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Migration state
  const [migrationV1Trips, setMigrationV1Trips] = useState([]);
  const [migrationScanning, setMigrationScanning] = useState(false);
  const [migrationRunning, setMigrationRunning] = useState(false);
  const [migrationLog, setMigrationLog] = useState([]);

  // Security check
  if (!isAdmin(state.user)) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    if (activeTab === 'itineraries') {
      loadAllTrips();
    }
  }, [activeTab]);

  const loadAllTrips = async () => {
    setLoading(true);
    try {
      // 1. Fetch all trips
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (tripError) throw tripError;

      // 2. Fetch all profiles (to get emails)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email');

      // 3. Merge profiles into trips (Manual Join)
      const profileMap = {};
      profileData?.forEach(p => profileMap[p.id] = p.email);

      const mergedTrips = tripData.map(t => ({
        ...t,
        profiles: { email: profileMap[t.user_id] }
      }));

      setTrips(mergedTrips);
      
      // If profiles fetch failed, suggest setup
      if (profileError || !profileData || profileData.length === 0) {
          setShowSql(true);
      }
      
      if (mergedTrips.length === 0) {
          setCleanupStatus('注意：未发现行程。如果数据库中确实有数据，这通常是因为 Supabase RLS 策略限制。建议在 Supabase 控制台添加允许管理员 SELECT 的策略。');
      }
    } catch (err) {
      console.error('Error fetching trips:', err);
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

  // ── Migration helpers ──────────────────────────────────────

  const scanV1Trips = async () => {
    setMigrationScanning(true);
    setMigrationLog([]);
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('id, title, user_id, created_at, trip_data')
        .not('trip_data', 'is', null)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch profiles for display
      const { data: profiles } = await supabase.from('profiles').select('id, email');
      const profileMap = {};
      profiles?.forEach(p => { profileMap[p.id] = p.email; });

      setMigrationV1Trips((data || []).map(t => ({
        ...t,
        email: profileMap[t.user_id] || t.user_id?.substring(0, 8) + '...',
        dayCount: t.trip_data?.days?.length || 0,
      })));
    } catch (err) {
      setMigrationLog([`扫描失败: ${err.message}`]);
    } finally {
      setMigrationScanning(false);
    }
  };

  const migrateSingleTrip = async (trip) => {
    const tripData = trip.trip_data;
    if (!tripData?.days?.length) return [`  [${trip.title}] 无 days 数据，跳过`];

    const lines = [`▶ 开始迁移: ${trip.title} (${trip.id})`];
    let migratedDays = 0;
    let linkedDays = 0;

    for (const day of tripData.days) {
      if (!day.date) { lines.push(`  跳过无日期的 day`); continue; }

      // Check if days_v2 already exists for this user+date
      const { data: existing } = await supabase
        .from('days_v2')
        .select('id')
        .eq('user_id', trip.user_id)
        .eq('date', day.date)
        .maybeSingle();

      let dayId;
      if (existing) {
        dayId = existing.id;
        linkedDays++;
        lines.push(`  ${day.date}: 已存在 days_v2，仅建立关联`);
      } else {
        const newId = day.id?.startsWith('day-') ? day.id : `day-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const { data: inserted, error: insertErr } = await supabase
          .from('days_v2')
          .insert({
            id: newId,
            user_id: trip.user_id,
            date: day.date,
            title: day.title || null,
            color: day.color || '#5b7a99',
            stops_data: day.stops || [],
          })
          .select('id')
          .single();
        if (insertErr) { lines.push(`  ${day.date}: 插入失败 — ${insertErr.message}`); continue; }
        dayId = inserted.id;
        migratedDays++;
        lines.push(`  ${day.date}: 创建 days_v2 (${dayId})，stops=${day.stops?.length || 0}`);
      }

      // Link trip_days
      const { error: linkErr } = await supabase
        .from('trip_days')
        .upsert({ trip_id: trip.id, day_id: dayId });
      if (linkErr) lines.push(`  ${day.date}: 关联失败 — ${linkErr.message}`);
    }

    // Mark trip as migrated — also persist dates from trip_data to column fields
    const { error: clearErr } = await supabase
      .from('trips')
      .update({
        trip_data: null,
        start_date: tripData.startDate || null,
        end_date: tripData.endDate || null,
      })
      .eq('id', trip.id);
    if (clearErr) lines.push(`  清除 trip_data 失败: ${clearErr.message}`);
    else lines.push(`✅ 完成: 新建 ${migratedDays} 天，关联已有 ${linkedDays} 天`);

    return lines;
  };

  const fixMissingDates = async () => {
    setMigrationRunning(true);
    setMigrationLog(['🔍 查找缺少日期的 v2 trips...']);

    // Find v2 trips with no start_date
    const { data: tripsToFix, error } = await supabase
      .from('trips')
      .select('id, title, start_date')
      .is('trip_data', null)
      .is('start_date', null);

    if (error) { setMigrationLog([`查询失败: ${error.message}`]); setMigrationRunning(false); return; }
    if (!tripsToFix?.length) { setMigrationLog(['✅ 所有 v2 trip 都已有日期']); setMigrationRunning(false); return; }

    const lines = [`找到 ${tripsToFix.length} 个缺少日期的 trip，正在从关联 days 推算...`];

    for (const trip of tripsToFix) {
      const { data: linked } = await supabase
        .from('trip_days')
        .select('days_v2 ( date )')
        .eq('trip_id', trip.id);

      const dates = (linked || [])
        .map(r => r.days_v2?.date)
        .filter(Boolean)
        .sort();

      if (!dates.length) { lines.push(`  [${trip.title}] 无关联 days，跳过`); continue; }

      const start = dates[0];
      const end = dates[dates.length - 1];
      await supabase.from('trips').update({ start_date: start, end_date: end }).eq('id', trip.id);
      lines.push(`  ✅ ${trip.title}: ${start} → ${end}`);
    }

    lines.push('完成');
    setMigrationLog(lines);
    setMigrationRunning(false);
  };

  const runMigration = async (onlyMine) => {
    const targets = onlyMine
      ? migrationV1Trips.filter(t => t.user_id === state.user?.id)
      : migrationV1Trips;

    if (!targets.length) {
      setMigrationLog(['没有找到需要迁移的数据']);
      return;
    }
    if (!onlyMine && !confirm(`确定要迁移全部 ${targets.length} 个 v1 行程吗？此操作不可撤销。`)) return;

    setMigrationRunning(true);
    setMigrationLog([`开始迁移 ${targets.length} 个行程...`]);

    const allLines = [];
    for (const trip of targets) {
      const lines = await migrateSingleTrip(trip);
      allLines.push(...lines, '');
      setMigrationLog([...allLines]);
    }

    allLines.push(`🎉 全部完成，共迁移 ${targets.length} 个行程`);
    setMigrationLog([...allLines]);
    setMigrationRunning(false);
    // Refresh the scan
    await scanV1Trips();
  };

  return (
    <div className="admin-page" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1rem' }}>Admin Dashboard</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => setActiveTab('itineraries')}
            className={`tab-btn ${activeTab === 'itineraries' ? 'active' : ''}`}
            style={{ 
                padding: '0.5rem 1rem', 
                borderRadius: '8px', 
                background: activeTab === 'itineraries' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer'
            }}
          >
            All Itineraries
          </button>
          <button
            onClick={() => setActiveTab('cleanup')}
            className={`tab-btn ${activeTab === 'cleanup' ? 'active' : ''}`}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: activeTab === 'cleanup' ? 'var(--accent)' : 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer' }}
          >
            Image Cleanup
          </button>
          <button
            onClick={() => { setActiveTab('migration'); scanV1Trips(); }}
            className={`tab-btn ${activeTab === 'migration' ? 'active' : ''}`}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: activeTab === 'migration' ? 'var(--accent)' : 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer' }}
          >
            V1 → V2 迁移
          </button>
        </div>
      </header>

      {activeTab === 'itineraries' && (
        <section>
          {loading ? (
            <p>Loading trips...</p>
          ) : (
            <div className="admin-table-container" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <tr>
                    <th style={{ padding: '1rem' }}>Title</th>
                    <th style={{ padding: '1rem' }}>Email</th>
                    <th style={{ padding: '1rem' }}>架构</th>
                    <th style={{ padding: '1rem' }}>Created At</th>
                    <th style={{ padding: '1rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map(trip => {
                    const isV2 = trip.trip_data == null;
                    return (
                    <tr key={trip.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem' }}>{trip.title}</td>
                      <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                        {trip.profiles?.email || <span style={{ opacity: 0.5 }}>{trip.user_id?.substring(0, 8) || 'unknown'}...</span>}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
                          background: isV2 ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.15)',
                          color: isV2 ? '#22c55e' : '#fbbf24',
                          border: `1px solid ${isV2 ? 'rgba(34,197,94,0.3)' : 'rgba(251,191,36,0.3)'}`,
                        }}>
                          {isV2 ? 'V2 新' : 'V1 旧'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>{new Date(trip.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '1rem', display: 'flex', gap: '1rem' }}>
                        <button
                          onClick={() => window.open(isV2 ? `/trip-v2/${trip.id}` : `/trip/${trip.id}`, '_blank')}
                          style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.9rem' }}
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteTrip(trip.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem' }}
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
        </section>
      )}

      {activeTab === 'cleanup' && (
        <section style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Storage Optimizer</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
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
                    <div style={{ aspectRatio: '1', overflow: 'hidden', background: '#0a0c10' }}>
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
                          <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--text-muted)' }}>insert_drive_file</span>
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
                    <div style={{ padding: '4px 6px', fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', background: 'rgba(0,0,0,0.4)' }}>
                      {fileName}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {activeTab === 'migration' && (
        <section style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>V1 → V2 数据迁移</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            将旧架构（<code>trip_data</code> JSONB）的行程迁移到新架构（<code>days_v2</code> + <code>trip_days</code>）。迁移后 <code>trip_data</code> 会被置为 null。
          </p>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={scanV1Trips}
              disabled={migrationScanning || migrationRunning}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
              重新扫描
            </button>
            <button
              onClick={() => runMigration(true)}
              disabled={migrationRunning || migrationScanning || !migrationV1Trips.some(t => t.user_id === state.user?.id)}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: '#2563eb', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', opacity: migrationRunning ? 0.6 : 1 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>person</span>
              迁移我的数据（测试）
            </button>
            <button
              onClick={() => runMigration(false)}
              disabled={migrationRunning || migrationScanning || migrationV1Trips.length === 0}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: '#dc2626', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', opacity: migrationRunning ? 0.6 : 1 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>group</span>
              迁移全部用户
            </button>
            <button
              onClick={fixMissingDates}
              disabled={migrationRunning || migrationScanning}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: '#7c3aed', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', opacity: migrationRunning ? 0.6 : 1 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>calendar_month</span>
              修复缺失日期
            </button>
          </div>

          {/* Pending trips table */}
          {migrationScanning ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>扫描中...</p>
          ) : migrationV1Trips.length === 0 ? (
            <p style={{ color: '#22c55e', fontSize: '0.9rem' }}>✅ 没有待迁移的 v1 行程</p>
          ) : (
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', overflow: 'hidden', marginBottom: '1.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <tr>
                    <th style={{ padding: '0.7rem 1rem', textAlign: 'left' }}>行程名</th>
                    <th style={{ padding: '0.7rem 1rem', textAlign: 'left' }}>用户</th>
                    <th style={{ padding: '0.7rem 1rem', textAlign: 'left' }}>天数</th>
                    <th style={{ padding: '0.7rem 1rem', textAlign: 'left' }}>创建时间</th>
                    <th style={{ padding: '0.7rem 1rem', textAlign: 'left' }}>归属</th>
                  </tr>
                </thead>
                <tbody>
                  {migrationV1Trips.map(trip => (
                    <tr key={trip.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.7rem 1rem' }}>{trip.title}</td>
                      <td style={{ padding: '0.7rem 1rem', color: 'var(--text-muted)' }}>{trip.email}</td>
                      <td style={{ padding: '0.7rem 1rem' }}>{trip.dayCount} 天</td>
                      <td style={{ padding: '0.7rem 1rem', color: 'var(--text-muted)' }}>{new Date(trip.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '0.7rem 1rem' }}>
                        {trip.user_id === state.user?.id
                          ? <span style={{ color: '#60a5fa', fontSize: '0.75rem', fontWeight: 700 }}>我的</span>
                          : <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>其他用户</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Migration log */}
          {migrationLog.length > 0 && (
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>迁移日志</div>
              <pre style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '8px', padding: '1rem', fontSize: '0.78rem', color: '#94a3b8', maxHeight: '360px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {migrationLog.join('\n')}
              </pre>
            </div>
          )}
        </section>
      )}

      {/* Lightbox */}
      {previewUrl && (
        <div
          onClick={() => setPreviewUrl(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', backdropFilter: 'blur(8px)' }}
        >
          <img src={previewUrl} alt="preview" style={{ maxWidth: '90vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 30px 80px rgba(0,0,0,0.8)' }} />
          <button onClick={() => setPreviewUrl(null)} style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {(showSql || trips.length === 0) && (
        <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '8px' }}>
          <h3 style={{ color: '#38bdf8', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined">help</span>
            管理员设置指引 (SQL 脚本)
          </h3>
          <p style={{ fontSize: '0.85rem', marginBottom: '1rem', color: '#94a3b8' }}>
            如果你看不到其他人行程或 Email 显示为 ID，请在 Supabase SQL Editor 中运行以下命令：
          </p>
          <pre style={{ background: '#000', padding: '1rem', borderRadius: '4px', fontSize: '0.8rem', color: '#cbd5e1', overflowX: 'auto' }}>
{`/* 1. 允许管理员读取所有行程 */
CREATE POLICY "Admins can view all trips" ON trips 
FOR SELECT USING (auth.jwt() ->> 'email' = 'showbox88@gmail.com');

/* 2. 允许管理员删除/更新任何行程 */
CREATE POLICY "Admins can delete trips" ON trips 
FOR DELETE USING (auth.jwt() ->> 'email' = 'showbox88@gmail.com');

CREATE POLICY "Admins can update trips" ON trips 
FOR UPDATE USING (auth.jwt() ->> 'email' = 'showbox88@gmail.com');

/* 3. V2 架构：允许管理员读取/修改所有 days_v2 */
CREATE POLICY "Admins can manage days_v2" ON days_v2
FOR ALL USING (auth.jwt() ->> 'email' = 'showbox88@gmail.com' OR auth.uid() = user_id);

/* 4. V2 架构：允许管理员读取/修改所有 trip_days 关联 */
CREATE POLICY "Admins can manage trip_days" ON trip_days
FOR ALL USING (auth.jwt() ->> 'email' = 'showbox88@gmail.com');

/* 5. 创建 profiles 表以便显示 Email */
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users PRIMARY KEY,
  email text
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by admins" ON profiles
  FOR SELECT USING (auth.jwt() ->> 'email' = 'showbox88@gmail.com' OR auth.uid() = id);

-- 自动同步 Email 到 profiles 表的触发器
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

/* 6. 允许管理员管理存储桶中的所有文件 */
-- 在 Storage -> Policies 中，为 'trip-media' bucket 添加策略：
-- SELECT/INSERT/UPDATE/DELETE USING: (auth.jwt() ->> 'email' = 'showbox88@gmail.com')`}
          </pre>
        </div>
      )}
    </div>
  );
}
