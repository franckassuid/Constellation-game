import React, { useState, useRef } from 'react';

export function Board({ points, lines, triangles, onLineDraw, interactive, currentPlayer }) {
    const [dragStart, setDragStart] = useState(null);
    const [pointerPos, setPointerPos] = useState(null);
    const svgRef = useRef(null);

    const getSvgCoords = (e) => {
        const rect = svgRef.current.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const handlePointerDown = (e, point) => {
        if (!interactive) return;
        e.stopPropagation();
        e.stopPropagation();
        // e.target.setPointerCapture(e.pointerId); // Removed to allow pointerup on other elements
        setDragStart(point);
        setPointerPos(getSvgCoords(e));
    };

    const handlePointerMove = (e) => {
        if (!dragStart) return;
        setPointerPos(getSvgCoords(e));
    };

    const handlePointerUpPoint = (e, point) => {
        e.stopPropagation();
        if (dragStart && point && point.id !== dragStart.id) {
            onLineDraw(dragStart, point);
        }
        setDragStart(null);
        setPointerPos(null);
    };

    const handleGlobalUp = (e) => {
        if (dragStart) {
            // Use elementFromPoint to find what we dropped on
            // This is more robust for touch where the finger covers the target
            const clientX = e.clientX || (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : 0);
            const clientY = e.clientY || (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : 0);

            const element = document.elementFromPoint(clientX, clientY);

            // Find the point group if we dropped on one
            const pointGroup = element?.closest('.point-group');

            if (pointGroup) {
                const pointId = parseInt(pointGroup.dataset.id);
                const point = points.find(p => p.id === pointId);

                if (point && point.id !== dragStart.id) {
                    onLineDraw(dragStart, point);
                }
            }
        }
        setDragStart(null);
        setPointerPos(null);
    };

    return (
        <div className="board-container">
            <svg
                ref={svgRef}
                className="board-svg"
                onPointerMove={handlePointerMove}
                onPointerUp={handleGlobalUp}
            >
                <defs>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Triangles */}
                {triangles.map((t, i) => (
                    <path
                        key={`tri-${i}`}
                        d={`M ${t.p1.x} ${t.p1.y} L ${t.p2.x} ${t.p2.y} L ${t.p3.x} ${t.p3.y} Z`}
                        fill={t.owner === 1 ? 'rgba(96, 165, 250, 0.2)' : 'rgba(244, 114, 182, 0.2)'}
                        stroke="none"
                        style={{ transition: 'all 0.5s ease-out' }}
                    />
                ))}

                {/* Lines - Glow Layer */}
                {lines.map((l, i) => (
                    <line
                        key={`line-glow-${i}`}
                        x1={l.p1.x} y1={l.p1.y}
                        x2={l.p2.x} y2={l.p2.y}
                        stroke={l.owner === 1 ? '#60a5fa' : '#f472b6'}
                        strokeWidth="6"
                        strokeLinecap="round"
                        filter="url(#glow)"
                        style={{ opacity: 0.4 }}
                    />
                ))}

                {/* Lines - Core Layer */}
                {lines.map((l, i) => (
                    <line
                        key={`line-core-${i}`}
                        x1={l.p1.x} y1={l.p1.y}
                        x2={l.p2.x} y2={l.p2.y}
                        stroke={l.owner === 1 ? '#93c5fd' : '#f9a8d4'} // Lighter core
                        strokeWidth="2"
                        strokeLinecap="round"
                        style={{ opacity: 1 }}
                    />
                ))}

                {/* Drag Line */}
                {dragStart && pointerPos && (
                    <line
                        x1={dragStart.x} y1={dragStart.y}
                        x2={pointerPos.x} y2={pointerPos.y}
                        stroke={currentPlayer === 1 ? '#60a5fa' : '#f472b6'}
                        strokeWidth="3"
                        strokeDasharray="8,8"
                        strokeLinecap="round"
                        filter="url(#glow)"
                    />
                )}

                {/* Points */}
                {points.map((p) => (
                    <g
                        key={p.id}
                        data-id={p.id}
                        transform={`translate(${p.x}, ${p.y})`}
                        onPointerDown={(e) => handlePointerDown(e, p)}
                        className="point-group"
                    >
                        {/* Hit area */}
                        <circle r="30" className="point-hit-area" />
                        {/* Visible dot */}
                        <circle
                            r={dragStart?.id === p.id ? 10 : 7}
                            fill="white"
                            filter="url(#glow)"
                            className="point-visible"
                            stroke="rgba(255,255,255,0.5)"
                            strokeWidth="2"
                        />
                        {/* Glow if active */}
                        {dragStart?.id === p.id && (
                            <circle r="16" fill={currentPlayer === 1 ? '#60a5fa' : '#f472b6'} className="point-glow" filter="url(#glow)" />
                        )}
                    </g>
                ))}
            </svg>
        </div>
    );
}
