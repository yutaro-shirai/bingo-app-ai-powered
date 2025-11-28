'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { getSocketUrl } from '@/lib/socket';
import { useSound } from '@/hooks/useSound';

export default function HostPage() {
    const router = useRouter();
    const { toggleMute, isMuted } = useSound();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [roomName, setRoomName] = useState('');

    useEffect(() => {
        const newSocket = io(getSocketUrl());
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to backend');
        });

        return () => {
            newSocket.close();
        };
    }, []);

    const handleCreateRoom = () => {
        if (socket && roomName) {
            socket.emit('create_room', { name: roomName }, (response: { roomId: string }) => {
                if (response.roomId) {
                    router.push(`/host/${response.roomId}`);
                }
            });
        }
    };

    return (
        <main className="min-h-screen bg-bingo-bg text-bingo-white p-8 overflow-hidden">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8 relative"
                >
                    <h1 className="text-6xl font-bold bg-gradient-to-r from-bingo-gold via-bingo-neon to-bingo-cyan bg-clip-text text-transparent">
                        BINGO HOST
                    </h1>
                    <p className="text-xl text-gray-400 mt-2">Midnight Gala Edition</p>

                    <motion.button
                        onClick={toggleMute}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="absolute top-0 right-0 p-3 glass rounded-full hover:bg-white/20 transition-all"
                        title={isMuted ? "Unmute sounds" : "Mute sounds"}
                    >
                        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                    </motion.button>
                </motion.div>

                <div className="glass rounded-3xl p-12 text-center max-w-2xl mx-auto">
                    <h2 className="text-3xl font-bold mb-8 text-bingo-gold">Create a Room</h2>
                    <input
                        type="text"
                        placeholder="Enter Room Name"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        className="w-full p-4 mb-8 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-bingo-cyan focus:ring-1 focus:ring-bingo-cyan text-center text-xl transition-all"
                    />
                    <motion.button
                        onClick={handleCreateRoom}
                        disabled={!roomName}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-12 py-4 bg-gradient-to-r from-bingo-gold to-bingo-cyan text-bingo-bg font-black text-xl rounded-full shadow-lg shadow-bingo-gold/50 hover:shadow-bingo-gold/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        CREATE ROOM
                    </motion.button>
                </div>
            </div>
        </main>
    );
}
