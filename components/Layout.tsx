import React, { useState, useRef, useEffect } from 'react';
import type { Section, SectionType } from '../types';
import { useAppContext } from '../App';
import { Icon } from './Icon';
import { Modal } from './ui/Modal';

interface LayoutProps {
  children: React.ReactNode;
  activeSectionId: string;
  setActiveSectionId: (id: string) => void;
}

const ThemeToggle: React.FC = () => {
    const { theme, setTheme } = useAppContext();
    const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');
    return (
        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-secondary transition-colors">
            <Icon name={theme === 'light' ? 'moon' : 'sun'} />
        </button>
    );
};

const ProfileMenu: React.FC = () => {
    const { user, logout, setBackground } = useAppContext();
    const [isOpen, setIsOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleBgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setBackground(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-full hover:bg-secondary transition-colors">
                <Icon name="user" />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-bkg border border-secondary rounded-md shadow-lg z-50">
                    <div className="p-2 border-b border-secondary">
                        <p className="font-semibold">{user?.username}</p>
                    </div>
                    <button onClick={() => fileInputRef.current?.click()} className="w-full text-left px-4 py-2 text-sm hover:bg-secondary">
                        Orqa fonni o'zgartir
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleBgChange} accept="image/*" className="hidden" />
                     <button onClick={() => { setBackground(null); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-secondary">
                        Orqa fonni o'chirish
                    </button>
                    <button onClick={logout} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-secondary">
                        Chiqish
                    </button>
                </div>
            )}
        </div>
    );
};

const SectionCreator: React.FC<{onClose: () => void, parentId?: string}> = ({ onClose, parentId = 'root' }) => {
    const { user, updateUserSections } = useAppContext();
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [type, setType] = useState<SectionType | ''>('');

    const addSectionRecursive = (sections: Section[], newSection: Section, targetParentId: string): Section[] => {
        return sections.map(section => {
            if (section.id === targetParentId) {
                return { ...section, children: [...section.children, newSection] };
            }
            return { ...section, children: addSectionRecursive(section.children, newSection, targetParentId) };
        });
    };

    const handleCreate = () => {
        if (!user || !name || !type) return;
        
        const newSection: Section = {
            id: `section_${Date.now()}`,
            name,
            type,
            children: [],
            items: []
        };
        
        if (parentId === 'root') {
            updateUserSections([...user.data, newSection]);
        } else {
            const updatedSections = addSectionRecursive(user.data, newSection, parentId);
            updateUserSections(updatedSections);
        }
        onClose();
    };
    
    if (step === 2) {
        return (
            <div>
                <h3 className="text-lg font-bold mb-4">Bo'lim turini tanlang</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button onClick={() => setType('bookmarks')} className={`p-4 border rounded-lg ${type === 'bookmarks' ? 'border-accent bg-accent/10' : 'hover:border-content/50'}`}>Saytlar</button>
                    <button onClick={() => setType('code')} className={`p-4 border rounded-lg ${type === 'code' ? 'border-accent bg-accent/10' : 'hover:border-content/50'}`}>Kod Saqlash</button>
                    <button onClick={() => setType('generic_files')} className={`p-4 border rounded-lg ${type === 'generic_files' ? 'border-accent bg-accent/10' : 'hover:border-content/50'}`}>Fayllar</button>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button onClick={() => setStep(1)} className="px-4 py-2 rounded-md bg-secondary text-primary hover:bg-secondary/80">Orqaga</button>
                    <button onClick={handleCreate} disabled={!type} className="px-4 py-2 rounded-md bg-accent text-white hover:bg-accent/90 disabled:bg-muted disabled:cursor-not-allowed">Yaratish</button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <h3 className="text-lg font-bold mb-4">Yangi bo'lim qo'shish</h3>
            <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bo'lim nomini kiriting"
                className="w-full p-2 border rounded-md bg-secondary text-content"
            />
            <div className="mt-4 flex justify-end">
                <button onClick={() => setStep(2)} disabled={!name} className="px-4 py-2 rounded-md bg-accent text-white hover:bg-accent/90 disabled:bg-muted disabled:cursor-not-allowed">
                    Keyingisi
                </button>
            </div>
        </div>
    );
};

const NavItem: React.FC<{ section: Section; activeId: string; setActive: (id: string) => void; level?: number }> = ({ section, activeId, setActive, level = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = section.children && section.children.length > 0;
    
    const iconMap: Record<SectionType, string> = {
        images_videos: 'image',
        files: 'file',
        bookmarks: 'link',
        code: 'code',
        generic_files: 'folder'
    };

    return (
        <div style={{ marginLeft: `${level * 1}rem` }}>
            <div
                onClick={() => {
                    setActive(section.id);
                    if (hasChildren) setIsExpanded(!isExpanded);
                }}
                className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${activeId === section.id ? 'bg-accent/20 text-accent' : 'hover:bg-secondary'}`}
            >
                <div className="flex items-center gap-2">
                    <Icon name={iconMap[section.type]} className="w-5 h-5" />
                    <span>{section.name}</span>
                </div>
                {hasChildren && <span className={`transition-transform transform ${isExpanded ? 'rotate-90' : 'rotate-0'}`}>&gt;</span>}
            </div>
            {hasChildren && isExpanded && (
                <div className="mt-1">
                    {section.children.map(child => <NavItem key={child.id} section={child} activeId={activeId} setActive={setActive} level={level + 1} />)}
                </div>
            )}
        </div>
    );
};

export const Layout: React.FC<LayoutProps> = ({ children, activeSectionId, setActiveSectionId }) => {
    const { user } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="flex flex-col h-screen">
            <header className="sticky top-0 z-40 w-full backdrop-blur flex-none transition-colors duration-500 lg:z-50 lg:border-b lg:border-secondary/50 bg-bkg/75">
                <div className="max-w-screen-2xl mx-auto">
                    <div className="py-3 px-4">
                        <div className="relative flex items-center">
                            <h1 className="font-bold text-xl mr-auto">Fayl Ombori</h1>
                            <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
                                {user?.data.slice(0,3).map(section => (
                                    <button key={section.id} onClick={() => setActiveSectionId(section.id)} className={`${activeSectionId === section.id ? 'text-accent' : 'hover:text-accent'} transition-colors`}>{section.name}</button>
                                ))}
                            </nav>
                            <div className="flex items-center gap-2 ml-4">
                                <button onClick={() => setIsModalOpen(true)} className="p-2 rounded-full hover:bg-secondary transition-colors">
                                    <Icon name="plus" />
                                </button>
                                <ThemeToggle />
                                <ProfileMenu />
                            </div>
                        </div>
                    </div>
                </div>
            </header>
            <div className="flex-grow flex overflow-hidden">
                <aside className="w-64 p-4 overflow-y-auto border-r border-secondary/50 hidden md:block">
                     <nav className="space-y-1">
                        {user?.data.map(section => (
                            <NavItem key={section.id} section={section} activeId={activeSectionId} setActive={setActiveSectionId} />
                        ))}
                    </nav>
                </aside>
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <SectionCreator onClose={() => setIsModalOpen(false)} parentId='root' />
            </Modal>
        </div>
    );
};