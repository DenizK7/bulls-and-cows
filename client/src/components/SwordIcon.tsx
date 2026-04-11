// Pixel art swords drawn with SVG rects.
// Split into LeftSword + RightSword so they can be animated independently
// (clash animation on landing page).

import { motion } from "framer-motion";

const blade = "#ede5d8";
const bladeShade = "#9a9185";
const guard = "#c2916a";
const guardShade = "#8a5e3a";
const grip = "#3a2820";

// Sword pointing top-right, hilt bottom-left (24x24)
function LeftSword({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" shapeRendering="crispEdges" className={className}>
      {/* Blade — diagonal stair-step, 3-wide */}
      <rect x="18" y="2" width="3" height="2" fill={blade} />
      <rect x="16" y="4" width="3" height="2" fill={blade} />
      <rect x="14" y="6" width="3" height="2" fill={blade} />
      <rect x="12" y="8" width="3" height="2" fill={blade} />
      <rect x="10" y="10" width="3" height="2" fill={blade} />
      {/* Bottom-edge shading */}
      <rect x="20" y="3" width="1" height="1" fill={bladeShade} />
      <rect x="18" y="5" width="1" height="1" fill={bladeShade} />
      <rect x="16" y="7" width="1" height="1" fill={bladeShade} />
      <rect x="14" y="9" width="1" height="1" fill={bladeShade} />
      <rect x="12" y="11" width="1" height="1" fill={bladeShade} />
      {/* Cross-guard */}
      <rect x="6" y="12" width="6" height="2" fill={guard} />
      <rect x="8" y="14" width="2" height="4" fill={guard} />
      <rect x="6" y="13" width="6" height="1" fill={guardShade} />
      {/* Grip + pommel */}
      <rect x="5" y="15" width="3" height="3" fill={grip} />
      <rect x="4" y="18" width="4" height="2" fill={guard} />
    </svg>
  );
}

// Sword pointing top-left, hilt bottom-right (24x24)
function RightSword({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" shapeRendering="crispEdges" className={className}>
      <rect x="3" y="2" width="3" height="2" fill={blade} />
      <rect x="5" y="4" width="3" height="2" fill={blade} />
      <rect x="7" y="6" width="3" height="2" fill={blade} />
      <rect x="9" y="8" width="3" height="2" fill={blade} />
      <rect x="11" y="10" width="3" height="2" fill={blade} />
      <rect x="3" y="3" width="1" height="1" fill={bladeShade} />
      <rect x="5" y="5" width="1" height="1" fill={bladeShade} />
      <rect x="7" y="7" width="1" height="1" fill={bladeShade} />
      <rect x="9" y="9" width="1" height="1" fill={bladeShade} />
      <rect x="11" y="11" width="1" height="1" fill={bladeShade} />
      <rect x="12" y="12" width="6" height="2" fill={guard} />
      <rect x="14" y="14" width="2" height="4" fill={guard} />
      <rect x="12" y="13" width="6" height="1" fill={guardShade} />
      <rect x="16" y="15" width="3" height="3" fill={grip} />
      <rect x="16" y="18" width="4" height="2" fill={guard} />
    </svg>
  );
}

export function CrossedSwords({ className = "w-6 h-6", animate = false }: { className?: string; animate?: boolean }) {
  if (!animate) {
    return (
      <span className={`relative inline-block ${className}`}>
        <LeftSword className="absolute inset-0" />
        <RightSword className="absolute inset-0" />
      </span>
    );
  }
  return (
    <span className={`relative inline-block ${className}`}>
      <motion.span className="absolute inset-0"
        initial={{ x: "-100%", rotate: -45, opacity: 0 }}
        animate={{ x: 0, rotate: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      >
        <LeftSword />
      </motion.span>
      <motion.span className="absolute inset-0"
        initial={{ x: "100%", rotate: 45, opacity: 0 }}
        animate={{ x: 0, rotate: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      >
        <RightSword />
      </motion.span>
      {/* Clash flash */}
      <motion.span className="absolute inset-0 rounded-full bg-white"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.8, 0], opacity: [0, 0.6, 0] }}
        transition={{ duration: 0.4, delay: 0.6, ease: "easeOut" }}
      />
    </span>
  );
}
