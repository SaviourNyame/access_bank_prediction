import { initializeApp, getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDAHdUvodUdNW-Df3Cw1T9RsEWOxWLY4QA",
  authDomain: "accessbankprediction.firebaseapp.com",
  projectId: "accessbankprediction",
  storageBucket: "accessbankprediction.firebasestorage.app",
  messagingSenderId: "939025808046",
  appId: "1:939025808046:web:d778f8a002d8375e0a8b3f",
  measurementId: "G-79WRBJ8HSG",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
const auth = getAuth(app);
const db = getFirestore(app);

export { app, analytics, auth, db };
