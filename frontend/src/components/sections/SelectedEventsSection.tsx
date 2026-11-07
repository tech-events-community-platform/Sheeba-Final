import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import FadeIn from '../FadeIn';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';

interface PortfolioEvent {
  image: string;
  images?: string[];
  category: string;
  title: string;
  description: string;
  imagePosition?: string;
}

const FEATURED_EVENTS: PortfolioEvent[] = [
  {
    image: '/mint.png',
    images: ['/mint.png'],
    category: 'INSTITUTIONAL EVENTS',
    title: 'MINT',
    description:
      'Organizing the celebration of MINT’s 50 year milestone, bringing people together to mark five decades of achievement.',
    imagePosition: 'object-[center_42%]',
  },
  {
    image: '/hackathon.png',
    images: ['/hackathon.png'],
    category: 'TECHNOLOGY & INNOVATION',
    title: 'IS Hub × Vision Vertex',
    description:
      'A hackathon bringing university students together to design and build innovative agentic AI solutions.',
    imagePosition: 'object-center',
  },
  {
    image: '/entena.png',
    images: ['/entena.png'],
    category: 'COMMUNITY & SOCIAL IMPACT',
    title: 'Her Space',
    description:
      'A monthly fundraising social gathering initiative supporting homeless children and women.',
    imagePosition: 'object-[center_65%]',
  },
];

