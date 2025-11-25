'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Users, Trophy, Sparkles, Grid3x3, List } from 'lucide-react';
import { getSocketUrl } from '@/lib/socket';

interface Player {
    id: string;
    name: string;
    card: number[][];
    isReach: boolean;
    isBingo: boolean;
}

type ViewMode = 'list' | 'grid';

export default function AdminPage() {
    const params = useParams();
    const roomId = params.roomId as string;

    const [socket, setSocket] = useState<Socket | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [history, setHistory] = useState<number[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [roomName, setRoomName] = useState('');

    useEffect(() => {
        const newSocket = io(getSocketUrl());
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Admin connected to backend');
            // Join room as observer
            newSocket.emit('join_room', { roomId, name: 'Admin', playerId: 'admin' }, (response: any) => {
                if (!response.error) {
                    setRoomName(response.roomName || roomId);
                }
            });
        });

        newSocket.on('player_joined', (data: { players: Player[] }) => {
            setPlayers(data.players);
        });

        newSocket.on('player_updated', (data: { players: Player[] }) => {
            setPlayers(data.players);
        });

        newSocket.on('number_drawn', (data: { number: number, history: number[] }) => {
            setHistory(data.history);
        });

        return () => {
            newSocket.close();
        };
    }, [roomId]);

    const isNumberDrawn = (num: number) => history.includes(num);

    const reachCount = players.filter(p => p.isReach).length;
    const bingoCount = players.filter(p => p.isBingo).length;

    return (
        <main className="min-h-screen bg-bingo-bg text-bingo-white p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-bingo-gold via-bingo-neon to-bingo-cyan bg-clip-text text-transparent">
                                Admin Panel
                            </h1>
                            <p className="text-xl text-gray-400 mt-2">Room: {roomName}</p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
                                    viewMode === 'list'
                                        ? 'bg-gradient-to-r from-bingo-gold to-bingo-cyan text-bingo-bg'
                                        : 'glass text-white hover:scale-105'
                                }`}
                            >
                                <List size={20} />
                                List View
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
                                    viewMode === 'grid'
                                        ? 'bg-gradient-to-r from-bingo-gold to-bingo-cyan text-bingo-bg'
                                        : 'glass text-white hover:scale-105'
                                }`}
                            >
                                <Grid3x3 size={20} />
                                Grid View
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="glass rounded-2xl p-6 text-center">
                            <Users className="mx-auto mb-2 text-bingo-cyan" size={32} />
                            <p className="text-4xl font-bold">{players.length}</p>
                            <p className="text-sm text-gray-400">Total Players</p>
                        </div>
                        <div className="glass rounded-2xl p-6 text-center">
                            <Sparkles className="mx-auto mb-2 text-bingo-neon" size={32} />
                            <p className="text-4xl font-bold">{reachCount}</p>
                            <p className="text-sm text-gray-400">Reach</p>
                        </div>
                        <div className="glass rounded-2xl p-6 text-center">
                            <Trophy className="mx-auto mb-2 text-bingo-gold" size={32} />
                            <p className="text-4xl font-bold">{bingoCount}</p>
                            <p className="text-sm text-gray-400">Bingo!</p>
                        </div>
                    </div>
                </motion.div>

                {/* List View */}
                {viewMode === 'list' && (
                    <div className="glass rounded-3xl p-8">
                        <h2 className="text-2xl font-bold mb-6 text-bingo-gold">Player Status</h2>
                        <div className="space-y-4">
                            {players.map((player, idx) => (
                                <motion.div
                                    key={player.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="glass rounded-2xl p-6 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-bingo-gold to-bingo-cyan flex items-center justify-center text-bingo-bg font-bold text-xl">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className="text-xl font-bold">{player.name}</p>
                                            <p className="text-sm text-gray-400">Player ID: {player.id.substring(0, 8)}...</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        {player.isBingo && (
                                            <div className="px-6 py-3 bg-gradient-to-r from-bingo-gold to-orange-500 rounded-xl font-bold flex items-center gap-2">
                                                <Trophy size={20} />
                                                BINGO!
                                            </div>
                                        )}
                                        {player.isReach && !player.isBingo && (
                                            <div className="px-6 py-3 bg-gradient-to-r from-bingo-cyan to-bingo-neon rounded-xl font-bold flex items-center gap-2">
                                                <Sparkles size={20} />
                                                REACH
                                            </div>
                                        )}
                                        {!player.isReach && !player.isBingo && (
                                            <div className="px-6 py-3 glass rounded-xl text-gray-400">
                                                Playing
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Grid View */}
                {viewMode === 'grid' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {players.map((player, idx) => (
                            <motion.div
                                key={player.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                className="glass rounded-3xl p-6"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-lg font-bold">{player.name}</p>
                                        <p className="text-xs text-gray-400">#{idx + 1}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {player.isBingo && (
                                            <Trophy className="text-bingo-gold" size={24} />
                                        )}
                                        {player.isReach && (
                                            <Sparkles className="text-bingo-neon" size={24} />
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-5 gap-1">
                                    {player.card.map((row, rowIndex) =>
                                        row.map((num, colIndex) => {
                                            const isFree = num === 0;
                                            const isDrawn = isNumberDrawn(num);
                                            return (
                                                <div
                                                    key={`${rowIndex}-${colIndex}`}
                                                    className={`
                                                        aspect-square flex items-center justify-center rounded-lg font-bold text-sm
                                                        ${isFree ? 'bg-gradient-to-br from-bingo-gold to-bingo-cyan text-bingo-bg' : ''}
                                                        ${!isFree && isDrawn ? 'bg-gradient-to-br from-bingo-neon to-bingo-cyan text-white' : ''}
                                                        ${!isFree && !isDrawn ? 'bg-white/10 text-gray-400' : ''}
                                                    `}
                                                >
                                                    {isFree ? 'F' : num}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
