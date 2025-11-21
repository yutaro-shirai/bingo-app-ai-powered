'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');

  const handleHost = () => {
    router.push('/host');
  };

  const handleJoin = () => {
    if (roomId) {
      router.push(`/play/${roomId}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-blue-500 to-purple-600 text-white">
      <h1 className="text-6xl font-bold mb-12">Bingo Party</h1>

      <div className="flex flex-col gap-8 w-full max-w-md">
        <div className="bg-white/10 p-8 rounded-xl backdrop-blur-md border border-white/20">
          <h2 className="text-2xl font-bold mb-4">Host a Game</h2>
          <p className="mb-4 text-white/80">Create a new room and invite players.</p>
          <button
            onClick={handleHost}
            className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-lg transition-colors"
          >
            Start New Game
          </button>
        </div>

        <div className="bg-white/10 p-8 rounded-xl backdrop-blur-md border border-white/20">
          <h2 className="text-2xl font-bold mb-4">Join a Game</h2>
          <input
            type="text"
            placeholder="Enter Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            className="w-full p-3 mb-4 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <button
            onClick={handleJoin}
            disabled={!roomId}
            className="w-full py-3 bg-green-500 hover:bg-green-400 disabled:bg-gray-500 text-white font-bold rounded-lg transition-colors"
          >
            Join Game
          </button>
        </div>
      </div>
    </main>
  );
}
