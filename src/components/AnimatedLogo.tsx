
import { motion } from 'framer-motion';

export const AnimatedLogo = ({ className = "h-8 w-8" }: { className?: string }) => {
    return (
        <motion.svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            initial="hidden"
            animate="visible"
        >
            {/* Shield/Badge Base */}
            <motion.path
                d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z"
                stroke="url(#gradient)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                variants={{
                    hidden: { pathLength: 0, opacity: 0 },
                    visible: {
                        pathLength: 1,
                        opacity: 1,
                        transition: { duration: 1.5, ease: "easeInOut" }
                    }
                }}
            />

            {/* Inner Graduation Cap / Checkmark Hybrid */}
            <motion.path
                d="M9 12L11 14L15 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                variants={{
                    hidden: { pathLength: 0, opacity: 0 },
                    visible: {
                        pathLength: 1,
                        opacity: 1,
                        transition: { delay: 1, duration: 0.5 }
                    }
                }}
                className="text-primary"
            />

            {/* Gradient Definition */}
            <defs>
                <linearGradient id="gradient" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#9C27B0" /> {/* Purple */}
                    <stop offset="1" stopColor="#5E17EB" /> {/* Deep Blue/Purple */}
                </linearGradient>
            </defs>
        </motion.svg>
    );
};
