import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Store } from 'lucide-react';

interface EventPublicExhibitorsSectionProps {
  eventId: string;
}

export const EventPublicExhibitorsSection: React.FC<EventPublicExhibitorsSectionProps> = ({ eventId }) => {
  const [exhibitors, setExhibitors] = useState<Array<{
    id: string;
    businessName: string;
    category: string | null;
    showcaseDescription: string | null;
    spaceSqm: number;
    boothNumber: string | null;
    logoUrl: string | null;
    websiteUrl: string | null;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.exhibitors
      .getPublicExhibitors(eventId)
      .then((data) => {
        if (mounted) setExhibitors(data || []);
      })
      .catch(() => {
        if (mounted) setExhibitors([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [eventId]);

  if (loading || exhibitors.length === 0) {
    return null;
  }

  return (
    <div className="pt-2 animate-fade-in">
      <div className="rounded-2xl overflow-hidden border border-white/25 shadow-sm max-w-3xl">
        <div className="bg-[#63474D] px-6 py-3.5 rounded-t-2xl flex items-center justify-between">
          <h2 className="font-serif font-bold text-base sm:text-lg text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-white/90" />
            <span>Featured Exhibitors & Vendors</span>
          </h2>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
            {exhibitors.length} Confirmed
          </span>
        </div>
        <div className="bg-white/25 backdrop-blur-md p-6 border-x border-b border-white/25 rounded-b-2xl space-y-4">
          <p className="text-xs text-black/80 font-medium">
            Visit these exhibitors and vendors at their physical booths during the event:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {exhibitors.map((ex) => (
              <div
                key={ex.id}
                className="p-4 bg-white/70 backdrop-blur-sm border border-white/40 rounded-2xl shadow-2xs space-y-2 hover:bg-white/90 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {ex.logoUrl ? (
                      <img
                        src={ex.logoUrl}
                        alt={ex.businessName}
                        className="w-9 h-9 rounded-xl object-contain bg-white border border-gray-100 p-0.5 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-[#63474D]/15 text-[#63474D] font-bold text-sm flex items-center justify-center shrink-0">
                        {ex.businessName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-[#2D1F23] truncate">
                        {ex.businessName}
                      </h4>
                      {ex.category && (
                        <span className="text-[10px] font-semibold text-[#63474D] block">
                          {ex.category}
                        </span>
                      )}
                    </div>
                  </div>
                  {ex.boothNumber && (
                    <span className="px-2 py-0.5 rounded-lg bg-[#FAF7F5] border border-gray-200 font-mono text-[10px] font-bold text-[#63474D] shrink-0">
                      Booth {ex.boothNumber}
                    </span>
                  )}
                </div>
                {ex.showcaseDescription && (
                  <p className="text-[11px] text-gray-700 leading-relaxed line-clamp-2">
                    {ex.showcaseDescription}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

