'use client';

import { useEffect, useState, useRef, use } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Trophy, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getSocketUrl } from '@/lib/socket';
import { useSound } from '@/hooks/useSound';

interface Player {
    id: string;
    name: string;
    isReach: boolean;
    isBingo: boolean;
}

interface ReconnectResponse {
    error?: string;
    name: string;
    status: string;
    players: Player[];
    numbersDrawn: number[];
}

interface DrawResponse {
    error?: string;
    number: number;
}

interface RevealResponse {
    error?: string;
    success?: boolean;
}

export default function HostGamePage({ params }: { params: Promise<{ roomId: string }> }) {
    const { roomId } = use(params);
    const { play, toggleMute, isMuted } = useSound();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [status, setStatus] = useState('WAITING');
    const [players, setPlayers] = useState<Player[]>([]);
    const [currentNumber, setCurrentNumber] = useState<number | null>(null);
    const [history, setHistory] = useState<number[]>([]);
    const [isSpinning, setIsSpinning] = useState(false);
    const [spinValue, setSpinValue] = useState(0);
    const [roomName, setRoomName] = useState('');
    const announcedPlayersRef = useRef<Set<string>>(new Set());

    interface Notification {
        id: string;
        message: string;
        type: 'reach' | 'bingo';
    }
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const joinUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/play/${roomId}`
        : '';

    console.log('HostPage: joinUrl:', joinUrl);

    useEffect(() => {
        const newSocket = io(getSocketUrl());
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to backend');
            // Reconnect as host
            newSocket.emit('reconnect_host', { roomId }, (response: ReconnectResponse) => {
                if (response.error) {
                    alert('Failed to reconnect: ' + response.error);
                    return;
                }
                setRoomName(response.name);
                setStatus(response.status);
                setPlayers(response.players || []);
                setHistory(response.numbersDrawn || []);
                if (response.numbersDrawn && response.numbersDrawn.length > 0) {
                    setCurrentNumber(response.numbersDrawn[response.numbersDrawn.length - 1]);
                }
            });
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected');
        });

        newSocket.on('player_joined', (data: { totalPlayers: number, players: Player[] }) => {
            setPlayers(data.players);
        });

        newSocket.on('player_updated', (data: { players: Player[] }) => {
            setPlayers(data.players);
        });

        newSocket.on('game_started', (data: { status: string }) => {
            setStatus(data.status);
            announcedPlayersRef.current = new Set();
        });

        newSocket.on('number_drawn', (data: { number: number, history: number[] }) => {
            setCurrentNumber(data.number);
            setHistory(data.history);
            setIsSpinning(false);
            play('draw_number');
        });

        newSocket.on('reach_announced', (data: { playerName: string, playerId: string }) => {
            if (!announcedPlayersRef.current.has(data.playerId)) {
                const notificationId = `${Date.now()}-${data.playerId}`;
                setNotifications(prev => [...prev, {
                    id: notificationId,
                    message: `🎯 ${data.playerName} がリーチです！`,
                    type: 'reach'
                }]);
                announcedPlayersRef.current.add(data.playerId);
                play('reach');

                // Auto-dismiss after 3 seconds
                setTimeout(() => {
                    setNotifications(prev => prev.filter(n => n.id !== notificationId));
                }, 3000);
            }
        });

        newSocket.on('bingo_announced', (data: { playerName: string, playerId: string }) => {
            if (!announcedPlayersRef.current.has(data.playerId)) {
                const notificationId = `${Date.now()}-${data.playerId}`;
                setNotifications(prev => [...prev, {
                    id: notificationId,
                    message: `🎉 ${data.playerName} がビンゴしました！`,
                    type: 'bingo'
                }]);
                announcedPlayersRef.current.add(data.playerId);
                play('bingo');

                // Auto-dismiss after 3 seconds
                setTimeout(() => {
                    setNotifications(prev => prev.filter(n => n.id !== notificationId));
                }, 3000);
            }
        });

        return () => {
            newSocket.close();
        };
    }, [roomId, play]);

    useEffect(() => {
        if (isSpinning) {
            const interval = setInterval(() => {
                setSpinValue(Math.floor(Math.random() * 75) + 1);
            }, 50);
            return () => clearInterval(interval);
        }
    }, [isSpinning]);

    const startGame = () => {
        if (socket && roomId) {
            socket.emit('start_game', { roomId });
        }
    };

    const drawNumber = () => {
        if (socket && roomId && !isSpinning) {
            setIsSpinning(true);
            play('drum_roll'); // Play drum roll during roulette spin
            const safetyTimeout = setTimeout(() => {
                if (isSpinning) {
                    setIsSpinning(false);
                    alert('Request timed out. Please try again.');
                }
            }, 10000);

            socket.emit('draw_number', { roomId }, (response: DrawResponse) => {
                if (response.error) {
                    clearTimeout(safetyTimeout);
                    setIsSpinning(false);
                    alert(response.error);
                    return;
                }

                setTimeout(() => {
                    socket.emit('reveal_number', { roomId, number: response.number }, (revealResponse: RevealResponse) => {
                        clearTimeout(safetyTimeout);
                        if (revealResponse?.error) {
                            setIsSpinning(false);
                            alert(revealResponse.error);
                        }
                    });
                }, 2000);
            });
        }
    };

    const reachCount = players.filter(p => p.isReach).length;
    const bingoCount = players.filter(p => p.isBingo).length;

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

                <div className="space-y-8">
                    {status === 'WAITING' ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass rounded-3xl p-12 text-center space-y-8"
                        >
                            <div>
                                <h2 className="text-3xl font-bold mb-4 text-bingo-gold">Room Code</h2>
                                <p className="text-7xl font-mono font-black tracking-widest text-transparent bg-gradient-to-r from-bingo-gold to-bingo-cyan bg-clip-text">
                                    {roomId}
                                </p>
                                <p className="text-2xl text-white mt-4 font-bold">{roomName}</p>
                            </div>

                            <div className="glass p-8 rounded-2xl shadow-2xl shadow-bingo-neon/20 flex flex-col items-center gap-6">
                                <div>
                                    <p className="text-sm text-gray-400 mb-2">Scan to Join</p>
                                    <div className="bg-white p-4 rounded-xl min-h-[232px] flex items-center justify-center">
                                        {joinUrl ? (
                                            <QRCodeSVG value={joinUrl} size={200} />
                                        ) : (
                                            <div className="w-[200px] h-[200px] bg-gray-200 animate-pulse rounded" />
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400 mb-2">Or visit URL</p>
                                    <p className="text-lg font-mono text-bingo-cyan break-all">
                                        {joinUrl || 'Loading...'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-4">
                                <Users className="text-bingo-cyan" size={32} />
                                <span className="text-5xl font-bold">{players.length}</span>
                                <motion.span
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="text-2xl text-gray-400"
                                >
                                    waiting...
                                </motion.span>
                            </div>

                            <motion.button
                                onClick={startGame}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-12 py-6 bg-gradient-to-r from-bingo-gold to-bingo-cyan text-bingo-bg font-black text-2xl rounded-full shadow-lg shadow-bingo-gold/50 hover:shadow-bingo-gold/80 transition-all"
                            >
                                START GAME
                            </motion.button>
                        </motion.div >
                    ) : (
                        <div className="space-y-8">
                            <div className="grid grid-cols-3 gap-4">
                                <motion.div
                                    whileHover={{ y: -5 }}
                                    className="glass rounded-2xl p-6 text-center"
                                >
                                    <Users className="mx-auto mb-2 text-bingo-cyan" size={32} />
                                    <p className="text-4xl font-bold">{players.length}</p>
                                    <p className="text-sm text-gray-400">Players</p>
                                </motion.div>
                                <motion.div
                                    whileHover={{ y: -5 }}
                                    className="glass rounded-2xl p-6 text-center"
                                >
                                    <Sparkles className="mx-auto mb-2 text-bingo-neon" size={32} />
                                    <p className="text-4xl font-bold">{reachCount}</p>
                                    <p className="text-sm text-gray-400">Reach</p>
                                </motion.div>
                                <motion.div
                                    whileHover={{ y: -5 }}
                                    className="glass rounded-2xl p-6 text-center"
                                >
                                    <Trophy className="mx-auto mb-2 text-bingo-gold" size={32} />
                                    <p className="text-4xl font-bold">{bingoCount}</p>
                                    <p className="text-sm text-gray-400">Bingo!</p>
                                </motion.div>
                            </div>

                            <div className="glass rounded-3xl p-12 text-center">
                                <h2 className="text-2xl text-gray-400 mb-6">Current Number</h2>
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={isSpinning ? 'spinning' : currentNumber}
                                        initial={{ scale: 0.5, rotateY: 180, opacity: 0 }}
                                        animate={{ scale: 1, rotateY: 0, opacity: 1 }}
                                        exit={{ scale: 0.5, rotateY: -180, opacity: 0 }}
                                        transition={{ duration: 0.5 }}
                                        className="text-[12rem] font-black leading-none mb-8"
                                        style={{
                                            background: 'linear-gradient(135deg, #ffd700 0%, #ff007f 50%, #00ffff 100%)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            filter: 'drop-shadow(0 0 40px rgba(255, 215, 0, 0.8))',
                                        }}
                                    >
                                        {isSpinning ? spinValue : (currentNumber ?? '--')}
                                    </motion.div>
                                </AnimatePresence>
                                <motion.button
                                    onClick={drawNumber}
                                    disabled={isSpinning}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={`px-16 py-6 bg-gradient-to-r from-bingo-neon to-bingo-cyan text-white font-black text-3xl rounded-full shadow-lg transition-all ${isSpinning ? 'opacity-50 cursor-not-allowed' : 'shadow-bingo-neon/50 hover:shadow-bingo-neon/80'
                                        }`}
                                >
                                    {isSpinning ? 'SPINNING...' : 'DRAW NUMBER'}
                                </motion.button>
                            </div>

                            <div className="glass rounded-3xl p-8">
                                <h3 className="text-2xl font-bold mb-6 text-bingo-gold">Drawn Numbers</h3>
                                <div className="flex flex-wrap gap-3">
                                    {history.map((num, idx) => (
                                        <motion.div
                                            key={num}
                                            initial={{ scale: 0, rotate: -180 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="w-14 h-14 flex items-center justify-center glass rounded-xl font-bold text-lg border-2 border-bingo-gold/50"
                                        >
                                            {num}
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            <div className="glass rounded-3xl p-8">
                                <h3 className="text-2xl font-bold mb-6 text-bingo-gold">Players ({players.length})</h3>
                                <div className="space-y-3">
                                    {[...players]
                                        .sort((a, b) => {
                                            if (a.isBingo && !b.isBingo) return -1;
                                            if (!a.isBingo && b.isBingo) return 1;
                                            if (a.isReach && !b.isReach) return -1;
                                            if (!a.isReach && b.isReach) return 1;
                                            return 0;
                                        })
                                        .map((player) => (
                                            <motion.div
                                                key={player.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className={`p-4 rounded-xl border-2 flex items-center justify-between ${player.isBingo
                                                    ? 'bg-gradient-to-r from-bingo-gold/20 to-bingo-gold/10 border-bingo-gold'
                                                    : player.isReach
                                                        ? 'bg-gradient-to-r from-bingo-neon/20 to-bingo-neon/10 border-bingo-neon'
                                                        : 'glass border-white/10'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${player.isBingo
                                                        ? 'bg-bingo-gold text-bingo-bg'
                                                        : player.isReach
                                                            ? 'bg-bingo-neon text-bingo-bg'
                                                            : 'bg-white/10 text-white'
                                                        }`}>
                                                        {player.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-lg font-semibold">{player.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {player.isBingo && (
                                                        <motion.div
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            className="flex items-center gap-1 px-3 py-1 bg-bingo-gold text-bingo-bg rounded-full font-bold text-sm"
                                                        >
                                                            <Trophy size={16} />
                                                            BINGO!
                                                        </motion.div>
                                                    )}
                                                    {player.isReach && !player.isBingo && (
                                                        <motion.div
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            className="flex items-center gap-1 px-3 py-1 bg-bingo-neon text-white rounded-full font-bold text-sm"
                                                        >
                                                            <Sparkles size={16} />
                                                            REACH
                                                        </motion.div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Notifications */}
            <AnimatePresence>
                {notifications.map((notification, index) => (
                    <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: 100, scale: 0.8 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 100, scale: 0.8 }}
                        transition={{ type: 'spring', duration: 0.5 }}
                        style={{
                            top: `${80 + index * 80}px`,
                            borderColor: notification.type === 'bingo' ? 'var(--color-gold)' : 'var(--color-neon)',
                        }}
                        className="fixed right-4 z-50 glass rounded-2xl p-4 min-w-[300px] shadow-2xl border-2"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`text-3xl ${notification.type === 'bingo' ? 'animate-bounce' : 'animate-pulse'}`}>
                                {notification.type === 'bingo' ? '🎉' : '🎯'}
                            </div>
                            <p className={`text-lg font-bold ${notification.type === 'bingo' ? 'text-bingo-gold' : 'text-bingo-neon'}`}>
                                {notification.message}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </main>
    );
}
