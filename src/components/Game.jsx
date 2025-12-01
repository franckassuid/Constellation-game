import React, { useState, useEffect, useRef } from 'react';
import { Board } from './Board';
import { generatePoints, doSegmentsIntersect, isPointOnSegment, findNewTriangles, hasValidMoves } from '../logic/geometry';
import { getAiMove } from '../logic/ai';
import confetti from 'canvas-confetti';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, RefreshCw, HelpCircle, User, Cpu, Users } from 'lucide-react';

export function Game() {
    const [points, setPoints] = useState([]);
    const [lines, setLines] = useState([]);
    const [triangles, setTriangles] = useState([]);
    const [currentPlayer, setCurrentPlayer] = useState(1);
    const [movesLeft, setMovesLeft] = useState(0);
    const [diceValue, setDiceValue] = useState(0);
    const [phase, setPhase] = useState('menu'); // menu, mode-select, difficulty-select, setup, rolling, playing, gameover
    const [scores, setScores] = useState({ 1: 0, 2: 0 });
    const [pointCount, setPointCount] = useState(30);
    const [isRolling, setIsRolling] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);
    const [tutorialStep, setTutorialStep] = useState(0);
    const [gameMode, setGameMode] = useState('pvp'); // 'pvp', 'pve'
    const [difficulty, setDifficulty] = useState('easy'); // 'easy', 'medium', 'hard'
    const containerRef = useRef(null);

    useEffect(() => {
        const tutorialSeen = localStorage.getItem('constellation_tutorial_seen');
        if (!tutorialSeen) {
            setShowTutorial(true);
        }
    }, []);

    const nextTutorialStep = () => {
        if (tutorialStep < 4) {
            setTutorialStep(prev => prev + 1);
        } else {
            completeTutorial();
        }
    };

    const completeTutorial = () => {
        setShowTutorial(false);
        setTutorialStep(0);
        localStorage.setItem('constellation_tutorial_seen', 'true');
    };

    const replayTutorial = () => {
        setPhase('menu');
        setShowTutorial(true);
        setTutorialStep(0);
        // Reset tutorial seen status for testing/replay
        localStorage.removeItem('constellation_tutorial_seen');
    };

    const finishAndRestart = () => {
        completeTutorial();
        setPhase('menu');
    };

    const handleGameStartRequest = (count) => {
        setPointCount(count);
        setPhase('mode-select');
    };

    const selectMode = (mode) => {
        setGameMode(mode);
        if (mode === 'pve') {
            setPhase('difficulty-select');
        } else {
            startGame(pointCount, 'pvp');
        }
    };

    const selectDifficulty = (diff) => {
        setDifficulty(diff);
        startGame(pointCount, 'pve', diff);
    };

    const startGame = (count, mode = 'pvp', diff = 'easy') => {
        setPointCount(count);
        setGameMode(mode);
        setDifficulty(diff);
        setPhase('setup');
        setPoints([]);
        setLines([]);
        setScores({ 1: 0, 2: 0 });
        setCurrentPlayer(1);
        setMovesLeft(0);
        setDiceValue(0);

        // If tutorial is active, ensure we start clean
        if (showTutorial) {
            setTutorialStep(2); // Skip straight to roll if they clicked Quick Game
        }
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
                setLines([]);
                setTriangles([]);
                setScores({ 1: 0, 2: 0 });
                setCurrentPlayer(1);
                setPhase('rolling');
                setMovesLeft(0);
                setDiceValue(0);

                // Tutorial: Only 3 points in a triangle
                if (showTutorial) {
                    const centerX = width / 2;
                    const centerY = height / 2;
                    // Reduce radius slightly and move up to ensure bottom line is visible
                    const radius = Math.min(width, height) * 0.22;
                    const offsetY = -radius * 0.2; // Move up slightly

                    // Fixed triangle points
                    const tutorialPoints = [
                        { id: 1, x: centerX, y: centerY + offsetY - radius }, // Top
                        { id: 2, x: centerX - radius * 0.866, y: centerY + offsetY + radius * 0.5 }, // Bottom Left
                        { id: 3, x: centerX + radius * 0.866, y: centerY + offsetY + radius * 0.5 }  // Bottom Right
                    ];

                    setPoints(tutorialPoints);
                } else {
                    const newPoints = generatePoints(pointCount, width, height);
                    setPoints(newPoints);
                }
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

    // Tutorial Progression Logic
    useEffect(() => {
        if (!showTutorial) return;

        // Step 1: Waiting for Game Mode Selection (Advance when phase becomes 'rolling' or 'playing')
        if (tutorialStep === 1 && (phase === 'rolling' || phase === 'playing')) {
            setTutorialStep(2);
        }

        // Step 2: Waiting for Roll (Advance when phase becomes 'playing')
        if (tutorialStep === 2 && phase === 'playing') {
            setTutorialStep(3);
        }

        // Step 3: Waiting for Triangle (Advance when triangles count increases)
        if (tutorialStep === 3 && triangles.length > 0) {
            setTutorialStep(4);
        }
    }, [phase, lines.length, triangles.length, showTutorial, tutorialStep]);

    const rollDice = () => {
        if (isRolling) return;
        setIsRolling(true);

        // Tutorial Script: Always roll a 3
        const targetValue = showTutorial ? 3 : Math.floor(Math.random() * 6) + 1;

        let counter = 0;
        const interval = setInterval(() => {
            setDiceValue(Math.floor(Math.random() * 6) + 1);
            counter++;
            if (counter > 10) {
                clearInterval(interval);
                setDiceValue(targetValue);
                setMovesLeft(targetValue);
                setPhase('playing');
                setIsRolling(false);
            }
        }, 50);
    };

    const handleLineDraw = (p1, p2) => {
        if (movesLeft <= 0) return;

        // Tutorial: Simple check, just ensure they are drawing
        if (showTutorial && tutorialStep === 3) {
            // Allow any connection between the 3 points (since there are only 3)
            // We don't enforce any order here.
        }

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

        const newTriangles = findNewTriangles(p1, p2, newLines);
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

        // Tutorial Progression: Handled in useEffect for line count
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

    // AI Turn Logic
    useEffect(() => {
        if (phase === 'rolling' && currentPlayer === 2 && gameMode === 'pve') {
            // AI Roll
            const timer = setTimeout(() => {
                rollDice();
            }, 1000);
            return () => clearTimeout(timer);
        }

        if (phase === 'playing' && currentPlayer === 2 && gameMode === 'pve' && movesLeft > 0) {
            // AI Move
            const timer = setTimeout(() => {
                const move = getAiMove(points, lines, movesLeft, difficulty);
                if (move) {
                    handleLineDraw(move.p1, move.p2);
                } else {
                    // No valid moves, but we have moves left? Should not happen if game over check works.
                    // But if it does, skip turn to prevent infinite loop
                    setMovesLeft(0);
                    setCurrentPlayer(1);
                    setPhase('rolling');
                }
            }, 1000); // Delay for "thinking"
            return () => clearTimeout(timer);
        }
    }, [phase, currentPlayer, gameMode, movesLeft, points, lines, difficulty]);

    const DiceIcon = [Dice1, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6][diceValue] || Dice5;

    return (
        <div className="game-container">
            {/* Header */}
            <div className="header">
                <div className={`player-score flex flex-col items-center ${currentPlayer !== 1 ? 'inactive opacity-50' : ''}`}>
                    <div className="player-label text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <User size={12} /> Player 1
                    </div>
                    <div key={scores[1]} className={`score-value p1 text-4xl font-black text-blue-400 ${scores[1] > 0 ? 'score-animate' : ''}`}>{scores[1]}</div>
                </div>

                <div className="game-title">
                    <img src="logo.png" alt="Constellation Logo" className="w-8 h-8 mb-1 object-contain" style={{ width: '2rem', height: '2rem' }} />
                    <div className="title-text">CONSTELLATION</div>
                    <button onClick={() => setPhase('menu')} className="restart-btn" title="Restart Game">
                        <RefreshCw size={14} />
                    </button>
                    <button onClick={replayTutorial} className="restart-btn ml-2" title="Help / Tutorial">
                        <HelpCircle size={14} />
                    </button>
                </div>

                <div className={`player-score flex flex-col items-center ${currentPlayer !== 2 ? 'inactive opacity-50' : ''}`}>
                    <div className="player-label text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        {gameMode === 'pve' ? <Cpu size={12} /> : <User size={12} />}
                        {gameMode === 'pve' ? `CPU (${difficulty})` : 'Player 2'}
                    </div>
                    <div key={scores[2]} className={`score-value p2 text-4xl font-black text-rose-400 ${scores[2] > 0 ? 'score-animate' : ''}`}>{scores[2]}</div>
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
                            onClick={() => handleGameStartRequest(15)}
                            className="menu-btn bg-emerald-500/20 border-emerald-500/50 hover:bg-emerald-500/30 text-emerald-100"
                        >
                            <div className="flex justify-between items-center w-full">
                                <span>Quick Game</span>
                                <span className="text-xs bg-emerald-500/20 px-2 py-1 rounded-full border border-emerald-500/30">15 Stars</span>
                            </div>
                        </button>

                        <button
                            onClick={() => handleGameStartRequest(25)}
                            className="menu-btn bg-blue-500/20 border-blue-500/50 hover:bg-blue-500/30 text-blue-100"
                        >
                            <div className="flex justify-between items-center w-full">
                                <span>Medium Game</span>
                                <span className="text-xs bg-blue-500/20 px-2 py-1 rounded-full border border-blue-500/30">25 Stars</span>
                            </div>
                        </button>

                        <button
                            onClick={() => handleGameStartRequest(35)}
                            className="menu-btn bg-purple-500/20 border-purple-500/50 hover:bg-purple-500/30 text-purple-100"
                        >
                            <div className="flex justify-between items-center w-full">
                                <span>Long Game</span>
                                <span className="text-xs bg-purple-500/20 px-2 py-1 rounded-full border border-purple-500/30">35 Stars</span>
                            </div>
                        </button>

                        <button
                            onClick={replayTutorial}
                            className="menu-btn bg-slate-700/30 border-slate-600/50 hover:bg-slate-700/50 text-slate-300 mt-4"
                        >
                            <div className="flex justify-center items-center w-full gap-2">
                                <HelpCircle size={16} />
                                <span>View Tutorial</span>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* Mode Selection Overlay */}
            {phase === 'mode-select' && (
                <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
                    <h2 className="text-3xl font-bold text-white mb-8">Select Mode</h2>
                    <div className="flex flex-col gap-4 w-full max-w-xs">
                        <button
                            onClick={() => selectMode('pve')}
                            className="menu-btn bg-indigo-500/20 border-indigo-500/50 hover:bg-indigo-500/30 text-indigo-100"
                        >
                            <div className="flex items-center gap-3">
                                <User size={20} />
                                <div className="flex flex-col items-start">
                                    <span className="font-bold">1 Player</span>
                                    <span className="text-xs opacity-70">vs Computer</span>
                                </div>
                            </div>
                        </button>
                        <button
                            onClick={() => selectMode('pvp')}
                            className="menu-btn bg-orange-500/20 border-orange-500/50 hover:bg-orange-500/30 text-orange-100"
                        >
                            <div className="flex items-center gap-3">
                                <Users size={20} />
                                <div className="flex flex-col items-start">
                                    <span className="font-bold">2 Players</span>
                                    <span className="text-xs opacity-70">Local Multiplayer</span>
                                </div>
                            </div>
                        </button>
                        <button onClick={() => setPhase('menu')} className="mt-4 text-slate-400 hover:text-white">Back</button>
                    </div>
                </div>
            )}

            {/* Difficulty Selection Overlay */}
            {phase === 'difficulty-select' && (
                <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
                    <h2 className="text-3xl font-bold text-white mb-8">Select Difficulty</h2>
                    <div className="flex flex-col gap-4 w-full max-w-xs">
                        <button
                            onClick={() => selectDifficulty('easy')}
                            className="menu-btn bg-green-500/20 border-green-500/50 hover:bg-green-500/30 text-green-100"
                        >
                            <span className="font-bold">Easy</span>
                        </button>
                        <button
                            onClick={() => selectDifficulty('medium')}
                            className="menu-btn bg-yellow-500/20 border-yellow-500/50 hover:bg-yellow-500/30 text-yellow-100"
                        >
                            <span className="font-bold">Medium</span>
                        </button>
                        <button
                            onClick={() => selectDifficulty('hard')}
                            className="menu-btn bg-red-500/20 border-red-500/50 hover:bg-red-500/30 text-red-100"
                        >
                            <span className="font-bold">Hard</span>
                        </button>
                        <button onClick={() => setPhase('mode-select')} className="mt-4 text-slate-400 hover:text-white">Back</button>
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
            <div className="board-wrapper overflow-visible" ref={containerRef}>
                {phase !== 'menu' && (
                    <Board
                        points={points}
                        lines={lines}
                        triangles={triangles}
                        onLineDraw={handleLineDraw}
                        interactive={phase === 'playing' && (gameMode === 'pvp' || currentPlayer === 1)}
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
                        <div className="moves-display flex items-center gap-4 bg-slate-800/80 px-6 py-3 rounded-xl border border-slate-700 backdrop-blur-sm shadow-lg">
                            <div className="flex items-center gap-3">
                                <DiceIcon size={48} className="text-blue-400 animate-pulse drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                <div className="text-lg font-bold text-white">
                                    Moves Remaining
                                </div>
                            </div>
                            <div className="flex gap-1">
                                {[...Array(movesLeft)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`w-3 h-3 rounded-full ${currentPlayer === 1 ? 'bg-blue-500' : 'bg-pink-500'}`}
                                        style={{ animationDelay: `${i * 100}ms` }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Tutorial Overlay */}
            {showTutorial && (
                <>
                    {/* Only show overlay backdrop for the Welcome step to focus attention */}
                    {tutorialStep === 0 && <div className="tutorial-overlay" onClick={nextTutorialStep} />}

                    {tutorialStep === 0 && (
                        <div className="absolute inset-0 z-70 flex items-center justify-center pointer-events-none">
                            <div className="bg-slate-900/90 border border-slate-700 p-6 rounded-2xl max-w-sm text-center shadow-2xl pointer-events-auto animate-in fade-in zoom-in duration-300">
                                <h3 className="text-xl font-bold text-white mb-2">Welcome to Constellation!</h3>
                                <p className="text-slate-300 mb-4">A strategic game of connecting stars and claiming territory.</p>
                                <button onClick={nextTutorialStep} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold w-full">
                                    Start Tutorial
                                </button>
                                <button onClick={completeTutorial} className="mt-2 text-slate-500 text-sm hover:text-slate-300">
                                    Skip
                                </button>
                            </div>
                        </div>
                    )}

                    {tutorialStep === 1 && (
                        <div className="absolute z-70 tutorial-tooltip 
                            top-[15%] left-1/2 -translate-x-1/2 
                            md:top-1/2 md:left-1/2 md:-translate-y-1/2 md:translate-x-[180px] md:ml-0
                            w-64 text-center pointer-events-none">
                            <h4 className="font-bold text-blue-400 mb-1">Step 1: Choose Mode</h4>
                            <p className="text-sm">Select a game duration to start.</p>
                            <div className="mt-2 text-xs text-slate-400 animate-pulse">Waiting for selection...</div>
                        </div>
                    )}

                    {tutorialStep === 2 && (
                        <div className="absolute bottom-40 left-1/2 -translate-x-1/2 z-70 tutorial-tooltip top pointer-events-none">
                            <h4 className="font-bold text-blue-400 mb-1">Step 2: Player 1 Starts</h4>
                            <p className="text-sm">Click the button below to roll the dice.</p>
                            <div className="mt-2 text-xs text-slate-400 animate-pulse">Waiting for you to roll...</div>
                        </div>
                    )}

                    {tutorialStep === 3 && (
                        <>
                            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-70 tutorial-tooltip pointer-events-none">
                                <h4 className="font-bold text-blue-400 mb-1">Step 3: You have {movesLeft} Moves</h4>
                                <p className="text-sm">Connect the <strong>3 stars</strong> to form a triangle!</p>
                                <div className="mt-2 text-xs text-slate-400 animate-pulse">Triangles formed: {triangles.length}</div>
                            </div>


                            {/* Highlights removed as requested */}
                        </>
                    )}

                    {tutorialStep === 4 && (
                        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-70 tutorial-tooltip top pointer-events-auto">
                            <h4 className="font-bold text-blue-400 mb-1">Great Job!</h4>
                            <p className="text-sm mb-2">You scored points! Now you're ready to play for real.</p>
                            <button onClick={finishAndRestart} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm w-full">
                                Restart Game
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
