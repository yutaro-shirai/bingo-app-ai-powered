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

        const shouldUseStoredPlayerId = !showPlayerIdInput && storedPlayerId && storedRoomId === roomId;

        const playerIdToSend = showPlayerIdInput ? manualPlayerId : (shouldUseStoredPlayerId ? storedPlayerId : undefined);
        console.log('Emitting join_room', { roomId, name, playerId: playerIdToSend });

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
                    colors: ['#2EA3F2', '#FF6B35', '#1B7FCC'],
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

                if (newBingoCount > bingoCount) {
                    setBingoCount(newBingoCount);
                    setShowBingo(true);
                    setShowReach(false);
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#2EA3F2', '#FF6B35', '#1B7FCC'],
                    });
                    setTimeout(() => setShowBingo(false), 3000);
                } else if (response.result.isReach && newReachCount > reachCount) {
                    setReachCount(newReachCount);
                    setReachNumbers(response.result.reachNumbers || []);
                    setShowReach(true);
                    setTimeout(() => setShowReach(false), 3000);
                } else {
                    if (response.result.reachNumbers) {
                        setReachNumbers(response.result.reachNumbers);
                    }
                }
            }
        });
    };

    if (!joined) {
        return (
            <main className="min-h-screen bg-bingo-bg text-bingo-text flex items-center justify-center p-8">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass rounded-3xl p-12 w-full max-w-md space-y-8"
                >
                    <div className="text-center">
                        <motion.h1
                            animate={{
                                scale: [1, 1.02, 1],
                            }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="text-5xl font-black text-gradient mb-4"
                        >
                            ESPERANZA
                        </motion.h1>
                        <p className="text-xl text-bingo-primary font-semibold mb-2">BINGO</p>
                        <p className="text-bingo-text-light">ルーム: <span className="text-bingo-primary font-mono font-bold">{roomId}</span></p>
                    </div>

                    <div className="space-y-4">
                        {!showPlayerIdInput ? (
                            <div className="relative">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="お名前を入力"
                                    className="w-full px-6 py-4 bg-bingo-bg border-2 border-bingo-primary/20 rounded-2xl text-bingo-text placeholder-bingo-text-light focus:outline-none focus:border-bingo-primary transition-all text-lg"
                                />
                                <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 text-bingo-primary" size={24} />
                            </div>
                        ) : (
                            <div className="relative">
                                <input
                                    type="text"
                                    value={manualPlayerId}
                                    onChange={(e) => setManualPlayerId(e.target.value)}
                                    placeholder="Player IDを入力 (UUID)"
                                    className="w-full px-6 py-4 bg-bingo-bg border-2 border-bingo-primary/20 rounded-2xl text-bingo-text placeholder-bingo-text-light focus:outline-none focus:border-bingo-primary transition-all text-lg font-mono"
                                />
                            </div>
                        )}

                        <motion.button
                            onClick={handleJoin}
                            disabled={showPlayerIdInput ? !manualPlayerId : !name || !isConnected}
                            whileHover={isConnected ? { scale: 1.05 } : {}}
                            whileTap={isConnected ? { scale: 0.95 } : {}}
                            className={`w-full py-4 bg-gradient-to-r from-bingo-primary to-bingo-primary-dark text-white font-black text-xl rounded-2xl shadow-lg shadow-bingo-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${!isConnected ? 'grayscale' : ''}`}
                        >
                            {isConnected ? (
                                showPlayerIdInput ? '再参加する' : '参加する'
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                    接続中...
                                </span>
                            )}
                        </motion.button>

                        {connectionError && (
                            <div className="text-center text-red-500 text-sm font-bold bg-red-50 p-2 rounded-lg border border-red-200">
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
                                className="text-sm text-bingo-text-light hover:text-bingo-primary underline transition-colors"
                            >
                                {showPlayerIdInput ? '新規で参加する' : 'Player IDで再参加'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-bingo-bg text-bingo-text p-4 pb-8">
            <div className="max-w-2xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-3 gap-4 mb-6 glass rounded-2xl p-4"
                >
                    <div>
                        <p className="text-xs text-bingo-text-light">ルーム</p>
                        <p className="text-lg font-bold text-bingo-text truncate">{roomName}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-bingo-text-light">プレイヤー</p>
                        <p className="text-lg font-bold text-bingo-primary truncate">{player?.name}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-bingo-text-light">ステータス</p>
                        <p className="text-lg font-bold text-bingo-primary">{status === 'WAITING' ? '待機中' : status === 'PLAYING' ? 'プレイ中' : status}</p>
                    </div>
                </motion.div>

                <AnimatePresence>
                    {currentNumber && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="mb-6 glass rounded-3xl p-6 text-center border-2 border-bingo-primary/30"
                        >
                            <p className="text-sm text-bingo-text-light mb-2">最新の番号</p>
                            <motion.p
                                animate={{
                                    scale: [1, 1.1, 1],
                                }}
                                transition={{ duration: 1, repeat: Infinity }}
                                className="text-7xl font-black text-bingo-primary"
                            >
                                {currentNumber}
                            </motion.p>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass rounded-3xl p-4 shadow-lg"
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
                                                '0 0 10px rgba(46, 163, 242, 0.3)',
                                                '0 0 20px rgba(46, 163, 242, 0.6)',
                                                '0 0 10px rgba(46, 163, 242, 0.3)',
                                            ]
                                        } : {}}
                                        transition={isReachNumber ? { duration: 1.5, repeat: Infinity } : {}}
                                        className={`
                                            aspect-square flex items-center justify-center rounded-xl font-bold text-xl sm:text-2xl transition-all cursor-pointer
                                            ${isFree ? 'bg-gradient-to-br from-bingo-primary to-bingo-primary-dark text-white' : ''}
                                            ${!isFree && isPunched ? 'bg-gradient-to-br from-bingo-primary to-bingo-accent text-white shadow-lg shadow-bingo-primary/30 scale-95' : ''}
                                            ${!isFree && !isPunched && isDrawn ? 'bg-bingo-primary/20 text-bingo-text ring-2 ring-bingo-primary animate-pulse' : ''}
                                            ${!isFree && !isPunched && !isDrawn && isReachNumber ? 'bg-bingo-accent/20 text-bingo-accent ring-4 ring-bingo-accent font-black text-3xl' : ''}
                                            ${!isFree && !isPunched && !isDrawn && !isReachNumber ? 'bg-gray-100 text-bingo-text-light' : ''}
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
                            className="fixed inset-0 bg-white/70 flex items-center justify-center z-50 pointer-events-none"
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
                                    }}
                                    transition={{ duration: reachCount >= 4 ? 0.5 : 0.8, repeat: Infinity }}
                                    className={`text-8xl font-black bg-clip-text text-transparent ${reachCount >= 4
                                        ? 'bg-gradient-to-r from-bingo-accent via-bingo-primary to-bingo-accent'
                                        : 'bg-gradient-to-r from-bingo-primary via-bingo-primary-dark to-bingo-primary'
                                        }`}
                                >
                                    {reachCount === 1 && 'REACH!'}
                                    {reachCount === 2 && 'DOUBLE REACH!'}
                                    {reachCount === 3 && 'TRIPLE REACH!'}
                                    {reachCount >= 4 && 'MEGA REACH!'}
                                </motion.h1>
                                <p className={`text-2xl mt-4 font-bold ${reachCount >= 4 ? 'text-bingo-accent' : 'text-bingo-primary'}`}>
                                    {reachCount === 1 && 'あと1つ！'}
                                    {reachCount === 2 && 'ダブルリーチ！'}
                                    {reachCount === 3 && 'トリプルリーチ！'}
                                    {reachCount >= 4 && `メガリーチ！ (${reachCount}ライン)`}
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
                            className="fixed inset-0 bg-white/80 flex items-center justify-center z-50"
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
                                    }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                    className="text-9xl font-black text-gradient"
                                >
                                    {bingoCount === 1 && 'BINGO!'}
                                    {bingoCount === 2 && 'DOUBLE BINGO!'}
                                    {bingoCount >= 3 && 'TRIPLE BINGO!'}
                                </motion.h1>
                                <p className="text-2xl text-bingo-text mt-8 font-bold">
                                    {bingoCount === 1 && 'おめでとうございます！'}
                                    {bingoCount === 2 && 'すごい！ダブルビンゴ！'}
                                    {bingoCount >= 3 && 'トリプルビンゴ達成！'}
                                </p>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </main>
    );
}
