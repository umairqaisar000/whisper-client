// components/TopBar.tsx

import { useRoom } from "@/app/context/RoomContext";
import { useUser } from "@/app/context/UserContext";

const TopBar = ({ onLogout }: { onLogout: () => void }) => {
    const { room } = useRoom();
    const { user } = useUser();

    return (
        <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
            <h1 className="text-xl font-bold">{user?.userName}</h1>
            <h1 className="text-xl font-bold">{room?.roomName}</h1>
            <button
                onClick={onLogout}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
                Logout
            </button>
        </div>
    );
};

export default TopBar;
