import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import './Toast.css';


const DURATION = 3000;

const ToastContext = createContext<(message: string) => void>(_ => { });

export function ToastProvider({ children }: { children: React.JSX.Element }) {
    const [message, setMessage] = useState<string>('');
    const [visible, setVisible] = useState(false);

    const showToast = useCallback((message: string) => {
        setMessage(message);
        setVisible(true);
    }, []);

    return <ToastContext.Provider value={showToast}>
        {children}
        {message && <Toast
            message={message}
            visible={visible}
            onHide={() => {
                setVisible(false);
            }}
        />}
    </ToastContext.Provider>
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("没有用ToastProvider");
    }
    return context;
}

export function Toast({ message, visible, onHide }:
    {
        message: string | null;
        visible: boolean;
        onHide: () => void
    }) {

    useEffect(() => {
        if (visible) {
            const timer = setTimeout(() => {
                onHide();
            }, DURATION);

            return () => clearTimeout(timer);
        }
    }, [visible, message]);

    return (
        <div className={`toast ${visible ? 'show' : 'hide'}`}>
            {message}
        </div>
    );
}