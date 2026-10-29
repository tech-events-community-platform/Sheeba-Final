import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SlideItem {
  id: string;
  posterUrl: string;
  title: string;
  description: string;
}

const TRUSTED_SLIDES: SlideItem[] = [
  {
    id: 'stride-mint',
    posterUrl: '/stride-poster.jpg',
    title: 'STRIDE Ethiopia 2.0 Summit (Hosted by MInT)',
    description:
      "Ethiopia's Ministry of Innovation and Technology (MInT) chose Sheeba for official event infrastructure and live QR door check-ins at STRIDE 2.0.",
  },
  {
    id: 'tech-ai-summit',
    posterUrl: '/trusted-demo-1.jpg',
    title: 'National Tech & AI Summit (Hosted by Ethiopian Innovation Hub)',
    description:
      'Admitted over 3,500 attendees and developers with seamless sub-second door check-ins and verified participation badges.',
  },
  {
    id: 'fintech-forum',
    posterUrl: '/trusted-demo-2.jpg',
    title: 'Addis Business & FinTech Forum (Hosted by FinTech Leaders)',
    description:
      'Enterprise exhibition showcases and turnout analytics trusted by leading financial and corporate institutions.',
  },
];

interface StrideMilestoneCardProps {
  className?: string;
  compact?: boolean;
}

export const StrideMilestoneCard: React.FC<StrideMilestoneCardProps> = ({
  className = '',
  compact = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % TRUSTED_SLIDES.length);
    }, 4500);

    return () => clearInterval(interval);
  }, [isPaused]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + TRUSTED_SLIDES.length) % TRUSTED_SLIDES.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % TRUSTED_SLIDES.length);
  };

  if (compact) {
    const slide = TRUSTED_SLIDES[currentIndex];
    return (
      <div
        className={`bg-gradient-to-r from-white via-[#FAF7F5] to-[#F4EFEB] rounded-2xl border border-[#E8DDD7] p-4 sm:p-5 shadow-xs relative overflow-hidden ${className}`}
      >
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-full sm:w-44 shrink-0 rounded-xl overflow-hidden border border-[#E8DDD7] shadow-xs bg-[#24171A]">
            <img
              src={slide.posterUrl}
              alt={slide.title}
              className="w-full h-auto aspect-[1280/589] object-contain block"
              loading="lazy"
            />
          </div>
          <div className="space-y-1 flex-1 min-w-0 w-full">
            <h4 className="font-serif text-base font-bold text-[#2D1F23]">
              {slide.title}
            </h4>
            <p className="text-xs text-gray-700 leading-relaxed font-normal">
              {slide.description}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Section Title: Large, dark font like rest of section titles, no pill or orange bullet */}
      <div className="text-center">
        <h2 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#2D1F23] tracking-tight">
          Trusted by
        </h2>
      </div>

      {/* Big Rectangle Container with Horizontal Carousel */}
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="group relative rounded-3xl overflow-hidden border border-[#E8DDD7] shadow-lg bg-[#1e1416] min-h-[340px] sm:min-h-[400px]"
      >
        {/* Horizontal Sliding Track */}
        <div
          className="flex transition-transform duration-700 ease-out h-full"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {TRUSTED_SLIDES.map((slide) => (
            <div
              key={slide.id}
              className="w-full shrink-0 relative min-h-[340px] sm:min-h-[400px] flex items-end justify-end overflow-hidden"
            >
              {/* Poster Image: Unobstructed and clear */}
              <img
                src={slide.posterUrl}
                alt={slide.title}
                className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
              />

              {/* Gentle bottom-only fade so the picture is fully visible without excess black shadow */}
              <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

              {/* Title & Description in bottom right corner (where underlined in yellow) */}
              <div className="relative z-10 p-6 sm:p-8 max-w-xl text-left ml-auto space-y-1.5 pb-8 sm:pb-9">
                <h3 className="font-serif text-lg sm:text-xl font-bold text-white tracking-tight leading-snug drop-shadow-md">
                  {slide.title}
                </h3>

                <p className="font-sans text-xs sm:text-sm text-white/95 leading-relaxed font-normal drop-shadow-sm">
                  {slide.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Small Left Arrow */}
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Previous slide"
          className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/45 hover:bg-black/75 backdrop-blur-md text-white flex items-center justify-center transition-all cursor-pointer border border-white/20 shadow-md hover:scale-105"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Small Right Arrow */}
        <button
          type="button"
          onClick={handleNext}
          aria-label="Next slide"
          className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/45 hover:bg-black/75 backdrop-blur-md text-white flex items-center justify-center transition-all cursor-pointer border border-white/20 shadow-md hover:scale-105"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Dot Indicators */}
        <div className="absolute bottom-3 left-6 sm:left-8 z-20 flex items-center gap-1.5">
          {TRUSTED_SLIDES.map((slide, idx) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                currentIndex === idx
                  ? 'w-7 bg-white'
                  : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
