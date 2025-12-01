import React, { useState, useEffect, useRef } from 'react';
import { Board } from './Board';
import { generatePoints, doSegmentsIntersect, isPointOnSegment, findNewTriangles, hasValidMoves } from '../logic/geometry';
import confetti from 'canvas-confetti';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, RefreshCw } from 'lucide-react';

export function Game() {
    const [points, setPoints] = useState([]);
    const [lines, setLines] = useState([]);
    const [triangles, setTriangles] = useState([]);
    const [currentPlayer, setCurrentPlayer] = useState(1);
    const [movesLeft, setMovesLeft] = useState(0);
    const [diceValue, setDiceValue] = useState(0);
    const [phase, setPhase] = useState('menu'); // menu, setup, rolling, playing, gameover
    const [scores, setScores] = useState({ 1: 0, 2: 0 });
    const [pointCount, setPointCount] = useState(30);
    const [isRolling, setIsRolling] = useState(false);
    const containerRef = useRef(null);

    const startGame = (count) => {
        setPointCount(count);
        setPhase('setup');
        // Trigger init via effect or direct call if container ready
        if (containerRef.current) {
            // We need to wait for render if we just switched from menu to setup (container might not be ready)
            // But since we use ResizeObserver, it should handle it.
            // We'll reset points to trigger the observer logic
            setPoints([]);
        }
    };

    const initGame = () => {
        if (containerRef.current) {
            const { width, height } = containerRef.current.getBoundingClientRect();
            if (width > 0 && height > 0) {
                setPoints(generatePoints(pointCount, width, height));
                setLines([]);
                setTriangles([]);
                setScores({ 1: 0, 2: 0 });
                setCurrentPlayer(1);
                setPhase('rolling');
                setMovesLeft(0);
            }
        }
    };

    useEffect(() => {
        if (!containerRef.current || phase === 'menu') return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0 && points.length === 0) {
                    initGame();
                }
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [points.length, phase]);

    const rollDice = () => {
        if (isRolling) return;
        setIsRolling(true);

        // Animation duration
        setTimeout(() => {
            const val = Math.ceil(Math.random() * 6);
            setDiceValue(val);
            setMovesLeft(val);
            setPhase('playing');
            setIsRolling(false);
        }, 600);
    };

    const handleLineDraw = (p1, p2) => {
        if (movesLeft <= 0) return;

        if (lines.some(l => (l.p1.id === p1.id && l.p2.id === p2.id) || (l.p1.id === p2.id && l.p2.id === p1.id))) {
            return;
        }

        for (const l of lines) {
            if (doSegmentsIntersect(p1, p2, l.p1, l.p2)) {
                if (navigator.vibrate) navigator.vibrate(200);
                return;
            }
        }

        for (const p of points) {
            if (isPointOnSegment(p, p1, p2)) {
                if (navigator.vibrate) navigator.vibrate(200);
                return;
            }
        }

        const newLine = { p1, p2, owner: currentPlayer };
        const newLines = [...lines, newLine];
        setLines(newLines);

        const newTriangles = findNewTriangles(p1, p2, lines);
        let pointsGained = 0;
        if (newTriangles.length > 0) {
            const addedTriangles = newTriangles.map(t => ({
                p1: t[0], p2: t[1], p3: t[2], owner: currentPlayer
            }));
            setTriangles([...triangles, ...addedTriangles]);
            pointsGained = addedTriangles.length;
            setScores(prev => ({
                ...prev,
                [currentPlayer]: prev[currentPlayer] + pointsGained
            }));

            confetti({
                particleCount: 50 * pointsGained,
                spread: 60,
                origin: { y: 0.6 },
                colors: currentPlayer === 1 ? ['#4169E1', '#87CEEB'] : ['#FF4500', '#FFA500']
            });
        }

        const newMoves = movesLeft - 1;
        setMovesLeft(newMoves);

        if (newMoves === 0) {
            setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
            setPhase('rolling');
            setDiceValue(0);
        }
    };

    useEffect(() => {
        if (phase === 'playing' && movesLeft > 0) {
            // Check if any move is possible for current player?
            // Actually, we should check if ANY move is possible on the board.
            // If not, game over.
            // But checking every render might be expensive?
            // We only need to check after a line is added.
        }
    }, [lines, phase]);

    // Check for game over after lines update
    useEffect(() => {
        if (phase === 'playing' || phase === 'rolling') {
            if (points.length > 0 && !hasValidMoves(points, lines)) {
                setPhase('gameover');
            }
        }
    }, [lines, points, phase]);

    const DiceIcon = [Dice1, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6][diceValue] || Dice5;

    return (
        <div className="game-container">
            {/* Header */}
            <div className="header">
                <div className={`player-score ${currentPlayer !== 1 ? 'inactive' : ''}`}>
                    <div className="player-label">Player 1</div>
                    <div className="score-value p1">{scores[1]}</div>
                </div>

                <div className="game-title">
                    <img src="logo.png" alt="Constellation Logo" className="w-8 h-8 mb-1 object-contain" style={{ width: '2rem', height: '2rem' }} />
                    <div className="title-text">CONSTELLATION</div>
                    <button onClick={() => setPhase('menu')} className="restart-btn" title="Restart Game">
                        <RefreshCw size={14} />
                    </button>
                </div>

                <div className={`player-score ${currentPlayer !== 2 ? 'inactive' : ''}`}>
                    <div className="player-label">Player 2</div>
                    <div className="score-value p2">{scores[2]}</div>
                </div>
            </div>

            {/* Menu Overlay */}
            {phase === 'menu' && (
                <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
                    <img src="logo.png" alt="Constellation Logo" className="w-24 h-24 mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" style={{ width: '6rem', height: '6rem' }} />
                    <h1 className="text-5xl font-black text-white mb-2 tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">CONSTELLATION</h1>
                    <p className="text-slate-400 mb-12 font-medium text-lg tracking-wide uppercase">Connect the stars. Claim the sky.</p>

                    <div className="flex flex-col gap-4 w-full max-w-xs">
                        <button
                            onClick={() => startGame(15)}
                            className="menu-btn bg-emerald-500/20 border-emerald-500/50 hover:bg-emerald-500/30 text-emerald-100"
                        >
                            <div className="flex justify-between items-center w-full">
                                <span>Quick Game</span>
                                <span className="text-xs bg-emerald-500/20 px-2 py-1 rounded-full border border-emerald-500/30">15 Stars</span>
                            </div>
                        </button>

                        <button
                            onClick={() => startGame(25)}
                            className="menu-btn bg-blue-500/20 border-blue-500/50 hover:bg-blue-500/30 text-blue-100"
                        >
                            <div className="flex justify-between items-center w-full">
                                <span>Medium Game</span>
                                <span className="text-xs bg-blue-500/20 px-2 py-1 rounded-full border border-blue-500/30">25 Stars</span>
                            </div>
                        </button>

                        <button
                            onClick={() => startGame(35)}
                            className="menu-btn bg-purple-500/20 border-purple-500/50 hover:bg-purple-500/30 text-purple-100"
                        >
                            <div className="flex justify-between items-center w-full">
                                <span>Long Game</span>
                                <span className="text-xs bg-purple-500/20 px-2 py-1 rounded-full border border-purple-500/30">35 Stars</span>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* Game Over Overlay */}
            {phase === 'gameover' && (
                <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
                    <h2 className="text-4xl font-black text-white mb-6 tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">GAME OVER</h2>

                    <div className="flex gap-12 mb-12">
                        <div className={`flex flex-col items-center ${scores[1] > scores[2] ? 'scale-110' : 'opacity-50'}`}>
                            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Player 1</div>
                            <div className="text-6xl font-black text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]">{scores[1]}</div>
                            {scores[1] > scores[2] && <div className="mt-2 text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/50 px-3 py-1 rounded-full">WINNER</div>}
                        </div>

                        <div className={`flex flex-col items-center ${scores[2] > scores[1] ? 'scale-110' : 'opacity-50'}`}>
                            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Player 2</div>
                            <div className="text-6xl font-black text-pink-400 drop-shadow-[0_0_15px_rgba(244,114,182,0.5)]">{scores[2]}</div>
                            {scores[2] > scores[1] && <div className="mt-2 text-xs font-bold bg-pink-500/20 text-pink-300 border border-pink-500/50 px-3 py-1 rounded-full">WINNER</div>}
                        </div>
                    </div>

                    {scores[1] === scores[2] && (
                        <div className="mb-12 text-2xl font-bold text-slate-400">IT'S A DRAW!</div>
                    )}

                    <button
                        onClick={() => setPhase('menu')}
                        className="px-8 py-4 bg-slate-800 text-white border border-slate-700 rounded-xl font-bold text-lg shadow-xl hover:scale-105 transition-transform hover:bg-slate-700"
                    >
                        Play Again
                    </button>
                </div>
            )}

            {/* Game Board */}
            <div className="board-wrapper" ref={containerRef}>
                {phase !== 'menu' && (
                    <Board
                        points={points}
                        lines={lines}
                        triangles={triangles}
                        onLineDraw={handleLineDraw}
                        interactive={phase === 'playing'}
                        currentPlayer={currentPlayer}
                    />
                )}
            </div>

            {/* Footer Controls */}
            <div className="footer">
                <div className="controls-content">
                    {phase === 'rolling' && (
                        <button
                            onClick={rollDice}
                            disabled={isRolling}
                            className={`roll-btn ${isRolling ? 'rolling' : ''}`}
                        >
                            <DiceIcon size={24} className={isRolling ? 'animate-spin' : ''} />
                            {isRolling ? 'Rolling...' : 'Roll Dice'}
                        </button>
                    )}

                    {phase === 'playing' && (
                        <div className="moves-display">
                            <div className="moves-label">
                                Moves Remaining
                            </div>
                            <div className="moves-dots">
                                {[...Array(movesLeft)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`move-dot ${currentPlayer === 1 ? 'bg-p1' : 'bg-p2'}`}
                                        style={{ animationDelay: `${i * 100}ms` }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
