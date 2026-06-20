 
'use client';

import React, { createContext, useState, useContext, useRef, useEffect } from 'react';

const MouseEnterContext = createContext<{
  mouseX: number;
  mouseY: number;
  setMouseX: React.Dispatch<React.SetStateAction<number>>;
  setMouseY: React.Dispatch<React.SetStateAction<number>>;
  isHovered: boolean;
  setIsHovered: React.Dispatch<React.SetStateAction<boolean>>;
}>({
  mouseX: 0,
  mouseY: 0,
  setMouseX: () => {},
  setMouseY: () => {},
  isHovered: false,
  setIsHovered: () => {}
});

export const CardContainer = ({
  children,
  className,
  containerClassName
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMouseX(event.clientX - rect.left);
      setMouseY(event.clientY - rect.top);
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <MouseEnterContext.Provider
      value={{ mouseX, mouseY, setMouseX, setMouseY, isHovered, setIsHovered }}
    >
      <div
        className={`relative group/card ${containerClassName}`}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        ref={containerRef}
      >
        <div className={className}>{children}</div>
      </div>
    </MouseEnterContext.Provider>
  );
};

export const CardBody = ({
  children,
  className,
  onClick,
  role,
  tabIndex,
  onKeyDown
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  role?: string;
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}) => {
  const { mouseX, mouseY, isHovered } = useContext(MouseEnterContext);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      if (isHovered) {
        const rect = ref.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        
        const relativeX = (mouseX - centerX) / centerX;
        const relativeY = (mouseY - centerY) / centerY;
        
        
        
        
        
        
        const rotateXValue = -relativeY * 15; 
        const rotateYValue = relativeX * 15;
        
        ref.current.style.transform = `perspective(1000px) rotateX(${rotateXValue}deg) rotateY(${rotateYValue}deg)`;
      } else {
        ref.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
      }
    }
  }, [mouseX, mouseY, isHovered]);

  return (
    <div
      ref={ref}
      className={`group-hover/card:shadow-2xl group-hover/card:shadow-emerald-500/[0.1] dark:bg-black dark:border-white/[0.2] border-black/[0.1] w-auto h-auto rounded-xl p-6 border transition-all duration-300 ease-out ${className}`}
      onClick={onClick}
      role={role}
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  );
};

export const CardItem = ({
  as: Tag = 'div',
  children,
  className,
  translateX = 0,
  translateY = 0,
  translateZ = 0,
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
  ...rest
}: {
  as?: any;
  children: React.ReactNode;
  className?: string;
  translateX?: number | string;
  translateY?: number | string;
  translateZ?: number | string;
  rotateX?: number | string;
  rotateY?: number | string;
  rotateZ?: number | string;
  [key: string]: any;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const { mouseX, mouseY, isHovered } = useContext(MouseEnterContext);

  useEffect(() => {
    if (ref.current) {
      if (isHovered) {
        const containerRect = ref.current.closest('.group\\/card')?.getBoundingClientRect();
        if (containerRect) {
          const centerX = containerRect.width / 2;
          const centerY = containerRect.height / 2;
          
          
          const relativeX = (mouseX - centerX) / centerX;
          const relativeY = (mouseY - centerY) / centerY;
          
          
          const rotateXValue = -relativeY * 15;
          const rotateYValue = relativeX * 15;

          ref.current.style.transform = `perspective(1000px) translateX(${translateX}) translateY(${translateY}) translateZ(${translateZ}px) rotateX(${rotateXValue}deg) rotateY(${rotateYValue}deg) rotateZ(${rotateZ}deg)`;
        }
      } else {
        ref.current.style.transform = `perspective(1000px) translateX(${translateX}) translateY(${translateY}) translateZ(0px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;
      }
    }
  }, [mouseX, mouseY, isHovered, translateX, translateY, translateZ, rotateX, rotateY, rotateZ]);

  return <Tag ref={ref} className={`transition-all duration-200 ease-out ${className}`} {...rest}>
    {children}
  </Tag>;
};

