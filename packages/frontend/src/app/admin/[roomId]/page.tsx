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

    const [, setSocket] = useState<Socket | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [history, setHistory] = useState<number[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [roomName, setRoomName] = useState('');

    useEffect(() => {
        const newSocket = io(getSocketUrl());
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Admin connected to backend');
            newSocket.emit('join_room', { roomId, name: 'Admin', playerId: 'admin' }, (response: { error?: string; roomName?: string }) => {
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
        <main className="min-h-screen bg-bingo-bg text-bingo-text p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-4xl font-bold text-gradient">
                                管理パネル
                            </h1>
                            <p className="text-xl text-bingo-text-light mt-2">ルーム: {roomName}</p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${viewMode === 'list'
                                    ? 'bg-gradient-to-r from-bingo-primary to-bingo-primary-dark text-white'
                                    : 'glass text-bingo-text hover:scale-105'
                                    }`}
                            >
                                <List size={20} />
                                リスト
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${viewMode === 'grid'
                                    ? 'bg-gradient-to-r from-bingo-primary to-bingo-primary-dark text-white'
                                    : 'glass text-bingo-text hover:scale-105'
                                    }`}
                            >
                                <Grid3x3 size={20} />
                                グリッド
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="glass rounded-2xl p-6 text-center">
                            <Users className="mx-auto mb-2 text-bingo-primary" size={32} />
                            <p className="text-4xl font-bold">{players.length}</p>
                            <p className="text-sm text-bingo-text-light">参加者</p>
                        </div>
                        <div className="glass rounded-2xl p-6 text-center">
                            <Sparkles className="mx-auto mb-2 text-bingo-accent" size={32} />
                            <p className="text-4xl font-bold">{reachCount}</p>
                            <p className="text-sm text-bingo-text-light">リーチ</p>
                        </div>
                        <div className="glass rounded-2xl p-6 text-center">
                            <Trophy className="mx-auto mb-2 text-bingo-primary" size={32} />
                            <p className="text-4xl font-bold">{bingoCount}</p>
                            <p className="text-sm text-bingo-text-light">ビンゴ！</p>
                        </div>
                    </div>
                </motion.div>

                {/* List View */}
                {viewMode === 'list' && (
                    <div className="glass rounded-3xl p-8">
                        <h2 className="text-2xl font-bold mb-6 text-bingo-primary">プレイヤー状況</h2>
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
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-bingo-primary to-bingo-primary-dark flex items-center justify-center text-white font-bold text-xl">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className="text-xl font-bold">{player.name}</p>
                                            <p className="text-sm text-bingo-text-light">Player ID: {player.id.substring(0, 8)}...</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        {player.isBingo && (
                                            <div className="px-6 py-3 bg-gradient-to-r from-bingo-primary to-bingo-primary-dark rounded-xl font-bold flex items-center gap-2 text-white">
                                                <Trophy size={20} />
                                                BINGO!
                                            </div>
                                        )}
                                        {player.isReach && !player.isBingo && (
                                            <div className="px-6 py-3 bg-gradient-to-r from-bingo-accent to-bingo-primary rounded-xl font-bold flex items-center gap-2 text-white">
                                                <Sparkles size={20} />
                                                REACH
                                            </div>
                                        )}
                                        {!player.isReach && !player.isBingo && (
                                            <div className="px-6 py-3 glass rounded-xl text-bingo-text-light">
                                                プレイ中
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
                                        <p className="text-xs text-bingo-text-light">#{idx + 1}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {player.isBingo && (
                                            <Trophy className="text-bingo-primary" size={24} />
                                        )}
                                        {player.isReach && (
                                            <Sparkles className="text-bingo-accent" size={24} />
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
                                                        ${isFree ? 'bg-gradient-to-br from-bingo-primary to-bingo-primary-dark text-white' : ''}
                                                        ${!isFree && isDrawn ? 'bg-gradient-to-br from-bingo-primary to-bingo-accent text-white' : ''}
                                                        ${!isFree && !isDrawn ? 'bg-gray-100 text-bingo-text-light' : ''}
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
