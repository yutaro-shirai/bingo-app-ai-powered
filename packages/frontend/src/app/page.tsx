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
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-[var(--bingo-bg)] text-[var(--bingo-white)] relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--bingo-neon)] rounded-full blur-[120px] opacity-20 animate-float"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--bingo-cyan)] rounded-full blur-[120px] opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="z-10 flex flex-col items-center w-full max-w-4xl">
        <h1 className="text-7xl font-bold mb-12 text-gradient animate-float drop-shadow-lg tracking-tight">
          Bingo Party
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {/* Host Card */}
          <div className="glass-card p-8 rounded-2xl flex flex-col items-center text-center hover:scale-105 transition-transform duration-300">
            <div className="w-16 h-16 mb-6 rounded-full bg-gradient-to-br from-[var(--bingo-gold)] to-orange-500 flex items-center justify-center shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-black">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-4 text-[var(--bingo-gold)]">Host a Game</h2>
            <p className="mb-8 text-gray-300">Create a VIP room and invite players to the gala.</p>
            <button
              onClick={handleHost}
              className="w-full py-4 bg-gradient-to-r from-[var(--bingo-gold)] to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-black font-bold text-lg rounded-xl shadow-lg hover:shadow-[0_0_20px_rgba(255,215,0,0.5)] transition-all duration-300 transform active:scale-95"
            >
              Start New Game
            </button>
          </div>

          {/* Join Card */}
          <div className="glass-card p-8 rounded-2xl flex flex-col items-center text-center hover:scale-105 transition-transform duration-300">
            <div className="w-16 h-16 mb-6 rounded-full bg-gradient-to-br from-[var(--bingo-cyan)] to-[var(--bingo-neon)] flex items-center justify-center shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 5.472m0 0a9.09 9.09 0 0 0-3.279 3.298m.944-5.463A5.991 5.991 0 0 1 12 12.75a5.991 5.991 0 0 1 3.5 1.13m-7.5 0a5.998 5.998 0 0 1 1.75-4.625m0 0 .01-.005M12 12.75a5.998 5.998 0 0 0-1.75-4.625m0 0 .01.005m5.687 9.787a9.091 9.091 0 0 1-2.698 1.52m-4.257.265a9.098 9.098 0 0 1-2.928-1.52M12 10.75S12 10.75 12 10.75a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-4 text-[var(--bingo-cyan)]">Join a Game</h2>
            <input
              type="text"
              placeholder="ENTER ROOM ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              className="w-full p-4 mb-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-[var(--bingo-cyan)] focus:ring-1 focus:ring-[var(--bingo-cyan)] text-center tracking-widest font-mono transition-all"
            />
            <button
              onClick={handleJoin}
              disabled={!roomId}
              className="w-full py-4 bg-gradient-to-r from-[var(--bingo-cyan)] to-[var(--bingo-neon)] hover:from-cyan-400 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-800 disabled:text-gray-500 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-[0_0_20px_rgba(0,255,255,0.5)] transition-all duration-300 transform active:scale-95"
            >
              Join Party
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
