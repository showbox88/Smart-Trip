import { createContext, useContext, useReducer, useMemo } from 'react';

const initialState = {
  user: null,
  trips: [],
  activeTripId: null,
  hoveredStopId: null,
  editState: { editingStopId: null, editingDayId: null, modalType: null },
  settings: {
    language: 'zh',
    unitDistance: 'km',
    unitTemp: 'c',
    currency: 'USD',
  },
  dashboardFilter: 'all',
  dashboardView: 'grid',
  sidebarCollapsed: false,
  isLoading: true,
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_TRIPS':
      return { ...state, trips: action.payload };
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'SET_DASHBOARD_FILTER':
      return { ...state, dashboardFilter: action.payload };
    case 'SET_DASHBOARD_VIEW':
      return { ...state, dashboardView: action.payload };
    case 'SET_SIDEBAR_COLLAPSED':
      return { ...state, sidebarCollapsed: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ACTIVE_TRIP':
      return { ...state, activeTripId: action.payload };
    case 'SET_HOVERED_STOP':
      return { ...state, hoveredStopId: action.payload };
    case 'UPDATE_TRIP': {
      const exists = state.trips.find(t => t.id === action.payload.id);
      if (exists) {
        return { ...state, trips: state.trips.map(t => t.id === action.payload.id ? action.payload : t) };
      }
      return { ...state, trips: [action.payload, ...state.trips] };
    }
    case 'SET_EDIT_STATE':
      return { ...state, editState: { ...state.editState, ...action.payload } };
    case 'CLOSE_MODAL':
      return { ...state, editState: { editingStopId: null, editingDayId: null, modalType: null } };
    case 'LOGOUT':
      return { ...initialState, isLoading: false };
    default:
      return state;
  }
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
