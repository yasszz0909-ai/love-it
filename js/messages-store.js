/**
 * OUR LITTLE STORY - Love Messages Store
 * Dual-layer persistence: Firebase Firestore (Cloud) + localStorage (Offline/Instant cache)
 * Features dual-mode transport: Firebase Modular SDK with instant HTTPS REST fallback
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc, 
  doc 
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
const FIRESTORE_REST_URL = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/messages?key=${firebaseConfig.apiKey}`;

let db = null;
let isFirebaseReady = false;

try {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  isFirebaseReady = true;
} catch (e) {
  console.warn("[Firebase] Initialization warning, using REST/local fallback:", e);
}

// ----------------------------------------------------------------------------
// Local Storage Helper
// ----------------------------------------------------------------------------
function getLocalMessages() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Filter out old deleted/test messages if present
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

// Helper: Save via direct standard HTTPS REST endpoint
async function saveViaRest(payload) {
  const body = {
    fields: {
      sender: { stringValue: payload.sender },
      recipient: { stringValue: payload.recipient },
      content: { stringValue: payload.content },
      category: { stringValue: payload.category || "Balasan Surat Cinta" },
      singkat: { stringValue: payload.singkat || "" },
      createdAt: { stringValue: payload.createdAt }
    }
  };

  const res = await fetch(FIRESTORE_REST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`REST Firestore error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  // Name format: projects/.../databases/.../documents/messages/{docId}
  const parts = (data.name || "").split("/");
  return parts[parts.length - 1] || "rest-" + Date.now();
}

// Helper: Query via REST endpoint
async function queryViaRest() {
  const res = await fetch(FIRESTORE_REST_URL);
  if (!res.ok) throw new Error(`REST query error: ${res.status}`);
  const data = await res.json();
  const documents = data.documents || [];
  return documents.map(d => {
    const parts = (d.name || "").split("/");
    const id = parts[parts.length - 1];
    const fields = d.fields || {};
    return {
      id: id,
      firestoreId: id,
      sender: fields.sender?.stringValue || "Via",
      recipient: fields.recipient?.stringValue || "I'am/Yas",
      content: fields.content?.stringValue || "",
      category: fields.category?.stringValue || "Surat Cinta",
      singkat: fields.singkat?.stringValue || "",
      createdAt: fields.createdAt?.stringValue || d.createTime || new Date().toISOString()
    };
  });
}

// ----------------------------------------------------------------------------
// Store API
// ----------------------------------------------------------------------------
export const LoveMessagesStore = {
  isCloudConnected() {
    return isFirebaseReady && db !== null;
  },

  /**
   * Save a love message permanently to Firestore Cloud & localStorage
   * Guaranteed to complete network persistence before resolving
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

    // 1. Instantly save to local storage (0ms latency, safety first)
    const currentList = getLocalMessages();
    currentList.unshift(messageData);
    saveLocalMessages(currentList);

    // 2. Persist to Firestore Cloud Database
    let cloudDocId = null;
    let cloudError = null;

    const firestorePayload = {
      sender: trimmedSender,
      recipient: trimmedRecipient,
      content: trimmedContent,
      category: category,
      singkat: trimmedSingkat,
      createdAt: nowIso
    };

    // Attempt 1: Modular Firebase SDK with 3.5s timeout
    if (this.isCloudConnected()) {
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("SDK Timeout")), 3500)
        );
        const writePromise = addDoc(collection(db, "messages"), firestorePayload);
        const docRef = await Promise.race([writePromise, timeoutPromise]);
        cloudDocId = docRef.id;
        console.log("[LoveMessagesStore] Saved via Firebase SDK:", cloudDocId);
      } catch (err) {
        console.warn("[LoveMessagesStore] SDK write failed or timed out, trying REST fallback:", err);
        cloudError = err;
      }
    }

    // Attempt 2: Direct HTTPS REST (works reliably across all environments & iframes)
    if (!cloudDocId) {
      try {
        cloudDocId = await saveViaRest(firestorePayload);
        console.log("[LoveMessagesStore] Saved via direct HTTPS REST:", cloudDocId);
      } catch (restErr) {
        console.error("[LoveMessagesStore] Both SDK and REST writes failed:", restErr);
        cloudError = restErr;
      }
    }

    // If cloud write succeeded, update the local item with the permanent Cloud ID
    if (cloudDocId) {
      messageData.id = cloudDocId;
      messageData.firestoreId = cloudDocId;
      messageData.savedToCloud = true;
      const updatedList = getLocalMessages().map(m => m.id === localId ? messageData : m);
      saveLocalMessages(updatedList);
      return { success: true, firestoreId: cloudDocId, data: messageData };
    }

    // Still safe in local cache even if offline
    return { success: false, isLocalOnly: true, error: cloudError?.message, data: messageData };
  },

  /**
   * Fetch all messages (Firestore cloud prioritized, with local fallback)
   */
  async getAllMessages() {
    const localList = getLocalMessages();

    // 1. Try Firebase SDK query
    if (this.isCloudConnected()) {
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

        // Merge any unsaved local-only messages
        const unsyncedLocals = localList.filter(l => l.id && l.id.startsWith("local-") && !cloudList.some(c => c.content === l.content));
        const merged = [...unsyncedLocals, ...cloudList];
        saveLocalMessages(merged);
        return merged;
      } catch (err) {
        console.warn("[LoveMessagesStore] SDK query failed, trying REST fallback:", err);
      }
    }

    // 2. Try REST query
    try {
      const restList = await queryViaRest();
      restList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const unsyncedLocals = localList.filter(l => l.id && l.id.startsWith("local-") && !restList.some(c => c.content === l.content));
      const merged = [...unsyncedLocals, ...restList];
      saveLocalMessages(merged);
      return merged;
    } catch (e) {
      console.warn("[LoveMessagesStore] Cloud fetch unavailable, returning local cache:", e);
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
      // Periodically refresh via REST if SDK is not available
      const interval = setInterval(async () => {
        try {
          const list = await queryViaRest();
          callback(list);
        } catch (e) {}
      }, 15000);

      return () => {
        window.removeEventListener("love-messages-updated", onLocalUpdate);
        clearInterval(interval);
      };
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

        // Merge any pending local items
        const currentLocals = getLocalMessages();
        const pending = currentLocals.filter(l => l.id && l.id.startsWith("local-") && !cloudList.some(c => c.content === l.content));
        const merged = [...pending, ...cloudList];

        saveLocalMessages(merged);
        callback(merged);
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
