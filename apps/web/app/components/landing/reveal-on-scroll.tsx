'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';

interface RevealOnScrollProps {
  children: ReactNode;
  delay?: 0 | 1 | 2 | 3;
  className?: string;
}

const DELAY_CLASSES = ['', 'delay-[50ms]', 'delay-150', 'delay-[250ms]'];

export function RevealOnScroll({ children, delay = 0, className = '' }: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${DELAY_CLASSES[delay]} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[26px]'
      } ${className}`}
    >
      {children}
    </div>
  );
}
