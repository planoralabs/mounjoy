import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
    onAuthStateChanged,
    signInWithPopup,
    signOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { userService } from '../services/userService';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const userUnsubscribeRef = useRef(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    const signup = (email, password) => {
        return createUserWithEmailAndPassword(auth, email, password);
    };

    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const loginWithGoogle = () => {
        return signInWithPopup(auth, googleProvider);
    };

    const logout = async () => {
        // 🔐 Critical Fix: Kill connection to Firestore BEFORE signing out to prevent permission errors
        if (userUnsubscribeRef.current) {
            userUnsubscribeRef.current();
            userUnsubscribeRef.current = null;
        }
        setUserData(null);
        return signOut(auth);
    };

    useEffect(() => {
        let unsubscribeUser = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            // Clean up existing Firestore subscription before changing auth state
            if (userUnsubscribeRef.current) {
                userUnsubscribeRef.current();
                userUnsubscribeRef.current = null;
            }

            setCurrentUser(user);

            if (user) {
                // Subscribe to Firestore user document
                userUnsubscribeRef.current = userService.subscribeToUser(user.uid, (data) => {
                    setUserData(data);
                    setLoading(false);
                });
            } else {
                setUserData(null);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (userUnsubscribeRef.current) userUnsubscribeRef.current();
        };
    }, []);

    const value = {
        currentUser,
        userData,
        login,
        signup,
        logout,
        loginWithGoogle
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
