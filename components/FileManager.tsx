import React, { useState, useRef } from 'react';
import type { Section, FileItem } from '../types';
import { useAppContext } from '../App';
import { Icon } from './Icon';

const FileCard: React.FC<{ item: FileItem; onDelete: () => void; onRename: (newName: string) => void; }> = ({ item, onDelete, onRename }) => {
    const [isRenaming, setIsRenaming] = useState(false);
    const [name, setName] = useState(item.name);

    const handleRename = () => {
        onRename(name);
        setIsRenaming(false);
    };

    const getFileIcon = () => {
        switch (item.type) {
            case 'image': return <img src={item.content} alt={item.name} className="w-full h-32 object-cover" />;
            case 'video': return <video src={item.content} className="w-full h-32 object-cover" />;
            default: return <div className="w-full h-32 bg-secondary flex items-center justify-center"><Icon name="file" className="w-16 h-16 text-muted" /></div>;
        }
    };
    
    return (
        <div className="bg-secondary rounded-lg overflow-hidden shadow-sm">
            {getFileIcon()}
            <div className="p-2">
                {isRenaming ? (
                    <input type="text" value={name} onChange={e => setName(e.target.value)} onBlur={handleRename} onKeyDown={e => e.key === 'Enter' && handleRename()} autoFocus className="w-full bg-bkg p-1 rounded" />
                ) : (
                    <p className="font-semibold truncate">{item.name}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => setIsRenaming(true)} className="p-1 rounded-full hover:bg-bkg"><Icon name="pencil" className="w-4 h-4" /></button>
                    <a href={item.content} download={item.name} className="p-1 rounded-full hover:bg-bkg"><Icon name="download" className="w-4 h-4" /></a>
                    <button onClick={onDelete} className="p-1 rounded-full hover:bg-bkg text-red-500"><Icon name="trash" className="w-4 h-4" /></button>
                </div>
            </div>
        </div>
    );
};


export const FileManager: React.FC<{ section: Section }> = ({ section }) => {
  const { user, updateUserSections } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('all'); // for 'images_videos'

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    // FIX: Explicitly type `fileArray` as `File[]` to fix type inference issues.
    const fileArray: File[] = Array.from(files);
    
    // Limits
    if (section.type === 'images_videos') {
        const imageCount = fileArray.filter(f => f.type.startsWith('image/')).length;
        const videoCount = fileArray.filter(f => f.type.startsWith('video/')).length;
        if(imageCount > 1000) { alert('Bir vaqtda 1000 tagacha rasm yuklashingiz mumkin.'); return; }
        if(videoCount > 70) { alert('Bir vaqtda 70 tagacha video yuklashingiz mumkin.'); return; }
    }


    const newItemsPromises = fileArray.map(file => {
      return new Promise<FileItem>(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const fileType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.endsWith('zip') ? 'zip' : 'document';
          resolve({
            id: `file_${Date.now()}_${Math.random()}`,
            name: file.name,
            type: fileType,
            mimeType: file.type,
            content: reader.result as string,
            size: file.size,
            date: new Date().toISOString()
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(newItemsPromises).then(newItems => {
        updateSectionItems([...section.items, ...newItems]);
    });
  };

  const updateSectionItems = (newItems: (FileItem | any)[]) => {
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
  
  const handleDelete = (itemId: string) => {
    const newItems = section.items.filter(item => item.id !== itemId);
    updateSectionItems(newItems);
  };
  
  const handleRename = (itemId: string, newName: string) => {
    const newItems = section.items.map(item => item.id === itemId ? {...item, name: newName} : item);
    updateSectionItems(newItems);
  };

  const filteredItems = (section.type === 'images_videos' ?
    (section.items as FileItem[]).filter(item => {
        if (activeTab === 'images') return item.type === 'image';
        if (activeTab === 'videos') return item.type === 'video';
        return true;
    }) : section.items) as FileItem[];


  return (
    <div className="p-4 md:p-8">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{section.name}</h2>
            <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-accent text-white rounded-md hover:bg-accent/90">
                Yuklash
            </button>
            <input type="file" multiple ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
        </div>
        
        {section.type === 'images_videos' && (
            <div className="flex gap-2 border-b mb-4">
                <button onClick={() => setActiveTab('all')} className={`py-2 px-4 ${activeTab === 'all' ? 'border-b-2 border-accent text-accent' : ''}`}>Hammasi</button>
                <button onClick={() => setActiveTab('images')} className={`py-2 px-4 ${activeTab === 'images' ? 'border-b-2 border-accent text-accent' : ''}`}>Rasmlar</button>
                <button onClick={() => setActiveTab('videos')} className={`py-2 px-4 ${activeTab === 'videos' ? 'border-b-2 border-accent text-accent' : ''}`}>Videolar</button>
            </div>
        )}
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredItems.map(item => (
                <FileCard 
                    key={item.id}
                    item={item} 
                    onDelete={() => handleDelete(item.id)}
                    onRename={(newName) => handleRename(item.id, newName)}
                />
            ))}
        </div>
    </div>
  );
};