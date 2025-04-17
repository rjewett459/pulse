"use client";

import React, { useState, useRef, useEffect } from "react";

interface ResizablePanelsProps {
  children: [React.ReactNode, React.ReactNode];
  initialLeftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
  className?: string;
  onResize?: (leftWidth: number) => void;
}

const ResizablePanels: React.FC<ResizablePanelsProps> = ({
  children,
  initialLeftWidth = 60,
  minLeftWidth = 30,
  maxLeftWidth = 90,
  className = "",
  onResize,
}) => {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

      if (newLeftWidth >= minLeftWidth && newLeftWidth <= maxLeftWidth) {
        setLeftWidth(newLeftWidth);
        onResize?.(newLeftWidth);
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [minLeftWidth, maxLeftWidth, onResize]);

  return (
    <div ref={containerRef} className={`flex w-full h-full relative ${className}`}>
      <div style={{ width: `${leftWidth}%` }} className="h-full overflow-hidden">
        {children[0]}
      </div>
      <div
        onMouseDown={() => {
          isDragging.current = true;
        }}
        className="w-1 bg-gray-300 cursor-col-resize z-10"
      />
      <div style={{ width: `${100 - leftWidth}%` }} className="h-full overflow-hidden">
        {children[1]}
      </div>
    </div>
  );
};

export default ResizablePanels;
