import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion, useInView, useMotionValue, animate } from "framer-motion";

interface RevealProps {
  children: ReactNode;
  /** Delay before the element animates in, in seconds. */
  delay?: number;
  /** Vertical travel distance in px (defaults to 14). */
  y?: number;
  className?: string;
  /** Render as a specific element via motion factory. Defaults to div. */
  as?: "div" | "section" | "li" | "span";
  once?: boolean;
}

/**
 * Lightweight scroll/entrance reveal built on framer-motion.
 * Fades + lifts content into view. Fully static when the user
 * prefers reduced motion (accessibility + ScrollManager friendly).
 */
export const Reveal = ({
  children,
  delay = 0,
  y = 14,
  className,
  as = "div",
  once = true,
}: RevealProps) => {
  const reduce = useReducedMotion();
  const MotionTag = motion[as];

  if (reduce) {
    const Tag = as as keyof JSX.IntrinsicElements;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.2 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </MotionTag>
  );
};

interface CountUpProps {
  value: number;
  /** Zero-pad to this many digits (e.g. 2 → "07"). */
  pad?: number;
  duration?: number;
  className?: string;
}

/**
 * Animated number that counts up when scrolled into view.
 * Renders the final value instantly under reduced-motion.
 */
export const CountUp = ({ value, pad = 0, duration = 1.1, className }: CountUpProps) => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    if (!inView) return;
    const controls = animate(mv, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value, reduce, duration, mv]);

  const text = pad ? String(display).padStart(pad, "0") : String(display);
  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
};

export default Reveal;