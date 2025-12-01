
export const MIN_DISTANCE = 40; // Minimum distance between points

export function generatePoints(count, width, height, padding = 20) {
    const points = [];
    let attempts = 0;
    while (points.length < count && attempts < count * 100) {
        const x = Math.random() * (width - 2 * padding) + padding;
        const y = Math.random() * (height - 2 * padding) + padding;
        const candidate = { x, y, id: points.length };

        let tooClose = false;
        for (const p of points) {
            const dist = Math.hypot(p.x - candidate.x, p.y - candidate.y);
            if (dist < MIN_DISTANCE) {
                tooClose = true;
                break;
            }
        }

        if (!tooClose) {
            points.push(candidate);
        }
        attempts++;
    }
    return points;
}

// Check if segment (p1, p2) intersects with (p3, p4)
// Returns true if they strictly intersect (not just touching at endpoints)
export function doSegmentsIntersect(p1, p2, p3, p4) {
    // Check if they share an endpoint
    if (p1.id === p3.id || p1.id === p4.id || p2.id === p3.id || p2.id === p4.id) {
        return false;
    }

    const ccw = (a, b, c) => (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);

    return (
        ccw(p1, p3, p4) !== ccw(p2, p3, p4) &&
        ccw(p1, p2, p3) !== ccw(p1, p2, p4)
    );
}

// Check if a point p lies on segment (a, b)
export function isPointOnSegment(p, a, b, tolerance = 10) {
    // If p is one of the endpoints, it's not "on the segment" in a blocking way for this game's logic
    // (we want to prevent passing THROUGH a point)
    if (p.id === a.id || p.id === b.id) return false;

    const crossProduct = (p.y - a.y) * (b.x - a.x) - (p.x - a.x) * (b.y - a.y);
    if (Math.abs(crossProduct) > tolerance * 1000) return false; // Not collinear

    const dotProduct = (p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y);
    if (dotProduct < 0) return false; // Before a

    const squaredLength = (b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y);
    if (dotProduct > squaredLength) return false; // After b

    // Check strict distance to be sure
    const dist = distanceToSegment(p, a, b);
    return dist < tolerance;
}

function distanceToSegment(p, v, w) {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

// Check if adding line (p1, p2) forms any triangles with existing lines
// Returns array of formed triangles (points: [p1, p2, p3])
export function findNewTriangles(p1, p2, existingLines) {
    const triangles = [];

    // Find all points connected to p1
    const neighbors1 = new Set();
    // Find all points connected to p2
    const neighbors2 = new Set();

    existingLines.forEach(line => {
        if (line.p1.id === p1.id) neighbors1.add(line.p2.id);
        if (line.p2.id === p1.id) neighbors1.add(line.p1.id);

        if (line.p1.id === p2.id) neighbors2.add(line.p2.id);
        if (line.p2.id === p2.id) neighbors2.add(line.p1.id);
    });

    // Intersection of neighbors forms triangles
    for (const id of neighbors1) {
        if (neighbors2.has(id)) {
            // Found a common neighbor!
            // We need the actual point object for the third point.
            // We can find it from the lines.
            const line = existingLines.find(l => l.p1.id === id || l.p2.id === id);
            const p3 = line.p1.id === id ? line.p1 : line.p2;

            triangles.push([p1, p2, p3]);
        }
    }

    return triangles;
}

export function isValidMove(p1, p2, points, lines) {
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

export function hasValidMoves(points, lines) {
    for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
            const p1 = points[i];
            const p2 = points[j];

            if (isValidMove(p1, p2, points, lines)) {
                return true; // Found at least one valid move
            }
        }
    }
    return false;
}
