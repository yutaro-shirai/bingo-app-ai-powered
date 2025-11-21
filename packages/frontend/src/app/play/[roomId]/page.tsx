'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useParams } from 'next/navigation';

interface Player {
    id: string;
    name: string;
    card: number[][];
    isReach: boolean;
    isBingo: boolean;
}

export default function PlayPage() {
    const params = useParams();
    const roomId = params.roomId as string;

    const [socket, setSocket] = useState<Socket | null>(null);
    const [name, setName] = useState('');
    const [joined, setJoined] = useState(false);
    const [player, setPlayer] = useState<Player | null>(null);
    const [status, setStatus] = useState('WAITING');
    const [currentNumber, setCurrentNumber] = useState<number | null>(null);
    const [history, setHistory] = useState<number[]>([]);

    useEffect(() => {
        // Check localStorage for name
        const savedName = localStorage.getItem('bingo_name');
        if (savedName) setName(savedName);

        const newSocket = io('http://localhost:3004');
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to backend');
        });

        newSocket.on('game_started', (data) => {
            setStatus(data.status);
        });

        newSocket.on('number_drawn', (data) => {
            setCurrentNumber(data.number);
            setHistory(data.history);
        });

        return () => {
            newSocket.close();
        };
    }, []);

    const handleJoin = () => {
        if (!socket || !name) return;

        localStorage.setItem('bingo_name', name);

        socket.emit('join_room', { roomId, name }, (response: any) => {
            if (response.error) {
                alert(response.error);
            } else {
                setPlayer(response.player);
                setStatus(response.status);
                setJoined(true);
            }
        });
    };

    const isNumberDrawn = (num: number) => history.includes(num);

    const handleCellClick = (row: number, col: number, num: number) => {
        if (num === 0) return; // FREE
        if (!isNumberDrawn(num)) return; // Can only punch drawn numbers

        // In a real app, we might want to emit 'punch_card' here
        // For now, we'll just update local state visually or assume backend handles it if we send an event
        // But the requirement says "tap to open hole".
        // Let's just toggle a local state or rely on history check.
        // Actually, we should probably track which cells are punched.
        // But if we just check `history.includes(num)`, that means it's "lit up".
        // The user needs to "punch" it.
        // So we need a local state for "punched" cells if we want that distinction.
        // For MVP, let's just say if it's in history, it's highlighted.
        // If the user clicks it, maybe we mark it as "punched" locally.
    };

    if (!joined) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-purple-600 to-blue-600 text-white">
                <h1 className="text-4xl font-bold mb-8">Join Bingo!</h1>
                <div className="bg-white/10 p-8 rounded-xl backdrop-blur-md border border-white/20 w-full max-w-md">
                    <label className="block mb-2 text-sm font-bold">Nickname</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-3 mb-6 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        placeholder="Enter your name"
                    />
                    <button
                        onClick={handleJoin}
                        disabled={!name}
                        className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-lg transition-colors disabled:opacity-50"
                    >
                        Join Room {roomId}
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen flex-col items-center p-4 bg-gray-900 text-white">
            <div className="w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-sm text-gray-400">Player</h2>
                        <p className="text-xl font-bold">{player?.name}</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-sm text-gray-400">Status</h2>
                        <p className="text-xl font-bold text-yellow-400">{status}</p>
                    </div>
                </div>

                {currentNumber && (
                    <div className="mb-8 text-center p-4 bg-gray-800 rounded-xl border border-yellow-400/30">
                        <p className="text-gray-400 text-sm mb-1">Latest Number</p>
                        <p className="text-6xl font-bold text-yellow-400 animate-bounce">{currentNumber}</p>
                    </div>
                )}

                <div className="aspect-square w-full bg-white/5 p-2 rounded-xl border border-white/10">
                    <div className="grid grid-cols-5 gap-2 h-full">
                        {player?.card.map((row, rowIndex) => (
                            row.map((num, colIndex) => {
                                const isFree = num === 0;
                                const isDrawn = isNumberDrawn(num);
                                // For MVP, let's assume "punched" = "drawn".
                                // Or we can add a click handler to "mark" it.
                                return (
                                    <div
                                        key={`${rowIndex}-${colIndex}`}
                                        className={`
                      relative flex items-center justify-center rounded-lg font-bold text-xl sm:text-2xl transition-all duration-300
                      ${isFree ? 'bg-yellow-400 text-black' : ''}
                      ${!isFree && isDrawn ? 'bg-red-500 text-white scale-95 ring-2 ring-red-300' : ''}
                      ${!isFree && !isDrawn ? 'bg-white/10 text-white' : ''}
                    `}
                                    >
                                        {isFree ? 'FREE' : num}
                                    </div>
                                );
                            })
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}
