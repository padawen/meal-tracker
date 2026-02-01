"use client"

import { useEffect, useState } from "react"

interface Particle {
  id: number
  x: number
  y: number
  color: string
  rotation: number
  scale: number
  velocityX: number
  velocityY: number
}

export function ConfettiEffect() {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    // Seasonal colors
    const month = new Date().getMonth()
    let colors: string[]

    if (month >= 2 && month <= 4) {
      // Spring
      colors = ["#10B981", "#34D399", "#F472B6", "#FBBF24"]
    } else if (month >= 5 && month <= 7) {
      // Summer
      colors = ["#3B82F6", "#06B6D4", "#FBBF24", "#F97316"]
    } else if (month >= 8 && month <= 10) {
      // Autumn
      colors = ["#F97316", "#EF4444", "#FBBF24", "#92400E"]
    } else {
      // Winter
      colors = ["#3B82F6", "#60A5FA", "#E5E7EB", "#A5B4FC"]
    }

    const newParticles: Particle[] = []
    for (let i = 0; i < 50; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 20,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        velocityX: (Math.random() - 0.5) * 2,
        velocityY: 2 + Math.random() * 3,
      })
    }
    setParticles(newParticles)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-3 h-3 rounded-sm animate-confetti"
          style={{
            left: `${particle.x}%`,
            backgroundColor: particle.color,
            transform: `rotate(${particle.rotation}deg) scale(${particle.scale})`,
            animationDelay: `${particle.id * 20}ms`,
            animationDuration: `${2000 + Math.random() * 1000}ms`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
