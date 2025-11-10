import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import type { User, Theme, Section, FileItem, BookmarkItem, SectionType } from './types';
import { Auth } from './components/Auth';
import { Layout } from './components/Layout';
import { FileManager } from './components/FileManager';
import { BookmarkManager } from './components/BookmarkManager';
import { getInitialTheme } from './utils/theme';

// Context for global state
interface AppContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  logout: () => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  background: string | null;
  setBackground: (bg: string | null) => void;
  updateUserSections: (sections: Section[]) => void;
}

const AppContext = createContext<AppContextType | null>(null);
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within an AppProvider");
  return context;
};


// Main App Component
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<string>('auth');
  const [activeSectionId, setActiveSectionId] = useState<string>('images_videos');
  
  const [theme, rawSetTheme] = useState<Theme>(getInitialTheme);
  const [background, setBackground] = useState<string | null>(null);

  useEffect(() => {
    const loggedInUser = localStorage.getItem('loggedInUser');
    if (loggedInUser) {
      const userData = localStorage.getItem(`userData_${loggedInUser}`);
      if (userData) {
        const parsedUser: User = JSON.parse(userData);
        setUser(parsedUser);
        setBackground(parsedUser.settings.background || null);
        rawSetTheme(parsedUser.settings.theme || getInitialTheme());
        setCurrentView('app');
      }
    }
  }, []);
  
  const setTheme = (newTheme: Theme) => {
    rawSetTheme(newTheme);
    if (user) {
      const updatedUser = { ...user, settings: { ...user.settings, theme: newTheme } };
      setUser(updatedUser);
      localStorage.setItem(`userData_${user.username}`, JSON.stringify(updatedUser));
    }
  };

  const setAppBackground = (bg: string | null) => {
    setBackground(bg);
     if (user) {
      const updatedUser = { ...user, settings: { ...user.settings, background: bg } };
      setUser(updatedUser);
      localStorage.setItem(`userData_${user.username}`, JSON.stringify(updatedUser));
    }
  };
  
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);


  const logout = () => {
    localStorage.removeItem('loggedInUser');
    setUser(null);
    setCurrentView('auth');
  };

  const updateUserSections = (sections: Section[]) => {
    if(user) {
      const updatedUser = { ...user, data: sections };
      setUser(updatedUser);
      localStorage.setItem(`userData_${user.username}`, JSON.stringify(updatedUser));
    }
  };

  const renderContent = () => {
    if (!user) return null;
    
    const findSection = (sections: Section[], id: string): Section | undefined => {
      for (const section of sections) {
        if (section.id === id) return section;
        const foundInChildren = findSection(section.children, id);
        if (foundInChildren) return foundInChildren;
      }
      return undefined;
    };
    
    const activeSection = findSection(user.data, activeSectionId);

    if (!activeSection) {
       return <div className="p-8 text-center text-muted">Bo'lim topilmadi. Iltimos, boshqasini tanlang.</div>;
    }

    switch(activeSection.type) {
        case 'images_videos':
        case 'files':
        case 'code':
        case 'generic_files':
            return <FileManager key={activeSection.id} section={activeSection} />;
        case 'bookmarks':
            return <BookmarkManager key={activeSection.id} section={activeSection} />;
        default:
            return <div className="p-8 text-center text-muted">Noto'g'ri bo'lim turi.</div>;
    }
  };

  const appContextValue = {
    user,
    setUser,
    logout,
    theme,
    setTheme,
    background,
    setBackground: setAppBackground,
    updateUserSections,
  };

  return (
    <AppContext.Provider value={appContextValue}>
      <div 
        className="min-h-screen bg-bkg text-content transition-colors duration-300"
        style={background ? { backgroundImage: `url(${background})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' } : {}}
      >
        <div className={background ? "min-h-screen bg-black/50" : ""}>
          {currentView === 'auth' && <Auth onLoginSuccess={() => setCurrentView('app')} />}
          {currentView === 'app' && user && (
            <Layout activeSectionId={activeSectionId} setActiveSectionId={setActiveSectionId}>
              {renderContent()}
            </Layout>
          )}
        </div>
      </div>
    </AppContext.Provider>
  );
};

export default App;