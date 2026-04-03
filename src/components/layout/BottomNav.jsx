/**
 * BottomNav — Clean layout bottom tab bar
 *
 * Only rendered when layout variant is 'clean'.
 * Provides mobile-friendly navigation with 4 tabs.
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { useI18n } from '../../context/I18nContext';

const TABS = [
  { key: 'today',     icon: 'today',       path: '/today'     },
  { key: 'trips',     icon: 'luggage',     path: '/'          },
  { key: 'map',       icon: 'map',         path: null         },
  { key: 'profile',   icon: 'person',      path: null         },
];

export default function BottomNav({ onToggleMap }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();

  const labels = {
    today:   t('itinerary.today_schedule') || 'Today',
    trips:   t('common.my_trips') || 'My Trips',
    map:     t('common.map') || 'Map',
    profile: t('common.you') || 'Profile',
  };

  const handleTabClick = (tab) => {
    if (tab.key === 'map' && onToggleMap) {
      onToggleMap();
      return;
    }
    if (tab.path) {
      navigate(tab.path);
    }
  };

  const isActive = (tab) => {
    if (!tab.path) return false;
    if (tab.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(tab.path);
  };

  return (
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
      zIndex: 1000,
      minWidth: '280px',
      maxWidth: '400px',
      width: 'calc(100% - 32px)',
    }}>
      {TABS.map((tab) => {
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
            <span>{labels[tab.key]}</span>
          </button>
        );
      })}
    </nav>
  );
}
