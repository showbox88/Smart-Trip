import { useEffect, useCallback } from 'react';
import { pb } from '../../lib/pb';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../theme';
import { getPbTrips } from '../../adapters/pbAdapter';

/**
 * useAuthPb — PocketBase 数据源的认证（UI 不变，走 PB 登录）
 *
 * 先尝试 _superusers（PB 管理员，collections 没开 API rules 时必须用它），
 * 失败再尝试普通 users collection。
 */
export function useAuthPb() {
  const { state, dispatch } = useApp();
  const { setUserId: setThemeUserId } = useTheme();

  useEffect(() => {
    const applyRecord = (record) => {
      dispatch({
        type: 'SET_USER',
        payload: {
          id: record.id,
          email: record.email,
          name: record.name || record.email?.split('@')[0] || 'PB User',
          avatar: null,
        },
      });
      setThemeUserId(record.id);
    };

    if (pb.authStore.isValid && pb.authStore.record) {
      applyRecord(pb.authStore.record);
    }
    dispatch({ type: 'SET_LOADING', payload: false });

    const unsubscribe = pb.authStore.onChange((_token, record) => {
      if (record) {
        applyRecord(record);
      } else {
        dispatch({ type: 'LOGOUT' });
        setThemeUserId(null);
      }
    });

    return unsubscribe;
  }, [dispatch, setThemeUserId]);

  // 登录后加载 trips
  useEffect(() => {
    if (!state.user) return;
    getPbTrips()
      .then(trips => dispatch({ type: 'SET_TRIPS_V2', payload: trips }))
      .catch(e => console.error('[useAuthPb] load trips error:', e.message));
  }, [state.user?.id, dispatch]);

  const signIn = useCallback(async (email, password) => {
    try {
      return await pb.collection('_superusers').authWithPassword(email, password);
    } catch {
      return await pb.collection('users').authWithPassword(email, password);
    }
  }, []);

  const signUp = useCallback(async () => {
    throw new Error('PocketBase 模式不支持注册，请用 PB 管理员账号登录');
  }, []);

  const signInWithGoogle = useCallback(async () => {
    throw new Error('PocketBase 模式不支持 Google 登录');
  }, []);

  const signOut = useCallback(async () => {
    pb.authStore.clear();
    dispatch({ type: 'LOGOUT' });
  }, [dispatch]);

  return { user: state.user, isLoading: state.isLoading, signIn, signUp, signOut, signInWithGoogle };
}
