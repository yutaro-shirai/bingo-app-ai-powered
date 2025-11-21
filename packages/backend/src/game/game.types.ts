export interface Player {
    id: string; // Socket ID
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
}
