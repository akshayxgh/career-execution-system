import { useEffect, useRef } from 'react';

// Day Mode: Floating 3D Bubbles (Magic UI style)
interface DayParticle3D {
  x: number;
  y: number;
  z: number;
  radius: number;
  baseRadius: number;
  vy: number;
  colorIndex: number;
  baseAlpha: number;
}

// Night Mode: Constellation Mesh Particle
interface NightParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  color: string;
  alpha: number;
}

const NIGHT_COLORS = [
  'rgba(16, 185, 129, ',  // Emerald
  'rgba(56, 189, 248, ',  // Electric Sky Blue
  'rgba(99, 102, 241, ',  // Indigo
  'rgba(52, 211, 153, ',  // Mint
];

// Day Palette: True Black and shades of slate / charcoal
const DAY_PALETTE = [
  '0, 0, 0',       // Pure Black
  '15, 23, 42',    // Slate 900
  '30, 41, 59',    // Slate 800
  '51, 65, 85',    // Slate 700
  '71, 85, 105',   // Slate 600
  '100, 116, 139', // Slate 500
  '148, 163, 184', // Slate 400
];

export const InteractiveBackground = ({ theme: propTheme }: { theme?: 'day' | 'night' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const getEffectiveTheme = (): 'day' | 'night' => {
    if (propTheme) return propTheme;
    const docTheme = document.documentElement.getAttribute('data-theme') as 'day' | 'night' | null;
    if (docTheme === 'day' || docTheme === 'night') return docTheme;
    const saved = localStorage.getItem('ces_theme') as 'day' | 'night' | null;
    if (saved) return saved;
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18 ? 'day' : 'night';
  };

  const themeRef = useRef<'day' | 'night'>(getEffectiveTheme());

  useEffect(() => {
    if (propTheme) {
      themeRef.current = propTheme;
    }
  }, [propTheme]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const current = document.documentElement.getAttribute('data-theme') as 'day' | 'night' | null;
      if (current === 'day' || current === 'night') {
        themeRef.current = current;
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse coordinates & 3D rotation
    const mouse = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
      rotX: 0,
      rotY: 0,
      targetRotX: 0,
      targetRotY: 0,
      radius: 170, // Interactive radius for night mode
      active: false,
    };

    // --- DAY MODE PARTICLES (3D Perspective upward buoyant drift) ---
    const depth = 900;
    const fov = 480;
    const dayParticleCount = Math.min(Math.floor((width * height) / 3200), 420);
    const dayParticles: DayParticle3D[] = [];

    for (let i = 0; i < dayParticleCount; i++) {
      const rand = Math.random();
      let radius: number;
      if (rand < 0.12) {
        radius = Math.random() * 3 + 5.5;  // 5.5px - 8.5px
      } else if (rand < 0.45) {
        radius = Math.random() * 2.2 + 3.0; // 3.0px - 5.2px
      } else {
        radius = Math.random() * 1.6 + 1.2; // 1.2px - 2.8px
      }

      dayParticles.push({
        x: (Math.random() - 0.5) * width * 1.6,
        y: (Math.random() - 0.5) * height * 1.6,
        z: (Math.random() - 0.5) * depth,
        radius,
        baseRadius: radius,
        // Buoyant upward drift: going up from down continuously
        vy: -(Math.random() * 0.65 + 0.35),
        colorIndex: Math.floor(Math.random() * DAY_PALETTE.length),
        baseAlpha: Math.random() * 0.55 + 0.35,
      });
    }

    // --- NIGHT MODE PARTICLES (Constellation mesh with connecting lines) ---
    const nightParticleCount = Math.min(Math.floor((width * height) / 12000), 95);
    const nightParticles: NightParticle[] = [];

    for (let i = 0; i < nightParticleCount; i++) {
      const radius = Math.random() * 2 + 1.2;
      nightParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        radius,
        baseRadius: radius,
        color: NIGHT_COLORS[Math.floor(Math.random() * NIGHT_COLORS.length)],
        alpha: Math.random() * 0.5 + 0.3,
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

      // 3D tilt angles for Day mode
      const normX = (e.clientX - width / 2) / (width / 2);
      const normY = (e.clientY - height / 2) / (height / 2);
      mouse.targetRotY = normX * 0.45;
      mouse.targetRotX = -normY * 0.35;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        mouse.targetX = touch.clientX;
        mouse.targetY = touch.clientY;
        mouse.active = true;

        const normX = (touch.clientX - width / 2) / (width / 2);
        const normY = (touch.clientY - height / 2) / (height / 2);
        mouse.targetRotY = normX * 0.45;
        mouse.targetRotX = -normY * 0.35;
      }
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.targetX = -1000;
      mouse.targetY = -1000;
      mouse.targetRotX = 0;
      mouse.targetRotY = 0;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    let continuousAngle = 0;

    const render = () => {
      const isDay = themeRef.current === 'day';
      ctx.clearRect(0, 0, width, height);

      // ==========================================
      // DAY MODE: 3D Floating Black/Slate Bubbles (No lines)
      // ==========================================
      if (isDay) {
        continuousAngle += 0.0018;

        // Smooth mouse & 3D rotation interpolation
        if (mouse.active) {
          mouse.x += (mouse.targetX - mouse.x) * 0.08;
          mouse.y += (mouse.targetY - mouse.y) * 0.08;
        }
        mouse.rotX += (mouse.targetRotX - mouse.rotX) * 0.06;
        mouse.rotY += (mouse.targetRotY - mouse.rotY) * 0.06;

        const totalRotY = mouse.rotY + continuousAngle;
        const totalRotX = mouse.rotX;

        const cosY = Math.cos(totalRotY);
        const sinY = Math.sin(totalRotY);
        const cosX = Math.cos(totalRotX);
        const sinX = Math.sin(totalRotX);

        // Ambient radial highlight under cursor
        if (mouse.active && mouse.x > 0 && mouse.y > 0) {
          const glow = ctx.createRadialGradient(
            mouse.x,
            mouse.y,
            0,
            mouse.x,
            mouse.y,
            300
          );
          glow.addColorStop(0, 'rgba(0, 0, 0, 0.025)');
          glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = glow;
          ctx.fillRect(0, 0, width, height);
        }

        // Render 3D Bubbles rising upwards
        for (let i = 0; i < dayParticles.length; i++) {
          const p = dayParticles[i];

          // Buoyant upward drift (up from down)
          p.y += p.vy;
          if (p.y < -height * 0.8) {
            p.y = height * 0.8;
            p.x = (Math.random() - 0.5) * width * 1.6;
          }

          // 1. Rotate Y
          const x1 = p.x * cosY - p.z * sinY;
          const z1 = p.z * cosY + p.x * sinY;

          // 2. Rotate X
          const y1 = p.y * cosX - z1 * sinX;
          const z2 = z1 * cosX + p.y * sinX;

          // Perspective calculation
          const cameraDistance = fov + depth / 2;
          const currentZ = z2 + cameraDistance;
          if (currentZ <= 40) continue;

          const scale = fov / currentZ;
          const projX = width / 2 + x1 * scale;
          const projY = height / 2 + y1 * scale;

          const depthRatio = Math.max(0.1, Math.min(1.6, scale));
          const projRadius = Math.max(0.7, p.baseRadius * depthRatio);
          const depthAlpha = Math.min(1, Math.max(0.12, p.baseAlpha * depthRatio));

          // Mouse repulsion in Day mode
          let finalX = projX;
          let finalY = projY;

          if (mouse.active && mouse.x > 0 && mouse.y > 0) {
            const dx = projX - mouse.x;
            const dy = projY - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const interactiveRadius = 140;

            if (dist < interactiveRadius && dist > 0) {
              const force = (interactiveRadius - dist) / interactiveRadius;
              const angle = Math.atan2(dy, dx);
              finalX += Math.cos(angle) * force * 18;
              finalY += Math.sin(angle) * force * 18;
            }
          }

          ctx.beginPath();
          ctx.arc(finalX, finalY, projRadius, 0, Math.PI * 2);
          const rgb = DAY_PALETTE[p.colorIndex % DAY_PALETTE.length];
          ctx.fillStyle = `rgba(${rgb}, ${depthAlpha})`;
          ctx.fill();
        }
      }

      // ==========================================
      // NIGHT MODE: Emerald Dot & Line Constellation Mesh
      // ==========================================
      else {
        // Smooth mouse easing
        if (mouse.active) {
          mouse.x += (mouse.targetX - mouse.x) * 0.12;
          mouse.y += (mouse.targetY - mouse.y) * 0.12;
        }

        // Ambient cyber glow under mouse cursor
        if (mouse.active && mouse.x > 0 && mouse.y > 0) {
          const glow = ctx.createRadialGradient(
            mouse.x,
            mouse.y,
            0,
            mouse.x,
            mouse.y,
            mouse.radius * 1.6
          );
          glow.addColorStop(0, 'rgba(16, 185, 129, 0.20)');
          glow.addColorStop(0.4, 'rgba(56, 189, 248, 0.08)');
          glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = glow;
          ctx.fillRect(0, 0, width, height);
        }

        for (let i = 0; i < nightParticles.length; i++) {
          const p = nightParticles[i];

          // Drift
          p.x += p.vx;
          p.y += p.vy;

          // Bounce off canvas boundaries
          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;

          // Mouse magnetic interaction
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (mouse.active && dist < mouse.radius && mouse.x > 0 && mouse.y > 0) {
            const force = (mouse.radius - dist) / mouse.radius;
            const angle = Math.atan2(dy, dx);
            p.x += Math.cos(angle) * force * 1.8;
            p.y += Math.sin(angle) * force * 1.8;
            p.radius = p.baseRadius + force * 1.5;
          } else {
            p.radius = p.baseRadius;
          }

          // Draw Glowing Particle Dot
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `${p.color}${p.alpha})`;
          ctx.shadowBlur = 9;
          ctx.shadowColor = `${p.color}0.85)`;
          ctx.fill();
          ctx.shadowBlur = 0; // reset

          // Connect particle to mouse with laser line
          if (mouse.active && dist < mouse.radius && mouse.x > 0 && mouse.y > 0) {
            const connectionAlpha = (1 - dist / mouse.radius) * 0.75;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(52, 211, 153, ${connectionAlpha})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }

          // Connect nearby particles (constellation neural mesh lines)
          for (let j = i + 1; j < nightParticles.length; j++) {
            const p2 = nightParticles[j];
            const pjDistX = p.x - p2.x;
            const pjDistY = p.y - p2.y;
            const pjDist = Math.sqrt(pjDistX * pjDistX + pjDistY * pjDistY);

            if (pjDist < 125) {
              const meshAlpha = (1 - pjDist / 125) * 0.22;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = `rgba(148, 163, 184, ${meshAlpha})`;
              ctx.lineWidth = 0.65;
              ctx.stroke();
            }
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
