import { useEffect, useRef, useCallback } from 'react';

/**
 * useChatScroll Hook - Keeps chat scrolled to bottom
 * 
 * Features:
 * - Smooth scroll on new messages
 * - Instant scroll on initial load
 * - Prevents scroll jump when user is reading history
 * 
 * @param {Array} messages - The messages array dependency
 * @param {Object} options - Configuration options
 */
export function useChatScroll(messages, options = {}) {
    const {
        behavior = 'smooth',
        threshold = 100 // Distance from bottom to auto-scroll
    } = options;

    const scrollRef = useRef(null);
    const isNearBottomRef = useRef(true);
    const prevMessagesLengthRef = useRef(0);

    // Check if user is near the bottom
    const checkNearBottom = useCallback(() => {
        if (!scrollRef.current) return true;

        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        return scrollHeight - scrollTop - clientHeight < threshold;
    }, [threshold]);

    // Scroll to bottom function
    const scrollToBottom = useCallback((scrollBehavior = behavior) => {
        if (!scrollRef.current) return;

        scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: scrollBehavior
        });
    }, [behavior]);

    // On scroll, update if near bottom
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const handleScroll = () => {
            isNearBottomRef.current = checkNearBottom();
        };

        el.addEventListener('scroll', handleScroll, { passive: true });
        return () => el.removeEventListener('scroll', handleScroll);
    }, [checkNearBottom]);

    // Auto-scroll when messages change
    useEffect(() => {
        const messagesLength = messages?.length || 0;
        const prevLength = prevMessagesLengthRef.current;

        if (messagesLength === 0) {
            prevMessagesLengthRef.current = 0;
            return;
        }

        // Initial load - instant scroll
        if (prevLength === 0 && messagesLength > 0) {
            requestAnimationFrame(() => {
                scrollToBottom('instant');
            });
        }
        // New message added - smooth scroll if near bottom
        else if (messagesLength > prevLength) {
            if (isNearBottomRef.current) {
                requestAnimationFrame(() => {
                    scrollToBottom('smooth');
                });
            }
        }

        prevMessagesLengthRef.current = messagesLength;
    }, [messages, scrollToBottom]);

    // Force scroll (for when user sends a message)
    const forceScrollToBottom = useCallback(() => {
        isNearBottomRef.current = true;
        requestAnimationFrame(() => {
            scrollToBottom('smooth');
        });
    }, [scrollToBottom]);

    return {
        scrollRef,
        scrollToBottom: forceScrollToBottom,
        isNearBottom: () => isNearBottomRef.current
    };
}

export default useChatScroll;
