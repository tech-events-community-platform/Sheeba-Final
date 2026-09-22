import React from 'react';
import { useLocation } from 'react-router-dom';
import { LinkedInIcon, XIcon, TikTokIcon } from '../ui/SocialIcons';

export const Footer: React.FC = () => {
  const location = useLocation();
  const isExternalRegistration =
    location.pathname.startsWith('/e/') ||
    (location.pathname.startsWith('/events/') && location.pathname.includes('/register'));

  return (
    <footer className="w-full py-8 mt-auto bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm">
          {/* Left: Brand Copyright */}
          <p
            className={`font-semibold tracking-wide text-center sm:text-left ${
              isExternalRegistration ? 'text-white' : 'text-[#2D1F23]'
            }`}
          >
            © 2026 Sheeba.
          </p>

          {/* Middle: Rights & Location */}
          <p
            className={`font-medium tracking-wide text-center ${
              isExternalRegistration ? 'text-white/80' : 'text-[#756366]'
            }`}
          >
            All rights reserved. Addis Ababa, Ethiopia.
          </p>

          {/* Right: Social media icons (LinkedIn, X, TikTok) */}
          <div className="flex items-center justify-center sm:justify-end gap-5 shrink-0">
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isExternalRegistration
                  ? 'text-white hover:text-white/80 hover:bg-white/10'
                  : 'text-[#2D1F23] hover:text-[#63474D] hover:bg-[#63474D]/10'
              }`}
              title="LinkedIn"
              aria-label="LinkedIn"
            >
              <LinkedInIcon className="w-4 h-4" />
            </a>

            <a
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isExternalRegistration
                  ? 'text-white hover:text-white/80 hover:bg-white/10'
                  : 'text-[#2D1F23] hover:text-[#63474D] hover:bg-[#63474D]/10'
              }`}
              title="X (Twitter)"
              aria-label="X"
            >
              <XIcon className="w-4 h-4" />
            </a>

            <a
              href="https://tiktok.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isExternalRegistration
                  ? 'text-white hover:text-white/80 hover:bg-white/10'
                  : 'text-[#2D1F23] hover:text-[#63474D] hover:bg-[#63474D]/10'
              }`}
              title="TikTok"
              aria-label="TikTok"
            >
              <TikTokIcon className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
