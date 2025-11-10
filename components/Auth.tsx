import React, { useState } from 'react';
import type { User, Section } from '../types';
import { useAppContext } from '../App';

const defaultSections: Section[] = [
    { id: 'images_videos', name: "Rasmlar va Videolar", type: 'images_videos', children: [], items: [] },
    { id: 'files', name: "Fayllar", type: 'files', children: [], items: [] },
    { id: 'bookmarks', name: "Saytlar", type: 'bookmarks', children: [], items: [] }
];

export const Auth: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
  const { setUser, setBackground, setTheme } = useAppContext();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      const storedPassword = localStorage.getItem(`password_${username}`);
      if (storedPassword === password) {
        const userData = localStorage.getItem(`userData_${username}`);
        if (userData) {
          const parsedUser: User = JSON.parse(userData);
          setUser(parsedUser);
          setBackground(parsedUser.settings.background || null);
          setTheme(parsedUser.settings.theme || 'light');
          localStorage.setItem('loggedInUser', username);
          onLoginSuccess();
        } else {
          setError("Foydalanuvchi ma'lumotlari topilmadi.");
        }
      } else {
        setError("Noto'g'ri foydalanuvchi nomi yoki parol.");
      }
    } else {
      if (localStorage.getItem(`password_${username}`)) {
        setError("Bu foydalanuvchi nomi allaqachon mavjud.");
      } else {
        localStorage.setItem(`password_${username}`, password);
        const newUser: User = {
          username,
          settings: { theme: 'light', background: null },
          data: defaultSections
        };
        localStorage.setItem(`userData_${username}`, JSON.stringify(newUser));
        setUser(newUser);
        localStorage.setItem('loggedInUser', username);
        onLoginSuccess();
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bkg">
      <div className="w-full max-w-md p-8 space-y-6 bg-secondary rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-center text-primary">{isLogin ? "Kirish" : "Ro'yxatdan o'tish"}</h1>
        <form onSubmit={handleAuth} className="space-y-6">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Foydalanuvchi nomi"
            required
            className="w-full px-4 py-2 border rounded-md bg-bkg text-content focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Parol"
            required
            className="w-full px-4 py-2 border rounded-md bg-bkg text-content focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" className="w-full py-2 px-4 bg-accent text-white rounded-md hover:bg-accent/90 transition-colors">
            {isLogin ? "Kirish" : "Ro'yxatdan o'tish"}
          </button>
        </form>
        <p className="text-center text-sm">
          {isLogin ? "Hisobingiz yo'qmi?" : "Hisobingiz bormi?"}{' '}
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="font-medium text-accent hover:underline">
            {isLogin ? "Ro'yxatdan o'tish" : "Kirish"}
          </button>
        </p>
      </div>
    </div>
  );
};
