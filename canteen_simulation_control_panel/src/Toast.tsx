// Toast.jsx
import { useState, useEffect } from 'react';
import './Toast.css';

export function Toast(message: string, onClose: () => void, duration: number = 3000) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            // Allow time for fade-out animation before removing from DOM
            setTimeout(onClose, 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div className={`toast ${visible ? 'show' : 'hide'}`}>
            {message}
        </div>
    );
}