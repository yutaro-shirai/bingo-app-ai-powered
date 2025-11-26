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
    players: Player[];
    hostSocketId: string | null;
    name: string;
}
