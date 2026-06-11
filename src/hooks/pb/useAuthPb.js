import { useEffect, useCallback } from 'react';
import { pb } from '../../lib/pb';
import { PB_LOGIN } from '../../lib/dataSource';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../context/I18nContext';
import { useTheme } from '../../theme';
import { getPbTrips } from '../../adapters/pbAdapter';
import { loadPbSettings, getPbSettingSync } from '../../adapters/pbSettings';

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
  const { setLanguage } = useI18n();
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

  // 登录后加载 trips + UI 偏好（语言等；主题由 ThemeContext 经 themeStorage 自行走 PB）
  useEffect(() => {
    if (!state.user) return;
    getPbTrips()
      .then(trips => dispatch({ type: 'SET_TRIPS_V2', payload: trips }))
      .catch(e => console.error('[useAuthPb] load trips error:', e.message));
    loadPbSettings()
      .then(() => {
        const lang = getPbSettingSync('language');
        if (lang) setLanguage(lang);
      })
      .catch(() => {});
  }, [state.user?.id, dispatch, setLanguage]);

  const signIn = useCallback(async (_email, passphrase) => {
    // 走代理 gate：浏览器只发口令；代理校验后返回真 PB token + 记录
    const res = await fetch('/auth/gate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `登录失败 (${res.status})`);
    }
    const { token, record } = await res.json();
    pb.authStore.save(token, record);
    return { token, record };
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
