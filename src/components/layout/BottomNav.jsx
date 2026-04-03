/**
 * BottomNav — Clean layout bottom tab bar
 *
 * Context-aware: shows different tabs depending on current page.
 * - Dashboard/Today: Today | My Trips | Map | Profile
 * - Trip page: Today | Itinerary | Map | Profile
 *
 * "You" tab opens the ProfilePanel (settings, theme, language, logout).
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useI18n } from '../../context/I18nContext';
import ProfilePanel from './ProfilePanel';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const [mapMode, setMapMode] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const isTripPage = location.pathname.startsWith('/trip-v2/');

  const tabs = isTripPage
    ? [
        { key: 'today',     icon: 'today',      label: t('common.today') || 'Today',         path: '/today' },
        { key: 'itinerary', icon: 'event_note',  label: t('common.itinerary') || 'Itinerary', action: 'itinerary' },
        { key: 'map',       icon: 'map',         label: t('common.map') || 'Map',             action: 'map' },
        { key: 'profile',   icon: 'person',      label: t('common.you') || 'You',             action: 'profile' },
      ]
    : [
        { key: 'today',   icon: 'today',   label: t('common.today') || 'Today',       path: '/today' },
        { key: 'trips',   icon: 'luggage', label: t('common.my_trips') || 'My Trips', path: '/' },
        { key: 'map',     icon: 'map',     label: t('common.map') || 'Map' },
        { key: 'profile', icon: 'person',  label: t('common.you') || 'You',           action: 'profile' },
      ];

  const handleTabClick = (tab) => {
    if (tab.action === 'profile') {
      setProfileOpen(v => !v);
      return;
    }
    // Close profile panel when navigating elsewhere
    setProfileOpen(false);

    if (tab.action === 'map') {
      document.body.classList.add('mobile-mode-map');
      document.body.classList.remove('mobile-mode-plan');
      setMapMode(true);
      return;
    }
    if (tab.action === 'itinerary') {
      document.body.classList.remove('mobile-mode-map');
      document.body.classList.add('mobile-mode-plan');
      setMapMode(false);
      return;
    }
    if (tab.path) {
      setMapMode(false);
      navigate(tab.path);
    }
  };

  const isActive = (tab) => {
    if (tab.action === 'profile') return profileOpen;
    if (tab.action === 'map') return mapMode;
    if (tab.action === 'itinerary') return isTripPage && !mapMode;
    if (!tab.path) return false;
    if (tab.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(tab.path);
  };

  return (
    <>
      <ProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />

      <nav className="bottom-nav" style={{
        position: 'fixed',
        bottom: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.5rem 1.25rem',
        background: 'var(--md-sys-color-surface-container-lowest)',
        border: '1px solid var(--md-sys-color-outline-variant)',
        borderRadius: 'var(--md-sys-shape-corner-full)',
        boxShadow: '0 4px 16px -4px rgba(0,0,0,0.10), 0 2px 6px -2px rgba(0,0,0,0.06)',
        zIndex: 2010,
        minWidth: '280px',
        maxWidth: '400px',
        width: 'calc(100% - 32px)',
      }}>
        {tabs.map((tab) => {
          const active = isActive(tab);
          return (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                padding: '6px 4px',
                background: active ? 'var(--md-sys-color-primary)' : 'transparent',
                color: active ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface-variant)',
                border: 'none',
                borderRadius: 'var(--md-sys-shape-corner-large)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '0.65rem',
                fontWeight: active ? 600 : 400,
                fontFamily: 'var(--md-sys-typescale-label-font)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
