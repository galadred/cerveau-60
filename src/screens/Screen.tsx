import { motion } from 'motion/react';
import type { ReactNode } from 'react';

/** Conteneur animé commun à tous les écrans. */
export function Screen({ children, direction, className = '' }: { children: ReactNode; direction: 1 | -1; className?: string }) {
  return (
    <motion.main
      className={`screen container ${className}`}
      custom={direction}
      variants={{
        enter: (d: number) => ({ opacity: 0, x: d * 48, filter: 'blur(6px)' }),
        // filter: 'none' en fin d'animation : un filtre résiduel casserait les éléments `position: fixed`.
        center: { opacity: 1, x: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none', transform: 'none' } },
        exit: (d: number) => ({ opacity: 0, x: d * -48, filter: 'blur(6px)' }),
      }}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.main>
  );
}

/** Apparition échelonnée des éléments d'un écran. */
export const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } } },
  item: {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
  },
} as const;
