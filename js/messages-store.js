/**
 * OUR LITTLE STORY - Love Messages Store
 * Dual-layer persistence: Firebase Firestore (Cloud) + localStorage (Offline/Instant cache)
 */

import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc, 
  doc, 
  getDocFromServer
} from "firebase/firestore";

const firebaseConfig = {
  projectId: "knotted-chimera-gzp2g",
  appId: "1:752223484816:web:31f93e64f494d04d5c5115",
  apiKey: "AIzaSyBrloAzJW1jjMW0oILmd_XC_vOCmyq1TP8",
  authDomain: "knotted-chimera-gzp2g.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-ourlittlestory-b6701611-63b0-4e35-accd-5556532506dc",
  storageBucket: "knotted-chimera-gzp2g.firebasestorage.app",
  messagingSenderId: "752223484816",
  measurementId: "",
  oAuthClientId: "752223484816-42hlmmp41l0p725enfrq8gja48ul6hq9.apps.googleusercontent.com"
};

const LOCAL_STORAGE_KEY = "our_little_story_saved_letters_v2";

let db = null;
let isFirebaseReady = false;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  isFirebaseReady = true;

  // Validate initial connection as per Firebase skill guidelines
  (async function testConnection() {
    try {
      await getDocFromServer(doc(db, "test", "connection"));
    } catch (err) {
      if (err instanceof Error && err.message.includes("the client is offline")) {
        console.warn("[Firebase] Client is currently offline, using localStorage fallback.");
      }
    }
  })();
} catch (e) {
  console.warn("[Firebase] Initialization warning, falling back to local cache:", e);
}

// ----------------------------------------------------------------------------
// Local Storage Helper with automatic cleanup of deleted/test docs
// ----------------------------------------------------------------------------
function getLocalMessages() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Filter out deleted/test message if present
    const cleaned = parsed.filter(m => {
      if (!m) return false;
      if (m.id === "5pVTjjS5RZ4cNpq5AHmC" || m.firestoreId === "5pVTjjS5RZ4cNpq5AHmC") return false;
      if (typeof m.content === "string" && m.content.includes("Selamat datang di arsip surat cinta")) return false;
      return true;
    });
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch (e) {
    console.error("Error reading localStorage messages:", e);
    return [];
  }
}

function saveLocalMessages(messages) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages));
    window.dispatchEvent(new CustomEvent("love-messages-updated", { detail: messages }));
  } catch (e) {
    console.error("Error writing localStorage messages:", e);
  }
}

