import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { debounce } from "lodash";
import { db } from "../firebaseConfig";

export class ChatSync {
  constructor(userId, chatId) {
    this.userId = userId;
    this.chatId = chatId;
    this.unsubscribe = null;
    this.updateQueue = new Map();
    
    this.debouncedUpdate = debounce(this.processUpdateQueue, 1000);
  }

  async processUpdateQueue() {
    if (!this.updateQueue.size) return;

    const chatRef = doc(db, `users/${this.userId}/chats/${this.chatId}`);
    const updates = Array.from(this.updateQueue.values()).reduce((acc, curr) => ({
      ...acc,
      ...curr
    }), {});

    try {
      await setDoc(chatRef, updates, { merge: true });
      this.updateQueue.clear();
    } catch (error) {
      console.error('Error processing update queue:', error);
    }
  }

  queueUpdate(data) {
    if (!this.chatId || !this.userId) return;
    
    const updateId = Date.now();
    this.updateQueue.set(updateId, data);
    this.debouncedUpdate();
  }

  subscribe(onUpdate) {
    if (!this.chatId || !this.userId) return;

    const chatRef = doc(db, `users/${this.userId}/chats/${this.chatId}`);
    this.unsubscribe = onSnapshot(chatRef, (doc) => {
      const data = doc.data();
      if (data) {
        onUpdate(data);
      }
    });
  }

  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.debouncedUpdate.cancel();
    this.updateQueue.clear();
  }
}
