'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Player {
    id: string;
    name: string;
    isReach: boolean;
    isBingo: boolean;
}

export default function HostPage() {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [roomId, setRoomId] = useState('');
    const [status, setStatus] = useState('WAITING');
    const [players, setPlayers] = useState<Player[]>([]);
    const [currentNumber, setCurrentNumber] = useState<number | null>(null);
    const [history, setHistory] = useState<number[]>([]);

    useEffect(() => {
        const newSocket = io('http://localhost:3004');
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to backend');
            newSocket.emit('create_room');
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected');
        });

        // Listen for room creation response (we need to modify gateway to emit this or use callback)
        // Actually, in gateway createRoom returns { roomId }. 
        // Socket.io client emit with ack: socket.emit('event', data, (response) => {})

        // Let's use the callback pattern for create_room

        newSocket.on('player_joined', (data: { totalPlayers: number, players: Player[] }) => {
            setPlayers(data.players);
        });

        newSocket.on('game_started', (data: { status: string }) => {
            setStatus(data.status);
        });

        newSocket.on('number_drawn', (data: { number: number, history: number[] }) => {
            setCurrentNumber(data.number);
            setHistory(data.history);
        });

        return () => {
            newSocket.close();
        };
    }, []);

    // We need to handle the create_room ack separately since it's inside the effect
    useEffect(() => {
        if (socket && !roomId) {
            // We can't easily use ack in the 'connect' listener if we want to set state here.
            // But we can emit it here if connected.
            if (socket.connected) {
                socket.emit('create_room', {}, (response: { roomId: string }) => {
                    setRoomId(response.roomId);
                });
            } else {
                socket.on('connect', () => {
                    socket.emit('create_room', {}, (response: { roomId: string }) => {
                        setRoomId(response.roomId);
                    });
                });
            }
        }
    }, [socket, roomId]);


    const startGame = () => {
        if (socket && roomId) {
            socket.emit('start_game', { roomId });
        }
    };

    const drawNumber = () => {
        if (socket && roomId) {
            socket.emit('draw_number', { roomId });
        }
    };

    return (
        <main className="flex min-h-screen flex-col items-center p-8 bg-gray-900 text-white">
            <h1 className="text-4xl font-bold mb-8">Host Dashboard</h1>

            {!roomId ? (
                <p>Creating Room...</p>
            ) : (
                <div className="w-full max-w-4xl">
                    <div className="bg-gray-800 p-6 rounded-xl mb-8 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl text-gray-400">Room ID</h2>
                            <p className="text-5xl font-mono font-bold text-yellow-400 tracking-wider">{roomId}</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-xl text-gray-400">Players</h2>
                            <p className="text-4xl font-bold">{players.length}</p>
                        </div>
                    </div>

                    {status === 'WAITING' ? (
                        <div className="text-center">
                            <p className="text-xl mb-8">Waiting for players to join...</p>
                            <button
                                onClick={startGame}
                                className="px-8 py-4 bg-green-500 hover:bg-green-400 text-white font-bold rounded-full text-xl transition-transform hover:scale-105"
                            >
                                Start Game
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-gray-800 p-8 rounded-xl flex flex-col items-center justify-center aspect-square">
                                <h2 className="text-2xl text-gray-400 mb-4">Current Number</h2>
                                <div className="text-9xl font-bold text-white mb-8">
                                    {currentNumber ?? '--'}
                                </div>
                                <button
                                    onClick={drawNumber}
                                    className="px-8 py-4 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-full text-xl transition-transform hover:scale-105"
                                >
                                    Draw Number
                                </button>
                            </div>

                            <div className="bg-gray-800 p-8 rounded-xl">
                                <h2 className="text-2xl text-gray-400 mb-4">History</h2>
                                <div className="flex flex-wrap gap-2">
                                    {history.map((num) => (
                                        <span key={num} className="w-10 h-10 flex items-center justify-center bg-gray-700 rounded-full font-bold">
                                            {num}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Player List (Optional) */}
                    <div className="mt-8">
                        <h3 className="text-xl font-bold mb-4">Joined Players</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {players.map(p => (
                                <div key={p.id} className={`p-2 rounded ${p.isBingo ? 'bg-red-500' : p.isReach ? 'bg-yellow-500' : 'bg-gray-700'}`}>
                                    {p.name} {p.isBingo && '🎉'} {p.isReach && '⚠️'}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
