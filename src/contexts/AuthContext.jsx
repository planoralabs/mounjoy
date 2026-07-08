import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
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

    const signup = async (email, password) => {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        return data;
    };

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    };

    const loginWithGoogle = async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
        });
        if (error) throw error;
        return data;
    };

    const logout = async () => {
        if (userUnsubscribeRef.current) {
            userUnsubscribeRef.current();
            userUnsubscribeRef.current = null;
        }
        setUserData(null);
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            const user = session?.user || null;
            const mappedUser = user ? { ...user, uid: user.id } : null;

            if (userUnsubscribeRef.current) {
                userUnsubscribeRef.current();
                userUnsubscribeRef.current = null;
            }

            setCurrentUser(mappedUser);

            if (mappedUser) {
                // Subscribe to Supabase user profiles table changes
                userUnsubscribeRef.current = userService.subscribeToUser(mappedUser.uid, (data) => {
                    setUserData(data);
                    setLoading(false);
                });
            } else {
                setUserData(null);
                setLoading(false);
            }
        });

        return () => {
            if (subscription) subscription.unsubscribe();
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
