"use client"
import { Room } from '@/types';
// context/UserContext.tsx
import { ReactNode, createContext, useContext, useState } from 'react';


export interface RoomContextType {
    room: Room | null;
    setRoom: (user: Room | null) => void;
}


const RoomContext = createContext<RoomContextType | undefined>(undefined);

export const RoomProvider = ({ children }: { children: ReactNode }) => {
    const [room, setRoom] = useState<Room | null>(null);

    return (
        <RoomContext.Provider value={{ room, setRoom }}>
            {children}
        </RoomContext.Provider>
    );
};

export const useRoom = () => {
    const context = useContext(RoomContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
