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
        // Check if already logged in (optional, requires an endpoint to check session)
        // For now, just try to fetch rooms, if 401 then show login
        fetchRooms().then(() => {
            // If fetchRooms succeeds (sets rooms), we can assume logged in?
            // But fetchRooms sets error on failure.
            // Let's rely on the initial state being logged out for security.
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // If fetchRooms succeeded, switch to logged in view
    useEffect(() => {
        if (rooms.length > 0) {
            setIsLoggedIn(true);
        }
    }, [rooms]);

    if (!isLoggedIn) {
        return (
            <main className="min-h-screen bg-bingo-bg text-bingo-white flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass p-8 rounded-3xl w-full max-w-md"
                >
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-bingo-gold/20 rounded-full flex items-center justify-center mx-auto mb-4 text-bingo-gold">
                            <Lock size={32} />
                        </div>
                        <h1 className="text-3xl font-bold text-bingo-gold">Admin Access</h1>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <input
                                type="password"
                                placeholder="Enter Admin Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-bingo-cyan focus:ring-1 focus:ring-bingo-cyan transition-all"
                            />
                        </div>
                        {error && <p className="text-red-400 text-center">{error}</p>}
                        <motion.button
                            type="submit"
                            disabled={loading || !password}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full py-4 bg-gradient-to-r from-bingo-gold to-bingo-cyan text-bingo-bg font-bold text-xl rounded-xl shadow-lg shadow-bingo-gold/20 hover:shadow-bingo-gold/40 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Verifying...' : 'Login'}
                        </motion.button>
                    </form>
                </motion.div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-bingo-bg text-bingo-white p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-12">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-bingo-gold to-bingo-cyan bg-clip-text text-transparent">
                        Admin Dashboard
                    </h1>
                    <button
                        onClick={() => window.location.reload()}
                        className="p-2 glass rounded-full hover:bg-white/20 transition-all"
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
                            className="glass p-6 rounded-2xl flex items-center justify-between hover:bg-white/5 transition-colors"
                        >
                            <div className="space-y-2">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-2xl font-bold text-bingo-gold">{room.name}</h2>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${room.status === 'PLAYING' ? 'bg-bingo-neon text-white' : 'bg-gray-600 text-gray-300'
                                        }`}>
                                        {room.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-6 text-gray-400 text-sm">
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
                                    <div className="flex items-center gap-2 justify-center text-bingo-cyan mb-1">
                                        <Users size={20} />
                                        <span className="text-xl font-bold">{room.playerCount}</span>
                                    </div>
                                    <p className="text-xs text-gray-500">Players</p>
                                </div>

                                <motion.button
                                    onClick={() => router.push(`/host/${room.roomId}`)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold flex items-center gap-2 transition-all border border-white/10"
                                >
                                    <LogIn size={18} />
                                    Join as Host
                                </motion.button>
                            </div>
                        </motion.div>
                    ))}

                    {rooms.length === 0 && (
                        <div className="text-center py-20 text-gray-500">
                            No rooms found.
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
