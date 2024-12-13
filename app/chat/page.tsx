"use client";

import { ChatInput, Loader } from '@/components';
import { User } from '@/types';
import { Button, Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { useRoom } from '../context/RoomContext';
import { useUser } from '../context/UserContext';

const ChatPage = () => {
    const searchParams = useSearchParams();
    const roomId = searchParams.get('roomId');
    const { user, setUser } = useUser();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [messages, setMessages] = useState<{ user: User | null; message: string }[]>([]);
    const [socket, setSocket] = useState<Socket | null>(null);
    const { room } = useRoom();
    let [isOpen, setIsOpen] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const handleLogout = () => {
        sessionStorage.removeItem('token');
        setUser(null);
        router.push(`/?roomId=${roomId}`);
    };

    const addMessage = (user: User | null, message: string) => {
        setMessages((prevMessages) => {
            if (!Array.isArray(prevMessages)) {
                return [{ user, message }];
            }
            return [...prevMessages, { user, message }];
        });
    };

    const handleSendMessage = (message: string) => {
        if (socket) {
            socket.emit('chat-message', { message, roomId });
            addMessage(user, message);
        }
    };

    const getColorFromUserName = (userName: string) => {
        const hash = Array.from(userName).reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const colors = [
            'text-teal-400', 'text-blue-400', 'text-pink-400',
            'text-purple-400', 'text-indigo-400', 'text-green-400',
            'text-yellow-400', 'text-red-400', 'text-orange-400'
        ];
        return colors[hash % colors.length];
    };

    useEffect(() => {
        if (!user) {
            router.push(`/?roomId=${roomId}`);
        } else {
            const newSocket = io(`${process.env.NEXT_PUBLIC_BACKEND_SOCKET_API_URL}`, {
                query: { token: sessionStorage.getItem('token'), roomId }
            });

            newSocket.on('chat-message', (messageData) => {
                if (messageData.user.id !== user.id) {
                    addMessage(messageData.user, messageData.message);
                }
            });

            newSocket.on('chat-history', (chatHistory) => {
                setMessages(chatHistory);
            });

            setSocket(newSocket);
            setIsLoading(false);

            return () => {
                newSocket.disconnect();
            };
        }
    }, [user, router, roomId]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    if (isLoading) {
        return <Loader />;
    }

    return (
        <div className="bg-[#0c0c0e] border border-neutral-900 h-screen flex flex-col max-w-lg mx-auto">
            <div className="border-b border-neutral-800 p-4 text-neutral-100 flex justify-between items-center">
                <div className='flex'>
                    <svg width="25px" height="25px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                        <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                        <g id="SVGRepo_iconCarrier">
                            <circle cx="12" cy="6" r="4" stroke="#ffffff" strokeWidth="1.5"></circle>
                            <path
                                d="M15 20.6151C14.0907 20.8619 13.0736 21 12 21C8.13401 21 5 19.2091 5 17C5 14.7909 8.13401 13 12 13C15.866 13 19 14.7909 19 17C19 17.3453 18.9234 17.6804 18.7795 18"
                                stroke="#ffffff"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            ></path>
                        </g>
                    </svg>
                    <div className={`${getColorFromUserName(user?.userName ?? '')}  ml-1`}>{user?.userName}</div>
                </div>
                <span className='text-neutral-100'>{room?.roomName}</span>
                <div className="relative inline-block text-left">
                    <button data-modal-target="popup-modal" data-modal-toggle="popup-modal" type="button" onClick={() => setIsOpen(true)}>
                        <svg className="w-4 h-4 text-gray-800 dark:text-red-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h11m0 0-4-4m4 4-4 4m-5 3H3a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h3" />
                        </svg>
                    </button>
                </div>
                <Dialog open={isOpen} as="div" className="relative z-10" onClose={() => setIsOpen(false)}>
                    <div className="fixed inset-0 bg-black bg-opacity-50" />
                    <div className="fixed inset-0 z-10 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <DialogPanel
                                className="w-full max-w-md rounded-xl bg-white/5 p-6 backdrop-blur-2xl duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0">
                                <DialogTitle as="h3" className="text-base/7 font-medium text-white">
                                    Confirm Logout
                                </DialogTitle>
                                <div className="mt-2">
                                    <p className="text-sm text-gray-500">
                                        Are you sure you want to logout? You will need to log in again to access the chat.
                                    </p>
                                </div>
                                <div className="mt-4 flex justify-end space-x-2">
                                    <Button
                                        className="inline-flex items-center gap-2 rounded-md bg-gray-700 py-1.5 px-3 text-sm/6 font-semibold text-white shadow-inner shadow-white/10 focus:outline-none data-[hover]:bg-gray-600 data-[focus]:outline-1 data-[focus]:outline-white data-[open]:bg-gray-700"

                                        onClick={() => setIsOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button
                                        className="inline-flex items-center gap-2 rounded-md bg-red-700 py-1.5 px-3 text-sm/6 font-semibold text-white shadow-inner shadow-white/10 focus:outline-none data-[hover]:bg-red-600 data-[focus]:outline-1 data-[focus]:outline-white data-[open]:bg-red-700"

                                        onClick={handleLogout}>
                                        Logout
                                    </Button>
                                </div>
                            </DialogPanel>
                        </div>
                    </div>
                </Dialog>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                <div className="flex flex-col space-y-2">
                    {messages && messages.length > 0 ? messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg?.user?.id === user?.id ? 'justify-end' : 'justify-start'}`}>
                            <div className={`text-white p-2 rounded-lg max-w-xs ${msg?.user?.id === user?.id ? 'bg-[#6e31e7] border border-neutral-800' : 'bg-neutral-900 border border-neutral-800'}`}>
                                {msg?.user?.id !== user?.id ? (
                                    <div className={`text-sm break-words font-extralight mr-2 ${getColorFromUserName(msg?.user?.userName ?? '')}`}>
                                        {msg?.user?.userName}
                                    </div>
                                ) : null}
                                {msg?.message}
                                <div className={`text-xs ${msg?.user?.id === user?.id ? 'text-gray-300 text-right' : 'text-neutral-500 text-left'}`}>

                                </div>
                            </div>
                        </div>
                    )) : (
                        <div>No messages yet</div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>
            <ChatInput onSendMessage={handleSendMessage} />
        </div>
    );
};

export default ChatPage;
