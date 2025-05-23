"use client";

import { ChatInput, Loader } from '@/components';
import { User } from '@/types';
import { Button, Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { formatDistanceToNow } from 'date-fns';
import { jwtDecode } from 'jwt-decode';
import { ReadonlyURLSearchParams, useRouter, useSearchParams } from 'next/navigation';
import { ReactNode, Suspense, useEffect, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { useRoom } from '../context/RoomContext';
import { useUser } from '../context/UserContext';

interface Message {
    user: User | null;
    message: string;
    timestamp?: Date;
}

interface OnlineUserInfo {
    id: String;
    userName: string;
}

// Separate component to use searchParams
interface SearchParamsWrapperProps {
    render: (searchParams: ReadonlyURLSearchParams) => ReactNode;
}

const SearchParamsWrapper = ({ render }: SearchParamsWrapperProps) => {
    const searchParams = useSearchParams();
    return render(searchParams);
};

// UI Component that doesn't directly use searchParams
interface ChatUIProps {
    roomId: string | null;
}

const ChatUI = ({ roomId }: ChatUIProps) => {
    const { user, setUser } = useUser();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [messages, setMessages] = useState<Message[]>([]);
    const [socket, setSocket] = useState<Socket | null>(null);
    const { room } = useRoom();
    let [isOpen, setIsOpen] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const [onlineUsers, setOnlineUsers] = useState<number>(0);
    const [onlineUsersList, setOnlineUsersList] = useState<OnlineUserInfo[]>([]);
    const [showOnlineUsers, setShowOnlineUsers] = useState(false);
    const onlineUsersRef = useRef<HTMLDivElement>(null);
    const [connectionError, setConnectionError] = useState(false);
    const [authError, setAuthError] = useState(false);

    useEffect(() => {
        // Handle clicking outside the online users dropdown
        const handleClickOutside = (event: MouseEvent) => {
            if (onlineUsersRef.current && !onlineUsersRef.current.contains(event.target as Node)) {
                setShowOnlineUsers(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        sessionStorage.removeItem('token');
        setUser(null);
        router.push('/');
    };

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const addMessage = (user: User | null, message: string) => {
        setMessages((prevMessages) => {
            if (!Array.isArray(prevMessages)) {
                return [{ user, message, timestamp: new Date() }];
            }
            return [...prevMessages, { user, message, timestamp: new Date() }];
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

    // Get filtered online users (excluding current user)
    const getFilteredOnlineUsers = () => {
        if (!user) return onlineUsersList;
        return onlineUsersList.filter(onlineUser => onlineUser.id !== user.id);
    };

    // Get the count of other online users (total minus current user)
    const getOtherOnlineUsersCount = () => {
        if (!user || onlineUsers <= 0) return 0;
        // If current user is in the list, subtract 1 from total count
        const userInList = onlineUsersList.some(u => u.id === user.id);
        return userInList ? onlineUsers - 1 : onlineUsers;
    };

    // Add a function to refresh token by redirecting to login
    const handleRefreshToken = () => {
        sessionStorage.removeItem('token');
        router.push(`/?roomId=${roomId}`);
    };

    // Add a function to attempt to refresh token without redirecting
    const attemptTokenRefresh = async () => {
        if (!user) return false;

        try {
            setIsLoading(true);
            // Try to get a new token using the existing user info
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/user/api/auth/refresh-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userName: user.userName,
                    roomId: roomId
                })
            });

            if (response.ok) {
                const data = await response.json();
                sessionStorage.setItem('token', data.token);
                setAuthError(false);
                setIsLoading(false);
                // Return true to indicate success
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to refresh token:', error);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // Add a function to check if the backend is reachable
    const checkBackendConnectivity = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;
            const response = await fetch(`${apiUrl}/health-check`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                mode: 'cors',
                // Timeout after 10 seconds
                signal: AbortSignal.timeout(10000)
            });
            return response.ok;
        } catch (error) {
            console.error('Backend connectivity check failed:', error);
            return false;
        }
    };

    useEffect(() => {
        if (!user) {
            router.push(`/?roomId=${roomId}`);
        } else {
            // Check if server is available first to avoid hanging connection attempts
            const connectToSocket = async () => {
                setIsLoading(true);
                try {
                    // Check if token exists
                    const token = sessionStorage.getItem('token');
                    if (!token) {
                        setAuthError(true);
                        setIsLoading(false);
                        return;
                    }

                    // Check if token is expired
                    try {
                        const decodedToken = jwtDecode(token);
                        const currentTime = Date.now() / 1000;
                        // Consider token expired if it's within 5 minutes of expiration
                        // to account for possible clock differences between client and server
                        if (decodedToken.exp && (decodedToken.exp - currentTime < 300)) {
                            // Token is expired or about to expire
                            console.log('Token expired or about to expire');
                            setAuthError(true);
                            sessionStorage.removeItem('token');
                            setIsLoading(false);
                            setTimeout(() => {
                                router.push(`/?roomId=${roomId}`);
                            }, 1000);
                            return;
                        }
                    } catch (tokenError) {
                        console.error('Invalid token:', tokenError);
                        setAuthError(true);
                        setIsLoading(false);
                        return;
                    }

                    // Optionally check server connectivity first
                    // const isBackendUp = await checkBackendConnectivity();
                    // if (!isBackendUp) {
                    //     throw new Error("Backend server appears to be down");
                    // }

                    const newSocket = io(`${process.env.NEXT_PUBLIC_BACKEND_SOCKET_API_URL}`, {
                        query: { token: sessionStorage.getItem('token'), roomId },
                        reconnectionAttempts: 5,
                        reconnectionDelay: 1000,
                        timeout: 20000,
                        transports: ['websocket', 'polling'] // Try websocket first, fallback to polling
                    });

                    // Add connection error handling
                    newSocket.on('connect_error', (error) => {
                        console.error('Socket connection error:', error);
                        if (error.message === 'Authentication error') {
                            setAuthError(true);
                            // Clear invalid token
                            sessionStorage.removeItem('token');
                            setIsLoading(false);

                            // Try to refresh token automatically first
                            attemptTokenRefresh().then(success => {
                                if (!success) {
                                    // If token refresh fails, redirect to login after a short delay
                                    setTimeout(() => {
                                        router.push(`/?roomId=${roomId}`);
                                    }, 1500);
                                }
                            });
                        } else {
                            setConnectionError(true);
                        }
                    });

                    newSocket.on('connect', () => {
                        console.log('Socket connected successfully');
                        setConnectionError(false);
                    });

                    newSocket.on('chat-message', (messageData) => {
                        if (messageData.user.id !== user.id) {
                            addMessage(messageData.user, messageData.message);
                        }
                    });

                    newSocket.on('chat-history', (chatHistory) => {
                        setMessages(chatHistory.map((msg: Message) => ({
                            ...msg,
                            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
                        })));
                    });

                    newSocket.on('online-users', (count) => {
                        setOnlineUsers(count);
                    });

                    newSocket.on('online-users-list', (usersList: OnlineUserInfo[]) => {
                        setOnlineUsersList(usersList);
                    });

                    setSocket(newSocket);
                    setIsLoading(false);

                    return () => {
                        newSocket.disconnect();
                    };
                } catch (error) {
                    console.error('Failed to connect to socket server:', error);
                    setConnectionError(true);
                    setIsLoading(false);
                }
            };

            connectToSocket();
        }
    }, [user, router, roomId]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const formatMessageTime = (date?: Date) => {
        if (!date) return '';
        return formatDistanceToNow(date, { addSuffix: true });
    };

    const groupMessagesByDate = () => {
        const groups: { date: string; messages: Message[] }[] = [];

        messages.forEach((message) => {
            const date = message.timestamp
                ? new Date(message.timestamp).toLocaleDateString()
                : new Date().toLocaleDateString();

            const existingGroup = groups.find(group => group.date === date);

            if (existingGroup) {
                existingGroup.messages.push(message);
            } else {
                groups.push({ date, messages: [message] });
            }
        });

        return groups;
    };

    if (isLoading) {
        return <Loader />;
    }

    return (
        <div className="bg-[#0c0c0e] h-screen flex flex-col max-w-md mx-auto shadow-xl">
            {connectionError && (
                <div className="bg-red-600/90 text-white py-2 px-4 text-sm text-center">
                    Can't connect to chat server. Please try again later.
                    <button
                        onClick={() => window.location.reload()}
                        className="underline ml-2 font-medium">
                        Reload
                    </button>
                </div>
            )}
            {authError && (
                <div className="bg-amber-600/90 text-white py-2 px-4 text-sm">
                    <div className="flex items-center justify-between">
                        <span>Authentication failed: Your session has expired.</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => window.location.reload()}
                                className="bg-amber-700 hover:bg-amber-800 px-2 py-1 rounded text-xs">
                                Try Again
                            </button>
                            <button
                                onClick={handleRefreshToken}
                                className="bg-amber-800 hover:bg-amber-900 px-2 py-1 rounded text-xs">
                                Login
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className="bg-[#111114] p-3 border-b border-neutral-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-[#1A1A22] flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#6e31e7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14" stroke="#6e31e7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M9 10H9.01" stroke="#6e31e7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M15 10H15.01" stroke="#6e31e7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div className="relative" ref={onlineUsersRef}>
                        <h1 className="text-white font-medium text-sm">{room?.roomName}</h1>
                        <button
                            onClick={() => setShowOnlineUsers(!showOnlineUsers)}
                            className="text-neutral-400 text-xs flex items-center gap-1 hover:text-neutral-300 transition-colors"
                        >
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500"></span>
                            <span>
                                {getOtherOnlineUsersCount()} online
                            </span>
                            {getFilteredOnlineUsers().length > 0 && (
                                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>

                        {/* Online Users Dropdown */}
                        {showOnlineUsers && getFilteredOnlineUsers().length > 0 && (
                            <div className="absolute top-full left-0 mt-1 w-48 bg-[#1A1A22] rounded-md shadow-lg border border-neutral-700/50 z-20 overflow-hidden">
                                <div className="px-3 py-2 border-b border-neutral-700/50 text-xs font-medium text-neutral-300">
                                    Online Users
                                </div>
                                <div className="max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                                    {getFilteredOnlineUsers().map((onlineUser) => (
                                        <div
                                            key={onlineUser.id.toString()}
                                            className="px-3 py-2 hover:bg-neutral-800/50 text-sm flex items-center gap-2"
                                        >
                                            <span className="h-2 w-2 rounded-full bg-green-500"></span>
                                            <span className={`${getColorFromUserName(onlineUser.userName)}`}>
                                                {onlineUser.userName}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleCopyUrl}
                        className="text-neutral-400 hover:text-white transition-colors p-2"
                        title="Copy chat link"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M13.1111 6.22222H15.8889C17.6089 6.22222 19 7.61333 19 9.33333V17.5556C19 19.2756 17.6089 20.6667 15.8889 20.6667H8.11111C6.39111 20.6667 5 19.2756 5 17.5556V9.33333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M5 14.1111H7.22222C8.94222 14.1111 10.3333 12.72 10.3333 11V5.11111C10.3333 3.39111 8.94222 2 7.22222 2H5C3.28 2 1.88889 3.39111 1.88889 5.11111V11C1.88889 12.72 3.28 14.1111 5 14.1111Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsOpen(true)}
                        className="text-red-500 hover:text-red-400 transition-colors p-2"
                        title="Logout"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16 17L21 12M21 12L16 7M21 12H9M9 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V16.2C3 17.8802 3 18.7202 3.32698 19.362C3.6146 19.9265 4.07354 20.3854 4.63803 20.673C5.27976 21 6.11984 21 7.8 21H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                {copySuccess && (
                    <div className="fixed top-4 right-4 bg-green-600 text-white px-3 py-1 rounded shadow-md text-xs font-medium animate-fade-in-out">
                        URL copied!
                    </div>
                )}

                <Dialog open={isOpen} as="div" className="relative z-10" onClose={() => setIsOpen(false)}>
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
                    <div className="fixed inset-0 z-10 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <DialogPanel
                                className="w-full max-w-sm rounded-xl bg-[#1A1A22] p-6 shadow-xl border border-neutral-800 transition-all data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0">
                                <DialogTitle as="h3" className="text-lg font-medium text-white">
                                    Confirm Logout
                                </DialogTitle>
                                <div className="mt-3">
                                    <p className="text-sm text-neutral-400">
                                        Are you sure you want to logout? You will need to log in again to access the chat.
                                    </p>
                                </div>
                                <div className="mt-6 flex justify-end space-x-3">
                                    <Button
                                        className="inline-flex items-center rounded-md bg-neutral-800 py-2 px-4 text-sm font-medium text-white hover:bg-neutral-700 transition-colors focus:outline-none"
                                        onClick={() => setIsOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button
                                        className="inline-flex items-center rounded-md bg-red-600 py-2 px-4 text-sm font-medium text-white hover:bg-red-700 transition-colors focus:outline-none"
                                        onClick={handleLogout}>
                                        Logout
                                    </Button>
                                </div>
                            </DialogPanel>
                        </div>
                    </div>
                </Dialog>
            </div>

            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                {messages && messages.length > 0 ? (
                    groupMessagesByDate().map((group, groupIndex) => (
                        <div key={groupIndex} className="mb-6">
                            <div className="flex justify-center mb-4">
                                <div className="px-3 py-1 bg-neutral-800/50 rounded-full text-neutral-400 text-xs">
                                    {group.date === new Date().toLocaleDateString() ? 'Today' : group.date}
                                </div>
                            </div>

                            {group.messages.map((msg, index) => {
                                const isCurrentUser = msg?.user?.id === user?.id;
                                const showUserName = !isCurrentUser &&
                                    (index === 0 || group.messages[index - 1]?.user?.id !== msg?.user?.id);

                                return (
                                    <div key={index} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-3`}>
                                        <div className="max-w-[80%]">
                                            {showUserName && !isCurrentUser && (
                                                <div className={`text-xs ml-1 mb-1 ${getColorFromUserName(msg?.user?.userName ?? '')}`}>
                                                    {msg?.user?.userName}
                                                </div>
                                            )}

                                            <div
                                                className={`
                                                    p-3 rounded-2xl shadow-sm
                                                    ${isCurrentUser
                                                        ? 'bg-[#6e31e7] text-white rounded-tr-none'
                                                        : 'bg-[#1A1A22] text-white rounded-tl-none border border-neutral-800'}
                                                `}
                                            >
                                                <div className="text-sm whitespace-pre-wrap break-words">
                                                    {msg?.message}
                                                </div>

                                                <div className={`text-xs mt-1 ${isCurrentUser ? 'text-purple-200/70' : 'text-neutral-500'} text-right`}>
                                                    {formatMessageTime(msg?.timestamp)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-500">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 10.5H16M8 14.5H11M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className="mt-4 text-sm">No messages yet</p>
                        <p className="text-xs mt-1">Be the first to start the conversation</p>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <ChatInput onSendMessage={handleSendMessage} />
        </div>
    );
};

// Separate component to use searchParams - let the page-level Suspense handle it
const ChatContent = () => {
    return (
        <SearchParamsWrapper
            render={(searchParams) => {
                const roomId = searchParams.get('roomId');
                return <ChatUI roomId={roomId} />;
            }}
        />
    );
};

// Page component with Suspense at page level
const ChatPage = () => {
    return (
        <Suspense fallback={<Loader />}>
            <ChatContent />
        </Suspense>
    );
};

export default ChatPage;
