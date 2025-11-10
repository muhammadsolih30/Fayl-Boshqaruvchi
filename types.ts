export type Theme = 'light' | 'dark';

export interface FileItem {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document' | 'zip' | 'code' | 'other';
  mimeType: string;
  content: string; // dataURL for images/videos, text content for code, etc.
  size: number;
  date: string;
}

export interface BookmarkItem {
  id: string;
  name:string;
  url: string;
}

export type SectionType = 'images_videos' | 'files' | 'bookmarks' | 'code' | 'generic_files';

export interface Section {
  id: string;
  name: string;
  type: SectionType;
  children: Section[];
  items: (FileItem | BookmarkItem)[];
}

export interface UserSettings {
  theme: Theme;
  background: string | null;
}

export interface User {
  username: string;
  settings: UserSettings;
  data: Section[];
}
