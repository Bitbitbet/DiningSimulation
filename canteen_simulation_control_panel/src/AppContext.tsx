import { createContext, useContext } from 'react';

interface AppContextType {
    isOnline: boolean;
    checkBackendStatus: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within AppProvider');
    }
    return context;
};

export default AppContext;