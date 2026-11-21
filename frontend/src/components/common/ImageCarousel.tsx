import React, { useState, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { resolveMediaUrl } from '../../services/api';

interface ImageCarouselProps {
  images?: string[] | null;
  singleImageUrl?: string | null;
  alt: string;
  className?: string;
  autoPlayInterval?: number; // ms
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  singleImageUrl,
  alt,
  className = 'h-52 w-full',
  autoPlayInterval = 3500,
}) => {
  // Aggregate images list
  const list = React.useMemo(() => {
    const arr: string[] = [];
    if (images && images.length > 0) {
      arr.push(...images.filter(Boolean));
    }
    if (singleImageUrl && !arr.includes(singleImageUrl)) {
      arr.unshift(singleImageUrl);
    }
    return arr;
  }, [images, singleImageUrl]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const touchStartX = React.useRef<number | null>(null);

  // Auto-play timer that swaps images one by one with a delay
  useEffect(() => {
    if (list.length <= 1 || isHovered) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % list.length);
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [list.length, isHovered, autoPlayInterval]);

  if (list.length === 0) {
    return null;
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentIndex((prev) => (prev - 1 + list.length) % list.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentIndex((prev) => (prev + 1) % list.length);
  };

  const handleDotClick = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentIndex(idx);
  };

  return (
    <div
      className={`relative overflow-hidden group select-none ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null || list.length <= 1) return;
        const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
        const delta = endX - touchStartX.current;
        touchStartX.current = null;
        if (delta > 40) {
          setCurrentIndex((prev) => (prev - 1 + list.length) % list.length);
        } else if (delta < -40) {
          setCurrentIndex((prev) => (prev + 1) % list.length);
        }
      }}
    >
      {/* Images container */}
      <div className="w-full h-full relative">
        {list.map((imgSrc, idx) => (
          <div
            key={imgSrc + idx}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <img
              src={resolveMediaUrl(imgSrc)}
              alt={`${alt} ${idx + 1}`}
              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      {/* Multi-image indicators and controls */}
      {list.length > 1 && (
        <>
          {/* Photos count badge */}
          <div className="absolute top-2.5 right-2.5 z-20 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold flex items-center gap-1 shadow-sm">
            <span>📷 {currentIndex + 1}/{list.length}</span>
          </div>

          {/* Left Arrow */}
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center opacity-85 sm:opacity-0 sm:group-hover:opacity-100 transition shadow-sm cursor-pointer"
            aria-label="Previous photo"
          >
            <FiChevronLeft className="w-4 h-4" />
          </button>

          {/* Right Arrow */}
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center opacity-85 sm:opacity-0 sm:group-hover:opacity-100 transition shadow-sm cursor-pointer"
            aria-label="Next photo"
          >
            <FiChevronRight className="w-4 h-4" />
          </button>

          {/* Bottom Dots navigation */}
          <div className="absolute bottom-2.5 inset-x-0 z-20 flex justify-center items-center gap-1.5">
            {list.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => handleDotClick(idx, e)}
                className={`transition-all rounded-full cursor-pointer ${
                  idx === currentIndex
                    ? 'w-4 h-1.5 bg-white shadow-sm'
                    : 'w-1.5 h-1.5 bg-white/60 hover:bg-white'
                }`}
                aria-label={`Jump to slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ImageCarousel;

