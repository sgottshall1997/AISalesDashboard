import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  isAuthenticated: boolean;
}

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  currentPage: string;
}

interface AppState {
  // User state
  user: User | null;
  isLoading: boolean;
  
  // UI state
  ui: UIState;
  
  // Global notifications
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: number;
  }>;
  
  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setCurrentPage: (page: string) => void;
  addNotification: (notification: Omit<AppState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isLoading: false,
        ui: {
          sidebarOpen: true,
          theme: 'light',
          currentPage: '/',
        },
        notifications: [],
        
        // Actions
        setUser: (user) => 
          set((state) => ({ ...state, user }), false, 'setUser'),
        
        setLoading: (isLoading) => 
          set((state) => ({ ...state, isLoading }), false, 'setLoading'),
        
        toggleSidebar: () => 
          set((state) => ({
            ...state,
            ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen }
          }), false, 'toggleSidebar'),
        
        setTheme: (theme) => {
          set((state) => ({
            ...state,
            ui: { ...state.ui, theme }
          }), false, 'setTheme');
          
          // Apply theme to document
          if (theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        },
        
        setCurrentPage: (currentPage) => 
          set((state) => ({
            ...state,
            ui: { ...state.ui, currentPage }
          }), false, 'setCurrentPage'),
        
        addNotification: (notification) => {
          const id = Math.random().toString(36).substr(2, 9);
          const timestamp = Date.now();
          
          set((state) => ({
            ...state,
            notifications: [
              ...state.notifications,
              { ...notification, id, timestamp }
            ]
          }), false, 'addNotification');
          
          // Auto-remove after 5 seconds
          setTimeout(() => {
            get().removeNotification(id);
          }, 5000);
        },
        
        removeNotification: (id) => 
          set((state) => ({
            ...state,
            notifications: state.notifications.filter(n => n.id !== id)
          }), false, 'removeNotification'),
        
        clearNotifications: () => 
          set((state) => ({ ...state, notifications: [] }), false, 'clearNotifications'),
      }),
      {
        name: 'app-store',
        partialize: (state) => ({
          ui: {
            theme: state.ui.theme,
            sidebarOpen: state.ui.sidebarOpen,
          }
        }),
      }
    ),
    {
      name: 'AI Sales Dashboard Store',
    }
  )
);

// Selectors for optimized subscriptions
export const useUser = () => useAppStore((state) => state.user);
export const useIsLoading = () => useAppStore((state) => state.isLoading);
export const useUI = () => useAppStore((state) => state.ui);
export const useNotifications = () => useAppStore((state) => state.notifications);

// Theme hook
export const useTheme = () => {
  const theme = useAppStore((state) => state.ui.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  
  return { theme, setTheme };
};