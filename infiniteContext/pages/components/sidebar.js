import React, { useEffect, useState } from 'react';
import { db } from '../../firebaseConfig';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

const Sidebar = ({ userId, onNewChat, chatId, setChatId }) => {
  const [chats, setChats] = useState([]);

  useEffect(() => {
    if (!userId) return;

    const q = query(collection(db, `users/${userId}/chats`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChats(chatList);
    });

    return () => unsubscribe();
  }, [userId]);

  return (
    <div className="hidden md:flex w-64 bg-gray-800 flex-col p-4">
      <button
        onClick={onNewChat}
        className="flex items-center justify-center gap-2 px-4 py-2 mb-4 w-full rounded border border-white/20 text-white hover:bg-gray-700 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        New Chat
      </button>
      <div className="flex-1 overflow-y-auto">
        {chats.map(chat => (
          <div key={chat.id} className="p-2 text-white border-b border-gray-700">
            {chat.title || 'Untitled Chat'}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;