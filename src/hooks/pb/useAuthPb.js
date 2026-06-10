import { useEffect, useCallback } from 'react';
import { pb } from '../../lib/pb';
import { PB_LOGIN } from '../../lib/dataSource';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../theme';
import { getPbTrips } from '../../adapters/pbAdapter';

// 免登录模式下的固定用户（单人内部使用；isAdmin 按 email 判断所以保留真实邮箱）
const NO_LOGIN_USER = {
  id: 'pb-owner',
  email: 'showbox88@gmail.com',
  name: 'Showbox',
  avatar: null,
};

/**
 * useAuthPb — PocketBase 数据源的认证（UI 不变，走 PB 登录）
 *
 * PB_LOGIN=off：跳过登录直接合成固定用户（请求凭据由 VM 代理注入）。
 * PB_LOGIN=on：登录页启用——先试 _superusers（PB 管理员），失败再试普通 users。
 */
export function useAuthPb() {
  const { state, dispatch } = useApp();
  const { setUserId: setThemeUserId } = useTheme();

  useEffect(() => {
    if (!PB_LOGIN) {
      // 免登录：直接放行
      dispatch({ type: 'SET_USER', payload: NO_LOGIN_USER });
      setThemeUserId(NO_LOGIN_USER.id);
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

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
    if (!PB_LOGIN) {
      console.warn('[useAuthPb] 免登录模式，signOut 忽略');
      return;
    }
    pb.authStore.clear();
    dispatch({ type: 'LOGOUT' });
  }, [dispatch]);

  return { user: state.user, isLoading: state.isLoading, signIn, signUp, signOut, signInWithGoogle };
}
