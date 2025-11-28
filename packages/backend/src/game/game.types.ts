export interface Player {
    id: string; // Persistent Player ID (UUID)
    socketId: string | null; // Current Socket ID
    name: string;
    card: number[][]; // 5x5 matrix
    isReach: boolean;
    isBingo: boolean;
    roomId: string;
}

export interface Room {
    id: string;
    roomId: string;
    status: string;
    numbersDrawn: number[];
<<<<<<< HEAD
    players: Player[];
    hostSocketId: string | null;
=======
    players: Map<string, Player>; // Map<SocketId, Player>
    hostId: string; // Socket ID of the host
>>>>>>> origin/main
    name: string;
}
