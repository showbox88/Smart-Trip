/**
 * EditOperationsContext — provides all trip-editing callbacks via context,
 * replacing 25+ props that were drilled through DaySection to child cards.
 */

import { createContext, useContext } from 'react';

const EditOperationsContext = createContext(null);

export function EditOperationsProvider({ value, children }) {
  return (
    <EditOperationsContext.Provider value={value}>
      {children}
    </EditOperationsContext.Provider>
  );
}

export function useEditOperations() {
  const ctx = useContext(EditOperationsContext);
  if (!ctx) throw new Error('useEditOperations must be used within EditOperationsProvider');
  return ctx;
}
