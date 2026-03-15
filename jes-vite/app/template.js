'use client';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function Template({ children }) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setIsMobile(window.innerWidth < 768);
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, y: isMobile ? 8 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: isMobile ? -8 : -16 }}
            transition={{
                type: 'spring',
                stiffness: isMobile ? 350 : 250,
                damping: isMobile ? 35 : 25,
            }}
            style={{ willChange: 'transform, opacity' }}
            className="w-full h-full"
        >
            {children}
        </motion.div>
    );
}
