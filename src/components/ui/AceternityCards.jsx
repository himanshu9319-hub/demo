import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import gsap from 'gsap'

/**
 * Aceternity UI Card Spotlight Effect
 * Subtly tracks the cursor and paints a soft, medical-grade radiant highlight
 * without changing the underlying theme colours or structure.
 */
export function CardSpotlight({
  children,
  className = '',
  spotlightColor = 'rgba(37, 99, 235, 0.09)',
  onClick,
  ...props
}) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const cardRef = useRef(null)

  const handleMouseMove = (e) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.985 }}
      className={`aceternity-spotlight-card ${className}`}
      style={{ position: 'relative', overflow: 'hidden' }}
      {...props}
    >
      {/* Radiant spotlight canvas */}
      {isHovered && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 0,
            background: `radial-gradient(350px circle at ${mousePosition.x}px ${mousePosition.y}px, ${spotlightColor}, transparent 80%)`,
          }}
        />
      )}
      {children}
    </motion.div>
  )
}

/**
 * GSAP Animated Metric Counter
 * Smoothly interpolates numeric values (e.g. 0 -> 12 Nearby Hospitals).
 */
export function GsapCounter({ value = 0, duration = 1, prefix = '', suffix = '' }) {
  const [displayValue, setDisplayValue] = useState(value)
  const numRef = useRef({ val: 0 })
  const parsedTarget = typeof value === 'number' ? value : parseInt(String(value).replace(/\D/g, ''), 10) || 0

  useEffect(() => {
    const obj = numRef.current
    gsap.to(obj, {
      val: parsedTarget,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        setDisplayValue(Math.round(obj.val))
      },
    })
  }, [parsedTarget, duration])

  if (typeof value === 'string' && isNaN(parseInt(value, 10))) {
    return <span>{value}</span>
  }

  return (
    <span>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  )
}

/**
 * Framer Motion Page/Tab Transition
 * Gives every route & tab switch a silky smooth slide-fade feel.
 */
export function PageTransition({ children, tabKey }) {
  return (
    <motion.div
      key={tabKey}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      style={{ width: '100%' }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Framer Motion Interactive Button
 */
export function MotionButton({ children, className = '', onClick, ...props }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className={className}
      onClick={onClick}
      {...props}
    >
      {children}
    </motion.button>
  )
}
