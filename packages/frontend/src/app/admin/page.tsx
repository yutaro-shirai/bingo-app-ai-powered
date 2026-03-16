'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, LogIn, Server, Users, Calendar, Activity } from 'lucide-react';
import { getSocketUrl } from '@/lib/socket';

interface Room {
    roomId: string;
    name: string;
    status: string;
    createdAt: string;
    playerCount: number;
    bingoCount: number;
    reachCount: number;
}

export default function AdminPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const API_URL = getSocketUrl().replace('ws://', 'http://').replace('wss://', 'https://');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
                credentials: 'include',
            });

            if (res.ok) {
                setIsLoggedIn(true);
                fetchRooms();
            } else {
                setError('Invalid password');
            }
        } catch {
            setError('Login failed');
        } finally {
            setLoading(false);
        }
    };

    const fetchRooms = async () => {
        try {
            const res = await fetch(`${API_URL}/game/rooms`, {
                credentials: 'include',
            });
            if (res.ok) {
                const data = await res.json();
                setRooms(data);
            } else {
                setError('Failed to fetch rooms');
            }
        } catch {
            setError('Failed to fetch rooms');
        }
    };

    useEffect(() => {
        fetchRooms().then(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (rooms.length > 0) {
            setIsLoggedIn(true);
        }
    }, [rooms]);

    if (!isLoggedIn) {
        return (
            <main className="min-h-screen bg-bingo-bg text-bingo-text flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass p-8 rounded-3xl w-full max-w-md"
                >
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-bingo-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-bingo-primary">
                            <Lock size={32} />
                        </div>
                        <h1 className="text-3xl font-bold text-bingo-primary">管理者ログイン</h1>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <input
                                type="password"
                                placeholder="パスワードを入力"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-4 rounded-xl bg-bingo-bg border border-bingo-primary/20 text-bingo-text placeholder-bingo-text-light focus:outline-none focus:border-bingo-primary focus:ring-1 focus:ring-bingo-primary transition-all"
                            />
                        </div>
                        {error && <p className="text-red-500 text-center">{error}</p>}
                        <motion.button
                            type="submit"
                            disabled={loading || !password}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full py-4 bg-gradient-to-r from-bingo-primary to-bingo-primary-dark text-white font-bold text-xl rounded-xl shadow-lg shadow-bingo-primary/20 hover:shadow-bingo-primary/40 transition-all disabled:opacity-50"
                        >
                            {loading ? '確認中...' : 'ログイン'}
                        </motion.button>
                    </form>
                </motion.div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-bingo-bg text-bingo-text p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-12">
                    <h1 className="text-4xl font-bold text-gradient">
                        管理者ダッシュボード
                    </h1>
                    <button
                        onClick={() => window.location.reload()}
                        className="p-2 glass rounded-full hover:bg-bingo-primary/10 transition-all"
                        title="Refresh"
                    >
                        <Activity size={24} />
                    </button>
                </header>

                <div className="grid gap-6">
                    {rooms.map((room) => (
                        <motion.div
                            key={room.roomId}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass p-6 rounded-2xl flex items-center justify-between hover:bg-bingo-primary/5 transition-colors"
                        >
                            <div className="space-y-2">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-2xl font-bold text-bingo-primary">{room.name}</h2>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${room.status === 'PLAYING' ? 'bg-bingo-accent text-white' : 'bg-gray-200 text-gray-600'
                                        }`}>
                                        {room.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-6 text-bingo-text-light text-sm">
                                    <div className="flex items-center gap-2">
                                        <Server size={16} />
                                        <span className="font-mono">{room.roomId}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar size={16} />
                                        <span>{new Date(room.createdAt).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-8">
                                <div className="text-center">
                                    <div className="flex items-center gap-2 justify-center text-bingo-primary mb-1">
                                        <Users size={20} />
                                        <span className="text-xl font-bold">{room.playerCount}</span>
                                    </div>
                                    <p className="text-xs text-bingo-text-light">Players</p>
                                </div>

                                <motion.button
                                    onClick={() => router.push(`/host/${room.roomId}`)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-6 py-3 bg-bingo-primary/10 hover:bg-bingo-primary/20 rounded-xl font-semibold flex items-center gap-2 transition-all border border-bingo-primary/20 text-bingo-primary"
                                >
                                    <LogIn size={18} />
                                    ホストとして参加
                                </motion.button>
                            </div>
                        </motion.div>
                    ))}

                    {rooms.length === 0 && (
                        <div className="text-center py-20 text-bingo-text-light">
                            ルームが見つかりません。
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
