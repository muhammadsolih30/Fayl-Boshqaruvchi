import React, { useState } from 'react';
import type { Section, BookmarkItem } from '../types';
import { useAppContext } from '../App';
import { Icon } from './Icon';

export const BookmarkManager: React.FC<{ section: Section }> = ({ section }) => {
    const { user, updateUserSections } = useAppContext();
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');

    const updateSectionItems = (newItems: BookmarkItem[]) => {
        if (!user) return;
        const updateRecursive = (sections: Section[]): Section[] => {
            return sections.map(sec => {
                if (sec.id === section.id) {
                    return { ...sec, items: newItems };
                }
                return { ...sec, children: updateRecursive(sec.children) };
            });
        };
        updateUserSections(updateRecursive(user.data));
    };
    
    const handleAddBookmark = (e: React.FormEvent) => {
        e.preventDefault();
        if (section.items.length >= 10) {
            alert("Maksimal 10 ta sayt qo'shish mumkin.");
            return;
        }
        const newItem: BookmarkItem = {
            id: `bookmark_${Date.now()}`,
            name,
            url
        };
        updateSectionItems([...section.items as BookmarkItem[], newItem]);
        setName('');
        setUrl('');
    };

    const handleDelete = (itemId: string) => {
        const newItems = section.items.filter(item => item.id !== itemId) as BookmarkItem[];
        updateSectionItems(newItems);
    };

    return (
        <div className="p-4 md:p-8">
            <h2 className="text-2xl font-bold mb-6">{section.name}</h2>
            
            <form onSubmit={handleAddBookmark} className="mb-8 p-4 bg-secondary rounded-lg flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <label className="text-sm font-medium">Sayt nomi</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 mt-1 border rounded-md bg-bkg" />
                </div>
                <div className="flex-1 w-full">
                    <label className="text-sm font-medium">Sayt linki</label>
                    <input type="url" value={url} onChange={e => setUrl(e.target.value)} required placeholder="https://..." className="w-full p-2 mt-1 border rounded-md bg-bkg" />
                </div>
                <button type="submit" className="w-full md:w-auto px-4 py-2 bg-accent text-white rounded-md hover:bg-accent/90">Qo'shish</button>
            </form>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {(section.items as BookmarkItem[]).map(item => (
                    <div key={item.id} className="group relative w-full aspect-square bg-secondary rounded-lg p-4 flex flex-col items-center justify-center text-center shadow-sm">
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="w-full h-full flex flex-col items-center justify-center">
                            <img src={`https://www.google.com/s2/favicons?sz=64&domain_url=${item.url}`} alt="" className="w-16 h-16 mb-2"/>
                            <p className="font-semibold break-all">{item.name}</p>
                        </a>
                        <button onClick={() => handleDelete(item.id)} className="absolute top-1 right-1 p-1 bg-bkg/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <Icon name="trash" className="w-4 h-4 text-red-500" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
