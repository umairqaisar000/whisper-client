"use client";

import { useRoom } from "@/app/context/RoomContext";
import { useUser } from "@/app/context/UserContext";
import { JwtPayload, Room } from "@/types";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";


const HomePage = () => {
    const [username, setUsername] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const searchParams = useSearchParams();
    let paramRoomId = searchParams.get('roomId');
    const router = useRouter();
    const { setRoom } = useRoom();
    const { setUser } = useUser();

    const handleLogin = async () => {
        if (!username) {
            alert('Please enter a username');
            return;
        }

        setIsLoading(true);

        try {
            // Prepare the payload
            const payload = { username, paramRoomId };
            // // Send POST request to the backend to get the JWT
            const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/user/api/auth/login`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = response.data;

            let room: Room = data.room;
            const token = data.token;
            const userData: JwtPayload = jwtDecode(token);

            // Store the JWT token in sessionStorage (or cookies/localStorage)
            sessionStorage.setItem('token', token);
            setRoom(room);
            setUser({ id: userData.user.id, userName: userData.user.userName });
            router.push(`/chat/?roomId=${room.id}`);
        } catch (error) {
            console.error('Login failed:', error);
            alert('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main
            className="flex items-center justify-center h-screen overflow-hidden bg-cover bg-center px-10"
            style={{ backgroundImage: "url('/background.jpg')" }}
        >
            <div className="bg-opacity-50 text-center w-96 sm:mx-10">
                <h1 className="text-white text-4xl font-sans font-thin">Welcome to Whisper</h1>
                <p className="mt-5 text-white text-left font-sans font-light">
                    Before joining a room please set up a username. You can also enter your email to see your Gravatar near your messages!
                </p>
                <div className="w-full max-w-sm min-w-[200px] mt-12 mx-auto">
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            className="w-full placeholder:text-neutral-400 text-white bg-neutral-800 text-sm border border-neutral-700 rounded-md pl-4 pr-20 py-2 transition duration-300 ease focus:outline-none focus:border-neutral-500 hover:border-neutral-600 shadow-sm"
                            placeholder="jack.sparrow"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
                        />
                        <button
                            className="absolute right-1 top-1 rounded bg-neutral-700 py-1 px-4 border border-transparent text-center text-sm text-white transition-all shadow-sm hover:shadow focus:bg-neutral-600 focus:shadow-none active:bg-neutral-600 hover:bg-neutral-600 active:shadow-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
                            type="button"
                            onClick={handleLogin}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Loading...' : 'Enter'}
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default HomePage