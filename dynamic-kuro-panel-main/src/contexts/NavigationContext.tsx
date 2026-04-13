import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate as useRouterNavigate } from 'react-router-dom';

type NavigationDirection = 'forward' | 'back';

interface NavigationContextType {
  direction: NavigationDirection;
  navigate: (to: string) => void;
  goBack: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [direction, setDirection] = useState<NavigationDirection>('forward');
  const location = useLocation();
  const routerNavigate = useRouterNavigate();
  const historyStack = useRef<string[]>([]);
  const isNavigatingBack = useRef(false);

  // Track history stack
  useEffect(() => {
    const currentPath = location.pathname;
    
    if (isNavigatingBack.current) {
      // Pop from stack when going back
      historyStack.current = historyStack.current.slice(0, -1);
      isNavigatingBack.current = false;
    } else {
      // Check if this is a browser back/forward
      const lastIndex = historyStack.current.lastIndexOf(currentPath);
      if (lastIndex !== -1 && lastIndex < historyStack.current.length - 1) {
        // Going back to a previous page
        setDirection('back');
        historyStack.current = historyStack.current.slice(0, lastIndex + 1);
      } else {
        // New forward navigation
        historyStack.current.push(currentPath);
      }
    }
  }, [location.pathname]);

  // Listen for browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setDirection('back');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((to: string) => {
    setDirection('forward');
    routerNavigate(to);
  }, [routerNavigate]);

  const goBack = useCallback(() => {
    isNavigatingBack.current = true;
    setDirection('back');
    routerNavigate(-1);
  }, [routerNavigate]);

  return (
    <NavigationContext.Provider value={{ direction, navigate, goBack }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigationContext = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigationContext must be used within NavigationProvider');
  }
  return context;
};
