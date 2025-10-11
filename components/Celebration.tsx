import React from 'react';

const Celebration: React.FC = () => {
  // Generate a fixed set of confetti pieces to avoid re-rendering them on every App state change
  const confetti = React.useMemo(() => {
    const confettiCount = 150;
    return Array.from({ length: confettiCount }).map((_, i) => {
      const style = {
        left: `${Math.random() * 100}vw`,
        animationDuration: `${Math.random() * 3 + 2}s`, // 2-5 seconds
        animationDelay: `${Math.random() * 4}s`,
        backgroundColor: `hsl(${Math.random() * 360}, 90%, 65%)`,
        transform: `rotate(${Math.random() * 360}deg)`,
      };
      return <div key={i} className="confetti" style={style}></div>;
    });
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {confetti}
    </div>
  );
};

export default Celebration;
