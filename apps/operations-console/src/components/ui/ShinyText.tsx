import React from 'react';

interface ShinyTextProps {
  text: string;
  className?: string;
  shimmerColor?: string;
  style?: React.CSSProperties;
}

export const ShinyText: React.FC<ShinyTextProps> = ({
  text,
  className = '',
  shimmerColor = '#86efac',
  style,
}) => {
  return (
    <span
      className={`wgy-shiny-text ${className}`}
      style={{
        display: 'inline-block',
        backgroundImage: `linear-gradient(120deg, rgba(255, 255, 255, 0.4) 0%, ${shimmerColor} 50%, rgba(255, 255, 255, 0.4) 100%)`,
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation: 'shinyText 3.5s linear infinite',
        fontWeight: 800,
        ...style,
      }}
    >
      {text}
    </span>
  );
};
