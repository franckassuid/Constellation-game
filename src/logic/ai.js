import { doSegmentsIntersect, isPointOnSegment, findNewTriangles } from './geometry';

export function getAiMove(points, lines, movesLeft, difficulty) {
    const validMoves = getAllValidMoves(points, lines);

    if (validMoves.length === 0) return null;

    // Easy: Random move
    if (difficulty === 'easy') {
        return validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    // Medium: Prioritize scoring, avoid giving points (1-step lookahead)
    if (difficulty === 'medium') {
        // 1. Check for scoring moves
        const scoringMoves = validMoves.filter(move => {
            const newTriangles = findNewTriangles(move.p1, move.p2, lines);
            return newTriangles.length > 0;
        });

        if (scoringMoves.length > 0) {
            // Pick a random scoring move
            return scoringMoves[Math.floor(Math.random() * scoringMoves.length)];
        }

        // 2. Avoid moves that give opponent a triangle (basic defensive)
        // This is expensive to check perfectly, so we just check if we are setting up a triangle
        // Actually, "giving a triangle" means creating a line that the opponent can use to close a triangle.
        // For now, Medium just plays random if no score.
        return validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    // Hard: Score maximization + Defensive
    if (difficulty === 'hard') {
        // 1. Score immediately if possible
        let bestMove = null;
        let maxScore = -1;

        for (const move of validMoves) {
            const newTriangles = findNewTriangles(move.p1, move.p2, lines);
            const score = newTriangles.length;

            if (score > maxScore) {
                maxScore = score;
                bestMove = move;
            }
        }

        if (maxScore > 0) {
            return bestMove;
        }

        // 2. If no score, try to pick a move that doesn't help opponent
        // We want to pick a move where the opponent CANNOT score on their next turn using this line.
        // This is a simplified minimax (depth 1).

        // Shuffle valid moves to add variety
        const shuffledMoves = validMoves.sort(() => Math.random() - 0.5);

        for (const move of shuffledMoves) {
            // Simulate this move
            const simulatedLines = [...lines, { p1: move.p1, p2: move.p2, owner: 2 }];

            // Check if opponent (Player 1) can score now
            const opponentMoves = getAllValidMoves(points, simulatedLines);
            let opponentCanScore = false;

            for (const opMove of opponentMoves) {
                const opTriangles = findNewTriangles(opMove.p1, opMove.p2, simulatedLines);
                if (opTriangles.length > 0) {
                    opponentCanScore = true;
                    break;
                }
            }

            if (!opponentCanScore) {
                return move; // Found a safe move
            }
        }

        // If all moves lead to opponent scoring, just pick random
        return validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    return validMoves[0];
}

function getAllValidMoves(points, lines) {
    const moves = [];
    for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
            const p1 = points[i];
            const p2 = points[j];

            if (isValidMove(p1, p2, points, lines)) {
                moves.push({ p1, p2 });
            }
        }
    }
    return moves;
}

function isValidMove(p1, p2, points, lines) {
    // Check if line already exists
    if (lines.some(l => (l.p1.id === p1.id && l.p2.id === p2.id) || (l.p1.id === p2.id && l.p2.id === p1.id))) {
        return false;
    }

    // Check intersections
    for (const l of lines) {
        if (doSegmentsIntersect(p1, p2, l.p1, l.p2)) {
            return false;
        }
    }

    // Check if point on segment
    for (const p of points) {
        if (isPointOnSegment(p, p1, p2)) {
            return false;
        }
    }

    return true;
}