// ----------------------------------------------------------------------------
// Store API
// ----------------------------------------------------------------------------
export const LoveMessagesStore = {
  isCloudConnected() {
    return isFirebaseReady && db !== null;
  },

  /**
   * Save a love message permanently to Firestore & localStorage
   */
  async saveMessage({ sender = "Via", recipient = "I'am/Yas", content, category = "Surat Cinta", singkat = "" }) {
    if (!content || !content.trim()) {
      throw new Error("Pesan tidak boleh kosong");
    }

    const trimmedContent = content.trim();
    const trimmedSender = (sender && sender.trim()) || "Via";
    const trimmedRecipient = (recipient && recipient.trim()) || "I'am/Yas";
    const trimmedSingkat = (singkat && singkat.trim()) || "";
    const nowIso = new Date().toISOString();

    const localId = "local-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);

    const messageData = {
      id: localId,
      sender: trimmedSender,
      recipient: trimmedRecipient,
      content: trimmedContent,
      category: category,
      singkat: trimmedSingkat,
      createdAt: nowIso
    };

    // 1. Instantly save to local storage (0ms latency, guaranteed safety)
    const currentList = getLocalMessages();
    currentList.unshift(messageData);
    saveLocalMessages(currentList);

    // 2. Persist to Firestore Cloud Database
    if (this.isCloudConnected()) {
      try {
        const firestorePayload = {
          sender: trimmedSender,
          content: trimmedContent,
          createdAt: nowIso
        };
        const docRef = await addDoc(collection(db, "messages"), firestorePayload);
        // Update local item with Firestore doc id
        messageData.firestoreId = docRef.id;
        saveLocalMessages(currentList);
        console.log("[LoveMessagesStore] Saved to Cloud Firestore:", docRef.id);
      } catch (err) {
        console.warn("[LoveMessagesStore] Firestore write failed, message safe in local cache:", err);
      }
    }

    return messageData;
  },

  /**
   * Fetch all messages (Firestore cloud prioritized, with local fallback)
   */
  async getAllMessages() {
    const localList = getLocalMessages();

    if (!this.isCloudConnected()) {
      return localList;
    }

    try {
      const q = query(collection(db, "messages"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const cloudList = [];
      snapshot.forEach((d) => {
        const data = d.data();
        cloudList.push({
          id: d.id,
          firestoreId: d.id,
          sender: data.sender || "Via",
          recipient: data.recipient || "I'am/Yas",
          content: data.content || "",
          category: data.category || "Surat Cinta",
          singkat: data.singkat || "",
          createdAt: data.createdAt || new Date().toISOString()
        });
      });

      saveLocalMessages(cloudList);
      return cloudList;
    } catch (err) {
      console.warn("[LoveMessagesStore] Failed to query Firestore, using local:", err);
      return localList;
    }
  },

  /**
   * Realtime subscription for live updates across devices
   */
  subscribe(callback) {
    // Immediately emit current local messages for instantaneous UI render
    callback(getLocalMessages());

    // Listen for cross-tab or local updates
    const onLocalUpdate = (e) => {
      callback(e.detail || getLocalMessages());
    };
    window.addEventListener("love-messages-updated", onLocalUpdate);

    if (!this.isCloudConnected()) {
      return () => window.removeEventListener("love-messages-updated", onLocalUpdate);
    }

    try {
      const q = query(collection(db, "messages"), orderBy("createdAt", "desc"));
      const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
        const cloudList = [];
        snapshot.forEach((d) => {
          const data = d.data();
          cloudList.push({
            id: d.id,
            firestoreId: d.id,
            sender: data.sender || "Via",
            recipient: data.recipient || "I'am/Yas",
            content: data.content || "",
            category: data.category || "Surat Cinta",
            singkat: data.singkat || "",
            createdAt: data.createdAt || new Date().toISOString()
          });
        });

        // Firestore is the authoritative source of truth.
        // Directly sync local cache with cloud list:
        saveLocalMessages(cloudList);
        callback(cloudList);
      }, (err) => {
        console.warn("[LoveMessagesStore] Firestore realtime error, using local:", err);
      });

      return () => {
        window.removeEventListener("love-messages-updated", onLocalUpdate);
        unsubscribeFirestore();
      };
    } catch (e) {
      console.warn("[LoveMessagesStore] Realtime setup error:", e);
      return () => window.removeEventListener("love-messages-updated", onLocalUpdate);
    }
  },

  /**
   * Delete a message by ID
   */
  async deleteMessage(id) {
    const list = getLocalMessages();
    const itemToDelete = list.find(m => m.id === id || m.firestoreId === id);
    const updated = list.filter(m => m.id !== id && m.firestoreId !== id);
    saveLocalMessages(updated);

    if (this.isCloudConnected() && itemToDelete) {
      const cloudDocId = itemToDelete.firestoreId || (itemToDelete.id && !itemToDelete.id.startsWith("local-") ? itemToDelete.id : null);
      if (cloudDocId) {
        try {
          await deleteDoc(doc(db, "messages", cloudDocId));
          console.log("[LoveMessagesStore] Deleted doc from Cloud:", cloudDocId);
        } catch (e) {
          console.warn("[LoveMessagesStore] Cloud delete error:", e);
        }
      }
    }
    return true;
  }
};

// Expose globally for vanilla scripts
if (typeof window !== "undefined") {
  window.LoveMessagesStore = LoveMessagesStore;
}
