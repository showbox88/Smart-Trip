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
  const [scanning, setScanning] = useState(false);
  const [cleanupStatus, setCleanupStatus] = useState('');
  const [showSql, setShowSql] = useState(false);

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
    if (!window.confirm('确定要删除这个行程吗？此操作不可撤销，且会同时尝试清理相关图片。')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId);
      
      if (error) throw error;
      
      alert('行程已删除');
      loadAllTrips(); // Refresh list
    } catch (err) {
      console.error('Delete error:', err);
      alert('删除失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const scanForUnusedImages = async () => {
    setScanning(true);
    setCleanupStatus('正在扫描存储桶和数据库...');
    try {
      // 1. Get all files in bucket
      const bucketName = 'trip-media';
      const { data: storageFiles, error: storageError } = await supabase
        .storage
        .from(bucketName)
        .list('', { limit: 1000 });

      if (storageError) throw storageError;

      const storageFileNames = storageFiles.map(f => f.name);

      // 2. Get all image URLs from database
      const { data: allTrips } = await supabase.from('trips').select('thumb, trip_data');
      
      const usedImages = new Set();
      
      allTrips?.forEach(t => {
          // Check thumb
          if (t.thumb && t.thumb.includes(bucketName)) {
              const fileName = t.thumb.split('/').pop().split('?')[0];
              usedImages.add(fileName);
          }

          // Check trip_data for stop photos
          const tripData = t.trip_data;
          tripData?.days?.forEach(day => {
              day.stops?.forEach(stop => {
                  if (stop.photo && stop.photo.includes(bucketName)) {
                      const fileName = stop.photo.split('/').pop().split('?')[0];
                      usedImages.add(fileName);
                  }
              });
          });
      });

      // 3. Find unused
      const unused = storageFileNames.filter(name => 
          name !== '.emptyFolderPlaceholder' && 
          !usedImages.has(name)
      );
      
      setUnusedImages(unused);
      
      // Safety check: If we found NO used images in the database but plenty in storage, 
      // it's almost certain that RLS is blocking the DB query.
      if (usedImages.size === 0 && storageFileNames.length > 0) {
          setCleanupStatus('⚠️ 危险警告：扫描发现 0 个已使用图片，但存储桶中有文件。这说明权限不足，无法读取各用户的行程数据。请【不要】执行删除，否则会误删其他用户的图片！');
          setUnusedImages([]); // Clear to prevent accidental deletion
      } else {
          setCleanupStatus(`扫描完成。对比了 ${allTrips?.length || 0} 个行程，找到 ${unused.length} 个未引用的文件。`);
      }
    } catch (err) {
      console.error('Scan error:', err);
      setCleanupStatus('扫描失败: ' + err.message);
    } finally {
      setScanning(false);
    }
  };

  const deleteUnusedImages = async () => {
    if (!unusedImages.length) return;
    if (!confirm(`确定要删除 ${unusedImages.length} 个未引用的图片吗？此操作不可撤销。`)) return;

    setScanning(true);
    setCleanupStatus('正在删除...');
    try {
      const { error } = await supabase
        .storage
        .from('trip-media')
        .remove(unusedImages);

      if (error) throw error;
      
      setUnusedImages([]);
      setCleanupStatus(`成功删除 ${unusedImages.length} 个文件。`);
    } catch (err) {
      setCleanupStatus('删除失败: ' + err.message);
    } finally {
      setScanning(false);
    }
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
            style={{ 
                padding: '0.5rem 1rem', 
                borderRadius: '8px', 
                background: activeTab === 'cleanup' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer'
            }}
          >
            Image Cleanup
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
                    <th style={{ padding: '1rem' }}>Created At</th>
                    <th style={{ padding: '1rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map(trip => (
                    <tr key={trip.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem' }}>{trip.title}</td>
                      <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                        {trip.profiles?.email || <span style={{ opacity: 0.5 }}>{trip.user_id?.substring(0, 8) || 'unknown'}...</span>}
                      </td>
                      <td style={{ padding: '1rem' }}>{new Date(trip.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '1rem', display: 'flex', gap: '1rem' }}>
                        <button 
                          onClick={() => window.open(`/trip/${trip.id}`, '_blank')}
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === 'cleanup' && (
        <section style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Supabase Storage Optimizer</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            This tool scans for photos in your Supabase storage bucket that are no longer referenced by any itinerary in the database.
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
            <button 
              onClick={scanForUnusedImages}
              disabled={scanning}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'var(--accent)', border: 'none', color: '#fff', cursor: scanning ? 'not-allowed' : 'pointer', opacity: scanning ? 0.6 : 1 }}
            >
              {scanning ? 'Scanning...' : 'Scan Storage'}
            </button>
            
            {unusedImages.length > 0 && !scanning && (
              <button 
                onClick={deleteUnusedImages}
                style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: '#e11d48', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                Delete {unusedImages.length} Unused Images
              </button>
            )}
          </div>

          <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', minHeight: '60px' }}>
            <p style={{ fontSize: '0.9rem' }}>{cleanupStatus || 'Ready to scan.'}</p>
          </div>

          {unusedImages.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Files marked for deletion:</h3>
              <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxHeight: '300px', overflowY: 'auto' }}>
                {unusedImages.map(img => <li key={img}>{img}</li>)}
              </ul>
            </div>
          )}
        </section>
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

/* 2. 允许管理员删除任何行程 */
CREATE POLICY "Admins can delete trips" ON trips 
FOR DELETE USING (auth.jwt() ->> 'email' = 'showbox88@gmail.com');

/* 3. 允许管理员保存/修改所有行程 */
CREATE POLICY "Admins can update trips" ON trips 
FOR UPDATE USING (auth.jwt() ->> 'email' = 'showbox88@gmail.com');

/* 4. 创建 profiles 表以便显示 Email */
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

/* 5. 允许管理员删除存储桶中的文件 */
-- 在 Storage -> Policies 中，为 'trip-media' bucket 添加删除权限：
-- USING: (auth.jwt() ->> 'email' = 'showbox88@gmail.com')`}
          </pre>
        </div>
      )}
    </div>
  );
}
