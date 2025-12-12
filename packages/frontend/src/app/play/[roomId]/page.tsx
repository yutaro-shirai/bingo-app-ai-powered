'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Sparkles } from 'lucide-react';
import { getSocketUrl } from '@/lib/socket';

interface Player {
    id: string;
    name: string;
    card: number[][];
    isReach: boolean;
    isBingo: boolean;
}

interface JoinRoomResponse {
    error?: string;
    player: Player;
    status: string;
    roomName: string;
    numbersDrawn?: number[];
}

interface ClaimBingoResponse {
    success: boolean;
    result: {
        isBingo: boolean;
        isReach: boolean;
        reachCount: number;
        bingoCount: number;
        reachNumbers?: number[];
    };
}

export default function PlayPage() {
    const params = useParams();
    const roomId = params.roomId as string;

    const [socket, setSocket] = useState<Socket | null>(null);
    const [name, setName] = useState('');
    const [roomName, setRoomName] = useState('');
    const [joined, setJoined] = useState(false);
    const [player, setPlayer] = useState<Player | null>(null);
    const [status, setStatus] = useState('WAITING');
    const [currentNumber, setCurrentNumber] = useState<number | null>(null);
    const [history, setHistory] = useState<number[]>([]);
    const [punchedCells, setPunchedCells] = useState<Set<string>>(new Set());
    const [showReach, setShowReach] = useState(false);
    const [showBingo, setShowBingo] = useState(false);
    const [reachCount, setReachCount] = useState(0);
    const [reachNumbers, setReachNumbers] = useState<number[]>([]);
    const [bingoCount, setBingoCount] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    const [showPlayerIdInput, setShowPlayerIdInput] = useState(false);
    const [manualPlayerId, setManualPlayerId] = useState('');

    useEffect(() => {
        const savedName = localStorage.getItem('bingo_name');
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (savedName) setName(savedName);

        const newSocket = io(getSocketUrl());
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to backend');
            setIsConnected(true);
            setConnectionError(null);
            // Auto-reconnect if we have a room and player ID
            const savedPlayerId = localStorage.getItem('bingo_player_id');
            const savedRoomId = localStorage.getItem('bingo_room_id');

            if (savedPlayerId && savedRoomId && savedRoomId === roomId) {
                newSocket.emit('join_room', { roomId, name: savedName, playerId: savedPlayerId }, (response: JoinRoomResponse) => {
                    if (!response.error) {
                        setPlayer(response.player);
                        setStatus(response.status);
                        setRoomName(response.roomName);
                        if (response.numbersDrawn) {
                            setHistory(response.numbersDrawn);
                            if (response.numbersDrawn.length > 0) {
                                setCurrentNumber(response.numbersDrawn[response.numbersDrawn.length - 1]);
                            }
                        }
                        setJoined(true);
                    } else {
                        console.warn('Auto-reconnect failed:', response.error);
                        localStorage.removeItem('bingo_player_id');
                    }
                });
            }
        });

        newSocket.on('game_started', (data: { status: string }) => {
            setStatus(data.status);
        });

        newSocket.on('number_drawn', (data: { number: number, history: number[] }) => {
            setCurrentNumber(data.number);
            setHistory(data.history);
            // Optional: Play sound or animation here if needed
        });

        newSocket.on('connect_error', (err) => {
            console.error('Connection error:', err);
            setIsConnected(false);
            setConnectionError('Connection failed. Retrying...');
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from backend');
            setIsConnected(false);
        });

        return () => {
            newSocket.close();
        };
    }, [roomId]);

    const handleJoin = () => {
        console.log('handleJoin called', { socket: !!socket, showPlayerIdInput, manualPlayerId, name });
        if (!socket) {
            console.log('Socket not connected');
            return;
        }

        if (showPlayerIdInput && !manualPlayerId) {
            console.log('Manual Player ID missing');
            return;
        }
        if (!showPlayerIdInput && !name) {
            console.log('Name missing');
            return;
        }

        const storedRoomId = localStorage.getItem('bingo_room_id');
        const storedPlayerId = localStorage.getItem('bingo_player_id');

        // Only use stored ID if we are NOT manually entering one AND the stored room matches the current room
        const shouldUseStoredPlayerId = !showPlayerIdInput && storedPlayerId && storedRoomId === roomId;

        const playerIdToSend = showPlayerIdInput ? manualPlayerId : (shouldUseStoredPlayerId ? storedPlayerId : undefined);
        console.log('Emitting join_room', { roomId, name, playerId: playerIdToSend });

        // Save the new roomId AFTER we've checked the old one
        localStorage.setItem('bingo_name', name);
        localStorage.setItem('bingo_room_id', roomId);

        socket.emit('join_room', { roomId, name, playerId: playerIdToSend }, (response: JoinRoomResponse) => {
            console.log('join_room response', response);
            if (response.error) {
                alert(response.error);
            } else {
                localStorage.setItem('bingo_player_id', response.player.id);
                setPlayer(response.player);
                setStatus(response.status);
                setRoomName(response.roomName);
                if (response.numbersDrawn) {
                    setHistory(response.numbersDrawn);
                    if (response.numbersDrawn.length > 0) {
                        setCurrentNumber(response.numbersDrawn[response.numbersDrawn.length - 1]);
                    }
                }
                setJoined(true);
            }
        });
    };

    const isNumberDrawn = (num: number) => history.includes(num);

    const handleCellClick = (row: number, col: number, num: number) => {
        if (num === 0) return; // FREE
        if (!isNumberDrawn(num)) return;

        const key = `${row}-${col}`;
        if (!punchedCells.has(key)) {
            setPunchedCells(new Set([...punchedCells, key]));

            if (socket && player) {
                socket.emit('punch_number', { roomId, number: num, playerId: player.id });
            }

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

            checkBingoStatus();
        }
    };

    const checkBingoStatus = () => {
        if (!player || !socket) return;

        socket.emit('claim_bingo', { roomId, playerId: player.id }, (response: ClaimBingoResponse) => {
            if (response.success) {
                const newBingoCount = response.result.bingoCount || 0;
                const newReachCount = response.result.reachCount || 0;

                // Bingo animation: only trigger if bingoCount increased
                if (newBingoCount > bingoCount) {
                    setBingoCount(newBingoCount);
                    setShowBingo(true);
                    setShowReach(false);
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#ffd700', '#ff007f', '#00ffff'],
                    });
                    // Hide after 3 seconds
                    setTimeout(() => setShowBingo(false), 3000);
                } else if (response.result.isReach && newReachCount > reachCount) {
                    // Reach animation: only trigger if reachCount increased and not bingo
                    setReachCount(newReachCount);
                    setReachNumbers(response.result.reachNumbers || []);
                    setShowReach(true);
                    setTimeout(() => setShowReach(false), 3000);
                } else {
                    // Still update reachNumbers for highlighting even if no animation
                    if (response.result.reachNumbers) {
                        setReachNumbers(response.result.reachNumbers);
                    }
                }
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
                        {!showPlayerIdInput ? (
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
                        ) : (
                            <div className="relative">
                                <input
                                    type="text"
                                    value={manualPlayerId}
                                    onChange={(e) => setManualPlayerId(e.target.value)}
                                    placeholder="Enter Player ID (UUID)"
                                    className="w-full px-6 py-4 bg-bingo-bg/50 border-2 border-bingo-cyan/30 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-bingo-cyan transition-all text-lg font-mono"
                                />
                            </div>
                        )}

                        <motion.button
                            onClick={handleJoin}
                            disabled={showPlayerIdInput ? !manualPlayerId : !name || !isConnected}
                            whileHover={isConnected ? { scale: 1.05 } : {}}
                            whileTap={isConnected ? { scale: 0.95 } : {}}
                            className={`w-full py-4 bg-gradient-to-r from-bingo-neon to-bingo-cyan text-white font-black text-xl rounded-2xl shadow-lg shadow-bingo-neon/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${!isConnected ? 'grayscale' : ''}`}
                        >
                            {isConnected ? (
                                showPlayerIdInput ? 'REJOIN GAME' : 'JOIN PARTY'
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                    CONNECTING...
                                </span>
                            )}
                        </motion.button>

                        {connectionError && (
                            <div className="text-center text-red-400 text-sm font-bold bg-red-900/20 p-2 rounded-lg border border-red-500/30">
                                {connectionError}
                                {process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_SOCKET_URL && (
                                    <div className='text-xs font-normal mt-1 opacity-80'>
                                        (Config Missing: NEXT_PUBLIC_SOCKET_URL)
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="text-center">
                            <button
                                onClick={() => setShowPlayerIdInput(!showPlayerIdInput)}
                                className="text-sm text-gray-400 hover:text-white underline transition-colors"
                            >
                                {showPlayerIdInput ? 'Join as new player' : 'I have a Player ID'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-bingo-bg text-bingo-white p-4 pb-8">
            <div className="max-w-2xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-3 gap-4 mb-6 glass rounded-2xl p-4"
                >
                    <div>
                        <p className="text-xs text-gray-400">Room</p>
                        <p className="text-lg font-bold text-white truncate">{roomName}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-400">Player</p>
                        <p className="text-lg font-bold text-bingo-gold truncate">{player?.name}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-400">Status</p>
                        <p className="text-lg font-bold text-bingo-cyan">{status}</p>
                    </div>
                </motion.div>

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
                                const isReachNumber = !isFree && !isDrawn && reachNumbers.includes(num);

                                return (
                                    <motion.div
                                        key={`${rowIndex}-${colIndex}`}
                                        id={`cell-${rowIndex}-${colIndex}`}
                                        onClick={() => handleCellClick(rowIndex, colIndex, num)}
                                        whileTap={canPunch ? { scale: 0.9 } : {}}
                                        animate={isReachNumber ? {
                                            scale: [1, 1.05, 1],
                                            boxShadow: [
                                                '0 0 10px rgba(255, 215, 0, 0.5)',
                                                '0 0 20px rgba(255, 215, 0, 0.8)',
                                                '0 0 10px rgba(255, 215, 0, 0.5)',
                                            ]
                                        } : {}}
                                        transition={isReachNumber ? { duration: 1.5, repeat: Infinity } : {}}
                                        className={`
                                            aspect-square flex items-center justify-center rounded-xl font-bold text-xl sm:text-2xl transition-all cursor-pointer
                                            ${isFree ? 'bg-gradient-to-br from-bingo-gold to-bingo-cyan text-bingo-bg' : ''}
                                            ${!isFree && isPunched ? 'bg-gradient-to-br from-bingo-neon to-bingo-cyan text-white shadow-lg shadow-bingo-neon/50 scale-95' : ''}
                                            ${!isFree && !isPunched && isDrawn ? 'bg-bingo-gold/30 text-white ring-2 ring-bingo-gold animate-pulse' : ''}
                                            ${!isFree && !isPunched && !isDrawn && isReachNumber ? 'bg-bingo-gold/20 text-bingo-gold ring-4 ring-bingo-gold font-black text-3xl' : ''}
                                            ${!isFree && !isPunched && !isDrawn && !isReachNumber ? 'bg-white/10 text-gray-400' : ''}
                                        `}
                                    >
                                        {isFree ? 'FREE' : num}
                                    </motion.div>
                                );
                            })
                        ))}
                    </div>
                </motion.div>

                <AnimatePresence>
                    {showReach && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 pointer-events-none"
                        >
                            <motion.div
                                initial={{ scale: 0, rotate: -10 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0, rotate: 10 }}
                                transition={{ type: 'spring', duration: 0.6 }}
                                className="text-center"
                            >
                                <motion.h1
                                    animate={{
                                        scale: [1, 1.1, 1],
                                        textShadow: reachCount >= 4 ? [
                                            '0 0 40px rgba(255, 215, 0, 0.9)',
                                            '0 0 80px rgba(255, 0, 127, 1)',
                                            '0 0 40px rgba(255, 215, 0, 0.9)',
                                        ] : [
                                            '0 0 30px rgba(0, 255, 255, 0.8)',
                                            '0 0 60px rgba(0, 255, 255, 1)',
                                            '0 0 30px rgba(0, 255, 255, 0.8)',
                                        ]
                                    }}
                                    transition={{ duration: reachCount >= 4 ? 0.5 : 0.8, repeat: Infinity }}
                                    className={`text-8xl font-black bg-clip-text text-transparent ${reachCount >= 4
                                        ? 'bg-gradient-to-r from-bingo-gold via-bingo-neon to-bingo-gold'
                                        : 'bg-gradient-to-r from-bingo-cyan via-white to-bingo-cyan'
                                        }`}
                                >
                                    {reachCount === 1 && 'REACH!'}
                                    {reachCount === 2 && 'DOUBLE REACH!'}
                                    {reachCount === 3 && 'TRIPLE REACH!'}
                                    {reachCount >= 4 && `MEGA REACH! 🔥`}
                                </motion.h1>
                                <p className={`text-2xl mt-4 font-bold ${reachCount >= 4 ? 'text-bingo-gold' : 'text-bingo-cyan'}`}>
                                    {reachCount === 1 && 'リーチ！ 運命の瞬間...かも？'}
                                    {reachCount === 2 && 'ダブル！ どっちでもいいから早く！'}
                                    {reachCount === 3 && 'トリプル！ これで外す人いる〜？'}
                                    {reachCount >= 4 && `メガリーチ！ ビンゴする気ある！？ (${reachCount}ライン)`}
                                </p>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

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
                                    {bingoCount === 1 && 'BINGO!'}
                                    {bingoCount === 2 && 'DOUBLE BINGO!'}
                                    {bingoCount >= 3 && 'TRIPLE BINGO!'}
                                </motion.h1>
                                <p className="text-2xl text-white mt-8">
                                    {bingoCount === 1 && '🎉 Congratulations! 🎉'}
                                    {bingoCount === 2 && '🎉🎉 Amazing! Two lines! 🎉🎉'}
                                    {bingoCount >= 3 && '🎉🎉🎉 Incredible! Three lines! 🎉🎉🎉'}
                                </p>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </main>
    );
}
