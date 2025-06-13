import React, { createContext, useContext } from 'react';
import { ActivePage } from '@/pages/Index';

interface NavigationContextType {
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

interface NavigationProviderProps {
  children: React.ReactNode;
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({
  children,
  activePage,
  setActivePage,
}) => {
  return (
    <NavigationContext.Provider value={{ activePage, setActivePage }}>
      {children}
    </NavigationContext.Provider>
  );
}; 