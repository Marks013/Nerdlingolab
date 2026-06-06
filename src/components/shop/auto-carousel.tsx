"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { SafeImage as Image } from "@/components/media/safe-image";

const DRAG_ACTIVATION_PX = 8;
const DRAG_FALLBACK_WIDTH = 320;

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
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const clickSuppressTimerRef = useRef<number | null>(null);
  const dragStateRef = useRef({
    deltaX: 0,
    deltaY: 0,
    hasDragged: false,
    pointerId: null as number | null,
    startX: 0,
    startY: 0
  });
  const suppressClickRef = useRef(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (items.length < 2 || isDragging) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % items.length);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [intervalMs, isDragging, items.length]);

  useEffect(() => {
    return () => {
      if (clickSuppressTimerRef.current !== null) {
        window.clearTimeout(clickSuppressTimerRef.current);
      }
    };
  }, []);

  const goToPrevious = () => {
    setActiveIndex((currentIndex) => (currentIndex - 1 + items.length) % items.length);
  };

  const goToNext = () => {
    setActiveIndex((currentIndex) => (currentIndex + 1) % items.length);
  };

  const visibleIndex = items.length > 0 ? Math.min(activeIndex, items.length - 1) : 0;

  const getDragThreshold = () => {
    const width = viewportRef.current?.clientWidth ?? DRAG_FALLBACK_WIDTH;

    return Math.min(120, Math.max(42, width * 0.08));
  };

  const armClickSuppression = () => {
    suppressClickRef.current = true;

    if (clickSuppressTimerRef.current !== null) {
      window.clearTimeout(clickSuppressTimerRef.current);
    }

    clickSuppressTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = false;
      clickSuppressTimerRef.current = null;
    }, 180);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (items.length < 2 || dragStateRef.current.pointerId !== null) {
      return;
    }

    if (
      event.target instanceof Element &&
      event.target.closest('[data-auto-carousel-control="true"]')
    ) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    dragStateRef.current = {
      deltaX: 0,
      deltaY: 0,
      hasDragged: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY
    };

  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;

    if (dragState.pointerId !== event.pointerId) {
      return;
    }

    dragState.deltaX = event.clientX - dragState.startX;
    dragState.deltaY = event.clientY - dragState.startY;

    const absX = Math.abs(dragState.deltaX);
    const absY = Math.abs(dragState.deltaY);

    if (absX > DRAG_ACTIVATION_PX && absX > absY) {
      const width = viewportRef.current?.clientWidth ?? DRAG_FALLBACK_WIDTH;

      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }

      dragState.hasDragged = true;
      setIsDragging(true);
      setDragOffset(Math.max(-width, Math.min(width, dragState.deltaX)));
      event.preventDefault();
    }
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;

    if (dragState.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const absX = Math.abs(dragState.deltaX);
    const absY = Math.abs(dragState.deltaY);

    if (dragState.hasDragged) {
      armClickSuppression();
    }

    if (dragState.hasDragged && absX >= getDragThreshold() && absX > absY) {
      if (dragState.deltaX < 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }

    dragStateRef.current = {
      deltaX: 0,
      deltaY: 0,
      hasDragged: false,
      pointerId: null,
      startX: 0,
      startY: 0
    };
    setDragOffset(0);
    setIsDragging(false);
  };

  const handleSlideClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!suppressClickRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  };

  return (
    <div
      className={`relative overflow-hidden ${items.length > 1 ? "cursor-grab select-none active:cursor-grabbing" : ""} ${className}`}
      data-auto-carousel="true"
      onPointerCancel={handlePointerEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      ref={viewportRef}
      style={{ touchAction: "pan-y" }}
    >
      <div className={slideClassName}>
        <div
          className={`absolute inset-0 flex h-full w-full ${isDragging ? "" : "transition-transform duration-500 ease-out"}`}
          data-auto-carousel-track="true"
          style={{ transform: `translate3d(calc(${-visibleIndex * 100}% + ${dragOffset}px), 0, 0)` }}
        >
          {items.map((item, index) => (
            <Link
              aria-hidden={visibleIndex !== index}
              aria-label={item.alt}
              className={`relative block h-full min-w-full shrink-0 ${
                visibleIndex === index && !isDragging ? "" : "pointer-events-none"
              }`}
              draggable={false}
              href={item.href}
              key={`${item.href}-${item.desktop ?? item.src ?? index}`}
              onClick={handleSlideClick}
              tabIndex={visibleIndex === index ? 0 : -1}
            >
              {item.desktop && item.mobile ? (
                <>
                  <Image
                    alt={item.alt}
                    className={`hidden select-none md:block ${imageClassName}`}
                    draggable={false}
                    fill
                    priority={index === 0}
                    sizes={sizes}
                    src={item.desktop}
                  />
                  <Image
                    alt={item.alt}
                    className={`select-none md:hidden ${imageClassName}`}
                    draggable={false}
                    fill
                    priority={index === 0}
                    sizes={sizes}
                    src={item.mobile}
                  />
                </>
              ) : (
                <Image
                  alt={item.alt}
                  className={`select-none ${imageClassName}`}
                  draggable={false}
                  fill
                  priority={index === 0}
                  sizes={sizes}
                  src={item.src ?? item.desktop ?? item.mobile ?? ""}
                />
              )}
            </Link>
          ))}
        </div>
      </div>

      {items.length > 1 ? (
        <>
          <button
            aria-label="Imagem anterior"
            className="absolute left-2 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-black shadow-sm transition hover:bg-white sm:left-3 sm:h-10 sm:w-10"
            data-auto-carousel-control="true"
            onClick={goToPrevious}
            type="button"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            aria-label="Próxima imagem"
            className="absolute right-2 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-black shadow-sm transition hover:bg-white sm:right-3 sm:h-10 sm:w-10"
            data-auto-carousel-control="true"
            onClick={goToNext}
            type="button"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-2">
            {items.map((item, index) => (
              <button
                aria-current={visibleIndex === index ? "true" : undefined}
                aria-label={`Ir para imagem ${index + 1}`}
                className={`h-2.5 rounded-full transition-all ${
                  visibleIndex === index ? "w-8 bg-white" : "w-2.5 bg-white/60"
                }`}
                data-auto-carousel-control="true"
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
