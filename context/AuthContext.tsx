import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase';
import { User, updateProfile } from 'firebase/auth';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    updateUserProfile: (fullname: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    updateUserProfile: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const updateUserProfile = async (fullname: string) => {
        if (auth.currentUser) {
            await updateProfile(auth.currentUser, {
                displayName: fullname
            });
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, updateUserProfile }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);