import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { sanitizeInput } from '../utils/securityUtils';

/**
 * Service to handle user-related data operations in Firestore.
 */
export const userService = {
    /**
     * Gets or creates a user document in Firestore.
     */
    getUserProfile: async (uid) => {
        try {
            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);
            return userSnap.exists() ? userSnap.data() : null;
        } catch (error) {
            console.error("Error fetching user profile:", error);
            throw error;
        }
    },

    /**
     * Saves or overwrites the entire user profile.
     */
    saveUserProfile: async (uid, userData) => {
        try {
            const userRef = doc(db, 'users', uid);
            await setDoc(userRef, {
                ...userData,
                name: sanitizeInput(userData.name),
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (error) {
            console.error("Error saving user profile:", error);
            if (error.code === 'permission-denied') {
                console.error("Permission denied. check Firestore rules.");
            }
            throw error;
        }
    },

    /**
     * Updates specific fields in the user profile.
     */
    updateUserData: async (uid, data) => {
        try {
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, {
                ...data,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error("Error updating user data:", error);
            throw error;
        }
    },

    /**
     * Real-time listener for user data changes.
     */
    subscribeToUser: (uid, callback) => {
        const userRef = doc(db, 'users', uid);
        return onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
                callback(doc.data());
            } else {
                callback(null);
            }
        }, (error) => {
            if (error.code === 'permission-denied') {
                // Expected when user logs out while subscription is still cleaning up
                return;
            }
            console.error("Firestore subscription error:", error);
        });
    },

    /**
     * 🔐 Direito ao Esquecimento (OWASP Pillar 02/LGPD)
     * Remove todos os dados do usuário do Firestore.
     */
    deleteUserAccount: async (uid) => {
        try {
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, { 
                deletedAt: new Date().toISOString(),
                isDeleted: true,
                photoURL: null,
                name: 'Usuário Removido' 
            });
            // Opcional: deletar o documento de vez ou apenas marcar como deletado para auditoria
            // await deleteDoc(userRef); 
        } catch (error) {
            console.error("Error deleting user account:", error);
            throw error;
        }
    }
};
