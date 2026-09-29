/**
 * OUR LITTLE STORY - Love Messages Store
 * Dual-layer persistence: Firebase Firestore (Cloud) + localStorage (Offline/Instant cache)
 * Guaranteed Idempotent Writes & Automatic Deduplication
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  setDoc,
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
const FIRESTORE_REST_BASE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/messages`;

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
// Deduplication & Local Storage Helpers
// ----------------------------------------------------------------------------
export function deduplicateMessages(messages) {
  if (!Array.isArray(messages)) return [];
  const seenIds = new Set();
  const seenContents = new Set();
  const unique = [];

  for (const m of messages) {
    if (!m) continue;
    const idKey = m.firestoreId || m.id;
    const contentKey = (m.content || "").trim();

    // Skip duplicates by ID or identical content
    if (idKey && seenIds.has(idKey)) continue;
    if (contentKey && seenContents.has(contentKey)) continue;

    if (idKey) seenIds.add(idKey);
    if (contentKey) seenContents.add(contentKey);
    unique.push(m);
  }
  return unique;
}

function getLocalMessages() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const deduped = deduplicateMessages(parsed);
    if (deduped.length !== parsed.length) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(deduped));
    }
    return deduped;
  } catch (e) {
    console.error("Error reading localStorage messages:", e);
    return [];
  }
}

function saveLocalMessages(messages) {
  try {
    const cleaned = deduplicateMessages(messages);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleaned));
    window.dispatchEvent(new CustomEvent("love-messages-updated", { detail: cleaned }));
  } catch (e) {
    console.error("Error writing localStorage messages:", e);
  }
}

// Helper: Save via REST endpoint with specific documentId (Idempotent)
async function saveViaRestIdempotent(docId, payload) {
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

  // Try POST with explicit documentId
  const urlWithId = `${FIRESTORE_REST_BASE}?documentId=${docId}&key=${firebaseConfig.apiKey}`;
  const res = await fetch(urlWithId, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (res.ok) {
    return docId;
  }

  // If already exists (409 Conflict), update using PATCH
  if (res.status === 409) {
    const patchUrl = `${FIRESTORE_REST_BASE}/${docId}?key=${firebaseConfig.apiKey}`;
    const patchRes = await fetch(patchUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (patchRes.ok) return docId;
  }

  const errText = await res.text();
  throw new Error(`REST error ${res.status}: ${errText}`);
}

// Helper: Query via REST endpoint
async function queryViaRest() {
  const url = `${FIRESTORE_REST_BASE}?key=${firebaseConfig.apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`REST query error: ${res.status}`);
  const data = await res.json();
  const documents = data.documents || [];
  const list = documents.map(d => {
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
  return deduplicateMessages(list);
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
   * Guaranteed IDEMPOTENT: Uses a single generated document ID so duplicate writes are impossible
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

    // Deterministic unique ID generated BEFORE any write attempt
    // Both SDK and REST will write to this exact ID, ensuring zero duplication
    const docId = "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);

    const messageData = {
      id: docId,
      firestoreId: docId,
      sender: trimmedSender,
      recipient: trimmedRecipient,
      content: trimmedContent,
      category: category,
      singkat: trimmedSingkat,
      createdAt: nowIso,
      savedToCloud: false
    };

    // 1. Instantly save to local storage (0ms latency, deduplicated)
    const currentList = getLocalMessages();
    // Remove any previous entry with exact same content to prevent local duplicates
    const filteredList = currentList.filter(m => (m.content || "").trim() !== trimmedContent);
    filteredList.unshift(messageData);
    saveLocalMessages(filteredList);

    // 2. Persist to Firestore Cloud Database
    const firestorePayload = {
      sender: trimmedSender,
      recipient: trimmedRecipient,
      content: trimmedContent,
      category: category,
      singkat: trimmedSingkat,
      createdAt: nowIso
    };

    let cloudSaved = false;

    // Primary: Write with SDK using setDoc (Idempotent to docId)
    if (this.isCloudConnected()) {
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("SDK Timeout")), 3000)
        );
        const writePromise = setDoc(doc(db, "messages", docId), firestorePayload);
        await Promise.race([writePromise, timeoutPromise]);
        cloudSaved = true;
        console.log("[LoveMessagesStore] Saved via Firebase SDK:", docId);
      } catch (err) {
        console.warn("[LoveMessagesStore] SDK setDoc timed out/failed, trying REST fallback:", err);
      }
    }

    // Secondary: Direct HTTPS REST (Idempotent to same docId)
    if (!cloudSaved) {
      try {
        await saveViaRestIdempotent(docId, firestorePayload);
        cloudSaved = true;
        console.log("[LoveMessagesStore] Saved via HTTPS REST:", docId);
      } catch (restErr) {
        console.error("[LoveMessagesStore] REST fallback error:", restErr);
      }
    }

    messageData.savedToCloud = cloudSaved;
    saveLocalMessages(filteredList);

    return { 
      success: cloudSaved, 
      firestoreId: docId, 
      data: messageData 
    };
  },

  /**
   * Fetch all messages (Firestore cloud prioritized, with deduplication)
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

        const merged = deduplicateMessages([...cloudList, ...localList]);
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
      const merged = deduplicateMessages([...restList, ...localList]);
      saveLocalMessages(merged);
      return merged;
    } catch (e) {
      console.warn("[LoveMessagesStore] Cloud fetch unavailable, returning local cache:", e);
      return localList;
    }
  },

  /**
   * Realtime subscription with automatic deduplication
   */
  subscribe(callback) {
    // Immediately emit current local messages for instantaneous UI render
    callback(getLocalMessages());

    // Listen for cross-tab or local updates
    const onLocalUpdate = (e) => {
      callback(deduplicateMessages(e.detail || getLocalMessages()));
    };
    window.addEventListener("love-messages-updated", onLocalUpdate);

    if (!this.isCloudConnected()) {
      // Periodically refresh via REST if SDK is not available
      const interval = setInterval(async () => {
        try {
          const list = await queryViaRest();
          const localList = getLocalMessages();
          const merged = deduplicateMessages([...list, ...localList]);
          callback(merged);
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

        const currentLocals = getLocalMessages();
        const merged = deduplicateMessages([...cloudList, ...currentLocals]);

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
      const cloudDocId = itemToDelete.firestoreId || itemToDelete.id;
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
  window.deduplicateMessages = deduplicateMessages;
}
