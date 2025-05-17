import { useState, useEffect } from 'react';

export default function GridBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <div 
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          backgroundImage: `
            linear-gradient(rgba(128, 128, 128, 0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(128, 128, 128, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
          animation: 'gridShift 60s linear infinite',
          maskImage: `radial-gradient(circle 300px at ${mousePosition.x}px ${mousePosition.y}px, black, transparent)`,
          WebkitMaskImage: `radial-gradient(circle 300px at ${mousePosition.x}px ${mousePosition.y}px, black, transparent)`
        }}
      />
      <div 
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          backgroundImage: `
            linear-gradient(rgba(128, 128, 128, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(128, 128, 128, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
          filter: 'blur(1px)',
          animation: 'gridShift 60s linear infinite',
          maskImage: `radial-gradient(circle 300px at ${mousePosition.x}px ${mousePosition.y}px, black, transparent)`,
          WebkitMaskImage: `radial-gradient(circle 300px at ${mousePosition.x}px ${mousePosition.y}px, black, transparent)`
        }}
      />
    </div>
  );
} 