export const SelectedEventsSection: React.FC = () => {
  const [activeEvent, setActiveEvent] = useState<PortfolioEvent | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const triggerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const activeEventImages = activeEvent?.images && activeEvent.images.length > 0
    ? activeEvent.images
    : activeEvent
    ? [activeEvent.image]
    : [];

  const hasMultipleImages = activeEventImages.length > 1;

  const openLightbox = (event: PortfolioEvent, imageIndex = 0, eventTarget?: HTMLElement) => {
    triggerRef.current = eventTarget || (document.activeElement as HTMLElement);
    setActiveEvent(event);
    setActiveImageIndex(imageIndex);
  };

  const closeLightbox = useCallback(() => {
    setActiveEvent(null);
    setActiveImageIndex(0);
    // Restore focus to triggering element
    if (triggerRef.current) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, []);

  const goToNext = useCallback(() => {
    if (activeEventImages.length <= 1) return;
    setActiveImageIndex((prev) => (prev + 1) % activeEventImages.length);
  }, [activeEventImages.length]);

  const goToPrev = useCallback(() => {
    if (activeEventImages.length <= 1) return;
    setActiveImageIndex((prev) => (prev - 1 + activeEventImages.length) % activeEventImages.length);
  }, [activeEventImages.length]);

  // Lock background scroll and handle keyboard events
  useEffect(() => {
    if (!activeEvent) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus close button on open
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeLightbox();
      } else if (e.key === 'ArrowRight' && hasMultipleImages) {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'ArrowLeft' && hasMultipleImages) {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'Tab') {
        // Simple focus trap inside lightbox
        const focusable = document.querySelectorAll<HTMLElement>(
          '#lightbox-dialog button:not([disabled]), #lightbox-dialog [tabindex="0"]'
        );
        if (focusable.length > 0) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeEvent, hasMultipleImages, goToNext, goToPrev, closeLightbox]);

  return (
    <section
      id="selected-events"
      aria-labelledby="selected-events-heading"
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-14 scroll-mt-28"
    >
      {/* Section Header */}
      <FadeIn direction="up">
        <div className="text-center space-y-3.5 max-w-2xl mx-auto">
          {/* <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#63474D]/10 text-[#63474D] text-xs font-bold uppercase tracking-wider">
            <span>SELECTED WORK</span>
          </div> */}
          <h2
            id="selected-events-heading"
            className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2D1F23] tracking-tight"
          >
            Events We&apos;ve Brought to Life
          </h2>
          <p className="text-sm sm:text-base text-[#2D1F23]/80 leading-relaxed font-medium">
            From institutional milestones to community initiatives and emerging technology, we help bring meaningful events to life through thoughtful organization and execution.
          </p>
        </div>
      </FadeIn>

      {/* 3-Column Editorial Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {FEATURED_EVENTS.map((event, index) => (
          <FadeIn
            key={event.title}
            direction="up"
            delay={index * 120}
            className={`h-full ${
              index === 2
                ? 'md:col-span-2 md:max-w-md md:mx-auto lg:col-span-1 lg:max-w-none w-full'
                : 'w-full'
            }`}
          >
            <article className="group flex flex-col h-full bg-white rounded-2xl sm:rounded-3xl border border-[#E8DDD7] overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 ease-out hover:-translate-y-1 motion-reduce:hover:translate-y-0 motion-reduce:transition-none">
              {/* Event Photograph with Accessible Zoom Trigger */}
              <button
                type="button"
                onClick={(e) => openLightbox(event, 0, e.currentTarget)}
                aria-haspopup="dialog"
                aria-label={`View photo of ${event.title}`}
                className="relative w-full aspect-[4/3] overflow-hidden bg-[#2D1F23]/5 cursor-zoom-in group/img text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#63474D] focus-visible:ring-offset-2"
              >
                <img
                  src={event.image}
                  alt={`Photograph from ${event.title}`}
                  loading="lazy"
                  decoding="async"
                  className={`w-full h-full object-cover ${event.imagePosition} group-hover:scale-105 group-focus/img:scale-105 transition-transform duration-500 ease-out motion-reduce:transform-none`}
                />
                {/* Subtle refined zoom indicator on hover/focus */}
                <div className="absolute inset-0 bg-[#2D1F23]/15 opacity-0 group-hover/img:opacity-100 group-focus/img:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-medium shadow-sm transform translate-y-1 group-hover/img:translate-y-0 group-focus/img:translate-y-0 transition-transform duration-300 motion-reduce:transform-none">
                    <ZoomIn className="w-3.5 h-3.5 text-white/90" />
                    <span>View Photo</span>
                  </span>
                </div>
              </button>

              {/* Event Details */}
              <div className="flex flex-col flex-1 p-6 sm:p-7">
                <span className="text-[11px] font-bold tracking-wider uppercase text-[#a2666f] mb-2">
                  {event.category}
                </span>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#2D1F23] tracking-tight leading-snug mb-3">
                  {event.title}
                </h3>
                <p className="font-sans text-sm text-gray-700 leading-relaxed font-normal flex-1">
                  {event.description}
                </p>
              </div>
            </article>
          </FadeIn>
        ))}
      </div>

      {/* Lightbox Modal rendered via Portal */}
      {activeEvent &&
        createPortal(
          <div
            id="lightbox-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lightbox-title"
            aria-describedby="lightbox-description"
            onClick={(e) => {
              // Close only when clicking outside dialog content
              if (e.target === e.currentTarget) {
                closeLightbox();
              }
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/85 backdrop-blur-md transition-opacity duration-300"
          >
            <div
              id="lightbox-dialog"
              className="relative max-w-5xl w-full max-h-[92vh] flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200 motion-reduce:animate-none"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeLightbox}
                aria-label="Close image preview"
                className="absolute -top-11 right-0 sm:-top-12 sm:right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 cursor-pointer z-20"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Lightbox Image Container */}
              <div className="relative flex items-center justify-center w-full max-h-[72vh] sm:max-h-[78vh] overflow-hidden rounded-xl sm:rounded-2xl bg-black/40 shadow-2xl">
                <img
                  src={activeEventImages[activeImageIndex]}
                  alt={`${activeEvent.title} - photo ${activeImageIndex + 1}`}
                  className="max-h-[72vh] sm:max-h-[78vh] w-auto max-w-full object-contain rounded-lg select-none"
                />

                {/* Gallery Previous Button - only when multiple images exist */}
                {hasMultipleImages && (
                  <button
                    type="button"
                    onClick={goToPrev}
                    aria-label="Previous photograph"
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 z-10"
                  >
                    <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                )}

                {/* Gallery Next Button - only when multiple images exist */}
                {hasMultipleImages && (
                  <button
                    type="button"
                    onClick={goToNext}
                    aria-label="Next photograph"
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 z-10"
                  >
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                )}
              </div>

              {/* Refined Caption & Context Bar */}
              <div className="w-full mt-3 px-1 sm:px-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-white">
                <div>
                  <span className="text-[10px] sm:text-xs font-semibold tracking-wider uppercase text-[#f49390] block">
                    {activeEvent.category}
                  </span>
                  <h4
                    id="lightbox-title"
                    className="font-serif text-base sm:text-lg font-bold text-white tracking-tight"
                  >
                    {activeEvent.title}
                  </h4>
                </div>

                <div className="flex items-center gap-3">
                  <p
                    id="lightbox-description"
                    className="text-xs text-white/75 line-clamp-1 max-w-md hidden md:block"
                  >
                    {activeEvent.description}
                  </p>

                  {/* Image Counter - only when multiple images exist */}
                  {hasMultipleImages && (
                    <span className="text-xs font-medium text-white/90 bg-white/10 px-2.5 py-1 rounded-full backdrop-blur-md shrink-0">
                      {activeImageIndex + 1} / {activeEventImages.length}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
};
