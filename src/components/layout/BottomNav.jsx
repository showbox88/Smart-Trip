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
import EmergencyModal from '../emergency/EmergencyModal';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const [mapMode, setMapMode] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);

  const isTripPage = location.pathname.startsWith('/trip-v2/');

  const tabs = isTripPage
    ? [
        { key: 'trips',     icon: 'luggage',    label: t('common.my_trips') || 'My Trips',   path: '/' },
        { key: 'map',       icon: 'map',         label: t('common.map') || 'Map',             action: 'map' },
        { key: 'today',     icon: 'today',       label: t('common.today') || 'Today',         path: '/today' },
        { key: 'profile',   icon: 'person',      label: t('common.you') || 'You',             action: 'profile' },
        { key: 'sos',       icon: 'sos',         label: 'SOS',                                action: 'sos', emergency: true },
      ]
    : [
        { key: 'trips',   icon: 'luggage', label: t('common.my_trips') || 'My Trips', path: '/' },
        { key: 'map',     icon: 'map',     label: t('common.map') || 'Map',           action: 'map' },
        { key: 'today',   icon: 'today',   label: t('common.today') || 'Today',       path: '/today' },
        { key: 'profile', icon: 'person',  label: t('common.you') || 'You',           action: 'profile' },
        { key: 'sos',     icon: 'sos',     label: 'SOS',                              action: 'sos', emergency: true },
      ];

  const handleTabClick = (tab) => {
    if (tab.action === 'sos') {
      setProfileOpen(false);
      setSosOpen(v => !v);
      return;
    }
    if (tab.action === 'profile') {
      setSosOpen(false);
      setProfileOpen(v => !v);
      return;
    }
    // Close panels when navigating elsewhere
    setProfileOpen(false);
    setSosOpen(false);

    if (tab.action === 'map') {
      if (isTripPage) {
        document.body.classList.add('mobile-mode-map');
        document.body.classList.remove('mobile-mode-plan');
      }
      setMapMode(true);
      navigate('/map');
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
    if (tab.action === 'sos') return sosOpen;
    if (tab.action === 'profile') return profileOpen;
    if (tab.action === 'map') return mapMode || location.pathname === '/map';
    if (tab.action === 'itinerary') return isTripPage && !mapMode;
    if (!tab.path) return false;
    if (tab.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(tab.path);
  };

  return (
    <>
      <ProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />
      {sosOpen && <EmergencyModal onClose={() => setSosOpen(false)} />}

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
        minWidth: '320px',
        maxWidth: '440px',
        width: 'calc(100% - 32px)',
      }}>
        {tabs.map((tab) => {
          const active = isActive(tab);
          const isSos = tab.emergency === true;

          // SOS button: red accent, matches nav font/size style
          if (isSos) {
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
                  background: active ? '#D32F2F' : 'transparent',
                  color: active ? '#fff' : '#D32F2F',
                  border: 'none',
                  borderRadius: 'var(--md-sys-shape-corner-large)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  fontFamily: 'var(--md-sys-typescale-label-font)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          }

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
