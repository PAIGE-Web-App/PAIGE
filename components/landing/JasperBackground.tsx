'use client';

export default function JasperBackground() {
  return (
    <div 
      className="absolute inset-y-0 overflow-hidden z-[1] pointer-events-none" 
      style={{ 
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100vw',
        maxWidth: '100vw'
      }}
    >
      {/* Wedding-Specific Pattern Background */}
      {/* Subtle diagonal stripes with decorative elements - elegant wedding invitation style */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 2px,
              rgba(168, 92, 54, 0.03) 2px,
              rgba(168, 92, 54, 0.03) 4px
            ),
            repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 2px,
              rgba(128, 93, 147, 0.03) 2px,
              rgba(128, 93, 147, 0.03) 4px
            ),
            radial-gradient(circle at 20% 30%, rgba(168, 92, 54, 0.02) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(128, 93, 147, 0.02) 0%, transparent 50%)
          `,
          backgroundSize: '60px 60px, 60px 60px, 800px 800px, 800px 800px',
          backgroundPosition: '0 0, 0 0, 0 0, 100% 100%'
        }}
      />
      
      {/* Subtle decorative border elements */}
      <div 
        className="absolute top-0 left-0 w-full h-32 opacity-5"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 40px,
              rgba(168, 92, 54, 0.15) 40px,
              rgba(168, 92, 54, 0.15) 42px
            )
          `
        }}
      />
      <div 
        className="absolute bottom-0 left-0 w-full h-32 opacity-5"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 40px,
              rgba(128, 93, 147, 0.15) 40px,
              rgba(128, 93, 147, 0.15) 42px
            )
          `
        }}
      />
    </div>
  );
}

