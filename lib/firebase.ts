// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDjvE1sz703sthMdS_yjrfNbhe3PM_yRi8",
  authDomain: "paige-ai-db.firebaseapp.com",
  projectId: "paige-ai-db",
  storageBucket: "paige-ai-db.firebasestorage.app",
  messagingSenderId: "1069402872632",
  appId: "1:1069402872632:web:2221f3ba02dad7c4fbffcd",
  measurementId: "G-KN0Z159H9C"
};

// Prevent re-initialization on hot reload
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
