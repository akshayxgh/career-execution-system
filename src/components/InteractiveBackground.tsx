import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  colorIndex: number;
  alpha: number;
}

const NIGHT_COLORS = [
  'rgba(16, 185, 129, ',  // Emerald
  'rgba(56, 189, 248, ',  // Sky Blue
  'rgba(99, 102, 241, ',  // Indigo
  'rgba(52, 211, 153, ',  // Mint
];

const DAY_COLORS = [
  'rgba(13, 148, 136, ',  // Teal
  'rgba(37, 99, 235, ',   // Blue
  'rgba(5, 150, 105, ',   // Dark Emerald
  'rgba(100, 116, 139, ', // Slate
];

export const InteractiveBackground = ({ theme = 'night' }: { theme?: 'day' | 'night' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const themeRef = useRef(theme);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse coordinates (default off-screen until first movement)
    const mouse = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
      radius: 170, // Interactive field radius
      active: false,
    };

    // Calculate particle count based on screen size (responsive)
    const particleCount = Math.min(Math.floor((width * height) / 14000), 85);
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const radius = Math.random() * 2 + 1.2;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        radius,
        baseRadius: radius,
        colorIndex: Math.floor(Math.random() * NIGHT_COLORS.length),
        alpha: Math.random() * 0.5 + 0.35,
      });
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.active = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouse.targetX = e.touches[0].clientX;
        mouse.targetY = e.touches[0].clientY;
        mouse.active = true;
      }
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.targetX = -1000;
      mouse.targetY = -1000;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    const render = () => {
      const isDay = themeRef.current === 'day';
      const colors = isDay ? DAY_COLORS : NIGHT_COLORS;

      // Smooth mouse easing
      mouse.x += (mouse.targetX - mouse.x) * 0.12;
      mouse.y += (mouse.targetY - mouse.y) * 0.12;

      ctx.clearRect(0, 0, width, height);

      // 1. Draw dynamic ambient glow under mouse cursor
      if (mouse.active && mouse.x > 0 && mouse.y > 0) {
        const glow = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          mouse.radius * 1.5
        );
        if (isDay) {
          glow.addColorStop(0, 'rgba(16, 185, 129, 0.12)');
          glow.addColorStop(0.4, 'rgba(37, 99, 235, 0.05)');
          glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else {
          glow.addColorStop(0, 'rgba(16, 185, 129, 0.18)');
          glow.addColorStop(0.4, 'rgba(56, 189, 248, 0.08)');
          glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        }
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
      }

      // 2. Update & Draw Particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Normal drift
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off canvas boundaries
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Mouse interaction (gravity / repulsion)
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius && mouse.active) {
          const force = (mouse.radius - dist) / mouse.radius;
          const angle = Math.atan2(dy, dx);
          p.x += Math.cos(angle) * force * 1.8;
          p.y += Math.sin(angle) * force * 1.8;
          p.radius = p.baseRadius + force * 1.5;
        } else {
          p.radius = p.baseRadius;
        }

        // Draw particle dot with soft glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${colors[p.colorIndex]}${p.alpha * (isDay ? 0.8 : 1)})`;
        ctx.shadowBlur = isDay ? 4 : 8;
        ctx.shadowColor = `${colors[p.colorIndex]}0.7)`;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Connect particle to mouse with glowing energetic laser line
        if (dist < mouse.radius && mouse.active) {
          const connectionAlpha = (1 - dist / mouse.radius) * 0.75;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = isDay
            ? `rgba(13, 148, 136, ${connectionAlpha * 0.75})`
            : `rgba(52, 211, 153, ${connectionAlpha})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        // Connect nearby particles (neural constellation mesh)
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const pjDistX = p.x - p2.x;
          const pjDistY = p.y - p2.y;
          const pjDist = Math.sqrt(pjDistX * pjDistX + pjDistY * pjDistY);

          if (pjDist < 125) {
            const meshAlpha = (1 - pjDist / 125) * (isDay ? 0.28 : 0.22);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = isDay
              ? `rgba(100, 116, 139, ${meshAlpha})`
              : `rgba(148, 163, 184, ${meshAlpha})`;
            ctx.lineWidth = 0.65;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};
