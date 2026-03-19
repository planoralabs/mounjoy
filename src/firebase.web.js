import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const getEnv = (key) => {
    // Vite (Web)
    if (import.meta && import.meta.env && import.meta.env[key]) {
        return import.meta.env[key];
    }
    // Expo (Native)
    if (process && process.env && process.env[`EXPO_PUBLIC_${key}`]) {
        return process.env[`EXPO_PUBLIC_${key}`];
    }
    return '';
};

const firebaseConfig = {
    apiKey: getEnv('VITE_FIREBASE_API_KEY'),
    authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnv('VITE_FIREBASE_APP_ID'),
    measurementId: getEnv('VITE_FIREBASE_MEASUREMENT_ID')
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Auth and Google Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
