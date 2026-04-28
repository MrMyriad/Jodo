"use client";

import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";

export function Confetti({ run = true }: { run?: boolean }) {
  const [pieces, setPieces] = useState<number[]>([]);

  useEffect(() => {
    if (!run) return;
    setPieces(Array.from({ length: 18 }).map((_, i) => i));
    const t = setTimeout(() => setPieces([]), 2500);
    return () => clearTimeout(t);
  }, [run]);

  if (!run) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((i) => {
        const left = 50 + (Math.random() - 0.5) * 60;
        const rotate = Math.random() * 360;
        const delay = Math.random() * 0.6;
        const color = ["#F97316", "#F43F5E", "#8B5CF6", "#06B6D4", "#10B981"][
          i % 5
        ];

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -20, scale: 0.6 }}
            animate={{
              opacity: 1,
              y: 300 + Math.random() * 200,
              rotate: rotate + 360,
            }}
            transition={{ duration: 1.4, delay }}
            style={{ left: `${left}%`, position: "absolute" }}
            className="select-none"
          >
            <div
              style={{ transform: `rotate(${rotate}deg)` }}
              className="text-2xl"
              aria-hidden
            >
              <span style={{ color }}>{"🎉"}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export default Confetti;
