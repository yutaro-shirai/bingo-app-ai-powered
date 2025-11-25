'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Sparkles } from 'lucide-react';

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
    const [punchedCells, setPunchedCells] = useState<Set<string>>(new Set());
    const [showBingo, setShowBingo] = useState(false);

    useEffect(() => {
        const savedName = localStorage.getItem('bingo_name');
        if (savedName) setName(savedName);

        const newSocket = io('http://localhost:3004');
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to backend');
            // Auto-reconnect if we have a room and player ID
            const savedPlayerId = localStorage.getItem('bingo_player_id');
            const savedRoomId = localStorage.getItem('bingo_room_id');

            if (savedPlayerId && savedRoomId && savedRoomId === roomId) {
                newSocket.emit('join_room', { roomId, name: savedName, playerId: savedPlayerId }, (response: any) => {
                    if (!response.error) {
                        setPlayer(response.player);
                        setStatus(response.status);
                        setJoined(true);
                    }
                });
            }
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
    }, [roomId]); // Add roomId dependency

    const handleJoin = () => {
        if (!socket || !name) return;

        localStorage.setItem('bingo_name', name);
        localStorage.setItem('bingo_room_id', roomId); // Save room ID

        const savedPlayerId = localStorage.getItem('bingo_player_id');

        socket.emit('join_room', { roomId, name, playerId: savedPlayerId }, (response: any) => {
            if (response.error) {
                alert(response.error);
            } else {
                localStorage.setItem('bingo_player_id', response.player.id); // Save player ID
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

        const key = `${row}-${col}`;
        if (!punchedCells.has(key)) {
            setPunchedCells(new Set([...punchedCells, key]));

            // Emit punch to backend
            if (socket && player) {
                socket.emit('punch_number', { roomId, number: num, playerId: player.id });
            }

            // Particle effect
            const rect = document.getElementById(`cell-${key}`)?.getBoundingClientRect();
            if (rect) {
                confetti({
                    particleCount: 20,
                    spread: 60,
                    origin: {
                        x: (rect.left + rect.width / 2) / window.innerWidth,
                        y: (rect.top + rect.height / 2) / window.innerHeight,
                    },
                    colors: ['#ffd700', '#ff007f', '#00ffff'],
                });
            }

            // Check for Bingo/Reach
            checkBingoStatus();
        }
    };

    const checkBingoStatus = () => {
        if (!player || !socket) return;

        // We should ideally check bingo logic here or let backend confirm.
        // For now, let's ask backend to check status after every punch (or we can do local check first)
        // But since we just emitted punch_number, backend will update state.
        // However, to trigger the "BINGO!" animation on frontend and backend, we might want to explicitly claim.
        // Actually, backend checkBingo is called inside claimBingo.
        // Let's call claimBingo every time we punch? Or only when we think we have bingo?
        // Implementing client-side check is complex to duplicate.
        // Let's just emit claim_bingo periodically or after punch?
        // Better: Backend should return isBingo/isReach in punch_number response?
        // For now, let's keep the existing "fake" check for demo, but ALSO call backend claim_bingo
        // if we think we might have bingo, OR just rely on backend to tell us?
        // The requirement says "Reach/Bingo counts are not updating".
        // So we MUST tell backend.

        // Let's just call claim_bingo after a short delay to ensure punch is processed?
        // Or better, call it immediately.
        socket.emit('claim_bingo', { roomId, playerId: player.id }, (response: any) => {
            if (response.success && response.result.isBingo) {
                setShowBingo(true);
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#ffd700', '#ff007f', '#00ffff'],
                });
            }
        });
    };

    if (!joined) {
        return (
            <main className="min-h-screen bg-bingo-bg text-bingo-white flex items-center justify-center p-8">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass rounded-3xl p-12 w-full max-w-md space-y-8"
                >
                    <div className="text-center">
                        <motion.h1
                            animate={{
                                textShadow: [
                                    '0 0 20px rgba(255, 215, 0, 0.5)',
                                    '0 0 40px rgba(255, 0, 127, 0.5)',
                                    '0 0 20px rgba(255, 215, 0, 0.5)',
                                ]
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-5xl font-black bg-gradient-to-r from-bingo-gold via-bingo-neon to-bingo-cyan bg-clip-text text-transparent mb-4"
                        >
                            Bingo Night
                        </motion.h1>
                        <p className="text-gray-400">Room: <span className="text-bingo-gold font-mono font-bold">{roomId}</span></p>
                    </div>

                    <div className="space-y-4">
                        <div className="relative">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter your name"
                                className="w-full px-6 py-4 bg-bingo-bg/50 border-2 border-bingo-gold/30 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-bingo-gold transition-all text-lg"
                            />
                            <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 text-bingo-gold" size={24} />
                        </div>

                        <motion.button
                            onClick={handleJoin}
                            disabled={!name}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-full py-4 bg-gradient-to-r from-bingo-neon to-bingo-cyan text-white font-black text-xl rounded-2xl shadow-lg shadow-bingo-neon/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            JOIN PARTY
                        </motion.button>
                    </div>
                </motion.div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-bingo-bg text-bingo-white p-4 pb-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-between items-center mb-6 glass rounded-2xl p-4"
                >
                    <div>
                        <p className="text-xs text-gray-400">Player</p>
                        <p className="text-lg font-bold text-bingo-gold">{player?.name}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-400">Status</p>
                        <p className="text-lg font-bold text-bingo-cyan">{status}</p>
                    </div>
                </motion.div>

                {/* Current Number Display */}
                <AnimatePresence>
                    {currentNumber && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="mb-6 glass rounded-3xl p-6 text-center border-2 border-bingo-gold/50"
                        >
                            <p className="text-sm text-gray-400 mb-2">Latest Number</p>
                            <motion.p
                                animate={{
                                    scale: [1, 1.1, 1],
                                    textShadow: [
                                        '0 0 20px rgba(255, 215, 0, 0.8)',
                                        '0 0 40px rgba(255, 215, 0, 1)',
                                        '0 0 20px rgba(255, 215, 0, 0.8)',
                                    ]
                                }}
                                transition={{ duration: 1, repeat: Infinity }}
                                className="text-7xl font-black text-bingo-gold"
                            >
                                {currentNumber}
                            </motion.p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Bingo Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass rounded-3xl p-4 shadow-2xl"
                >
                    <div className="grid grid-cols-5 gap-2">
                        {player?.card.map((row, rowIndex) => (
                            row.map((num, colIndex) => {
                                const isFree = num === 0;
                                const isDrawn = isNumberDrawn(num);
                                const isPunched = punchedCells.has(`${rowIndex}-${colIndex}`);
                                const canPunch = !isFree && isDrawn && !isPunched;

                                return (
                                    <motion.div
                                        key={`${rowIndex}-${colIndex}`}
                                        id={`cell-${rowIndex}-${colIndex}`}
                                        onClick={() => handleCellClick(rowIndex, colIndex, num)}
                                        whileTap={canPunch ? { scale: 0.9 } : {}}
                                        className={`
                                            aspect-square flex items-center justify-center rounded-xl font-bold text-xl sm:text-2xl transition-all cursor-pointer
                                            ${isFree ? 'bg-gradient-to-br from-bingo-gold to-bingo-cyan text-bingo-bg' : ''}
                                            ${!isFree && isPunched ? 'bg-gradient-to-br from-bingo-neon to-bingo-cyan text-white shadow-lg shadow-bingo-neon/50 scale-95' : ''}
                                            ${!isFree && !isPunched && isDrawn ? 'bg-bingo-gold/30 text-white ring-2 ring-bingo-gold animate-pulse' : ''}
                                            ${!isFree && !isPunched && !isDrawn ? 'bg-white/10 text-gray-400' : ''}
                                        `}
                                    >
                                        {isFree ? 'FREE' : num}
                                    </motion.div>
                                );
                            })
                        ))}
                    </div>
                </motion.div>

                {/* Bingo Celebration */}
                <AnimatePresence>
                    {showBingo && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
                            onClick={() => setShowBingo(false)}
                        >
                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0, rotate: 180 }}
                                transition={{ type: 'spring', duration: 0.8 }}
                                className="text-center"
                            >
                                <motion.h1
                                    animate={{
                                        scale: [1, 1.2, 1],
                                        textShadow: [
                                            '0 0 40px rgba(255, 215, 0, 1)',
                                            '0 0 80px rgba(255, 0, 127, 1)',
                                            '0 0 40px rgba(255, 215, 0, 1)',
                                        ]
                                    }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                    className="text-9xl font-black bg-gradient-to-r from-bingo-gold via-bingo-neon to-bingo-cyan bg-clip-text text-transparent"
                                >
                                    BINGO!
                                </motion.h1>
                                <p className="text-2xl text-white mt-8">🎉 Congratulations! 🎉</p>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </main>
    );
}
