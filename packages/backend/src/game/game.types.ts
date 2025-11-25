export interface Player {
    id: string; // Persistent Player ID (UUID)
    socketId: string; // Current Socket ID
    name: string;
    card: number[][]; // 5x5 matrix
    isReach: boolean;
    isBingo: boolean;
}

export interface Room {
    roomId: string;
    status: 'WAITING' | 'PLAYING' | 'ENDED';
    numbersDrawn: number[];
    players: Map<string, Player>; // Map<SocketId, Player>
    hostId: string; // Socket ID of the host
    name: string;
}
