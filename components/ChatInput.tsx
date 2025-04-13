// components/ChatInput.tsx
"use client";

import { EmojiClickData } from 'emoji-picker-react';
import dynamic from 'next/dynamic';
import { KeyboardEvent, useEffect, useRef, useState } from 'react';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

const ChatInput = ({ onSendMessage }: { onSendMessage: (message: string) => void }) => {
    const [message, setMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const emojiContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiContainerRef.current && !emojiContainerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSend = () => {
        if (message.trim() !== '') {
            onSendMessage(message);
            setMessage('');
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleEmojiClick = (emojiData: EmojiClickData) => {
        setMessage(prev => prev + emojiData.emoji);
        setShowEmojiPicker(false);
        inputRef.current?.focus();
    };

    return (
        <div className="bg-[#0F0F13] p-3 flex items-center border-t border-neutral-800 relative">
            <div className="relative flex-1 flex items-center gap-2 bg-[#1A1A22] rounded-full px-4 py-2 border border-neutral-700/30">
                <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="text-neutral-400 hover:text-neutral-200 transition-colors"
                    aria-label="Add emoji"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M9 10H9.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M15 10H15.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent text-white placeholder-neutral-500 focus:outline-none text-sm py-2"
                />
            </div>
            <button
                onClick={handleSend}
                disabled={!message.trim()}
                className={`ml-2 flex items-center justify-center h-10 w-10 rounded-full ${message.trim() ? 'bg-[#6e31e7] hover:bg-[#5b28c4]' : 'bg-neutral-700 cursor-not-allowed'} transition-colors focus:outline-none`}
                aria-label="Send message"
            >
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    stroke="#ffffff"
                >
                    <path
                        d="M11.5003 12H5.41872M5.24634 12.7972L4.24158 15.7986C3.69128 17.4424 3.41613 18.2643 3.61359 18.7704C3.78506 19.21 4.15335 19.5432 4.6078 19.6701C5.13111 19.8161 5.92151 19.4604 7.50231 18.7491L17.6367 14.1886C19.1797 13.4942 19.9512 13.1471 20.1896 12.6648C20.3968 12.2458 20.3968 11.7541 20.1896 11.3351C19.9512 10.8529 19.1797 10.5057 17.6367 9.81135L7.48483 5.24303C5.90879 4.53382 5.12078 4.17921 4.59799 4.32468C4.14397 4.45101 3.77572 4.78336 3.60365 5.22209C3.40551 5.72728 3.67772 6.54741 4.22215 8.18767L5.24829 11.2793C5.34179 11.561 5.38855 11.7019 5.407 11.8459C5.42338 11.9738 5.42321 12.1032 5.40651 12.231C5.38768 12.375 5.34057 12.5157 5.24634 12.7972Z"
                        stroke="#ffffff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    ></path>
                </svg>
            </button>

            {showEmojiPicker && (
                <div
                    ref={emojiContainerRef}
                    className="absolute bottom-16 left-2 z-10"
                >
                    <EmojiPicker
                        onEmojiClick={handleEmojiClick}
                        lazyLoadEmojis={true}
                        skinTonesDisabled
                        searchDisabled={false}
                        width={300}
                        height={400}
                        previewConfig={{ showPreview: false }}
                    />
                </div>
            )}
        </div>
    );
};

export default ChatInput;
