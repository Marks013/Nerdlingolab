"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export interface AutoCarouselItem {
  alt: string;
  desktop?: string;
  href: string;
  mobile?: string;
  src?: string;
}

interface AutoCarouselProps {
  className?: string;
  imageClassName?: string;
  intervalMs?: number;
  items: AutoCarouselItem[];
  sizes: string;
  slideClassName: string;
}

export function AutoCarousel({
  className = "",
  imageClassName = "object-cover",
  intervalMs = 4500,
  items,
  sizes,
  slideClassName
}: AutoCarouselProps): React.ReactElement {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (items.length < 2) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % items.length);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [intervalMs, items.length]);

  const goToPrevious = () => {
    setActiveIndex((currentIndex) => (currentIndex - 1 + items.length) % items.length);
  };

  const goToNext = () => {
    setActiveIndex((currentIndex) => (currentIndex + 1) % items.length);
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div className={slideClassName}>
        {items.map((item, index) => (
          <Link
            aria-hidden={activeIndex !== index}
            aria-label={item.alt}
            className={`absolute inset-0 transition-opacity duration-700 ${
              activeIndex === index ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            href={item.href}
            key={`${item.href}-${item.desktop ?? item.src ?? index}`}
            tabIndex={activeIndex === index ? 0 : -1}
          >
            {item.desktop && item.mobile ? (
              <>
                <Image
                  alt={item.alt}
                  className={`hidden md:block ${imageClassName}`}
                  fill
                  priority={index === 0}
                  sizes={sizes}
                  src={item.desktop}
                />
                <Image
                  alt={item.alt}
                  className={`md:hidden ${imageClassName}`}
                  fill
                  priority={index === 0}
                  sizes={sizes}
                  src={item.mobile}
                />
              </>
            ) : (
              <Image
                alt={item.alt}
                className={imageClassName}
                fill
                priority={index === 0}
                sizes={sizes}
                src={item.src ?? item.desktop ?? item.mobile ?? ""}
              />
            )}
          </Link>
        ))}
      </div>

      {items.length > 1 ? (
        <>
          <button
            aria-label="Imagem anterior"
            className="absolute left-2 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-black shadow-sm transition hover:bg-white sm:left-3 sm:h-10 sm:w-10"
            onClick={goToPrevious}
            type="button"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            aria-label="Próxima imagem"
            className="absolute right-2 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-black shadow-sm transition hover:bg-white sm:right-3 sm:h-10 sm:w-10"
            onClick={goToNext}
            type="button"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-2">
            {items.map((item, index) => (
              <button
                aria-label={`Ir para imagem ${index + 1}`}
                className={`h-2.5 rounded-full transition-all ${
                  activeIndex === index ? "w-8 bg-white" : "w-2.5 bg-white/60"
                }`}
                key={`${item.alt}-${index}`}
                onClick={() => setActiveIndex(index)}
                type="button"
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
