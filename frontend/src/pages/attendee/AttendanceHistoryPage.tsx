import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { BadgeAward } from '../../types/attendance';
import { Badge } from '../../components/ui/Badge';
import { Award, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AttendanceHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<BadgeAward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      if (user) {
        const data = await api.badges.getAttendeeBadges(user.id);
        setBadges(data);
      }
      setLoading(false);
    };
    fetchHistory();
  }, [user]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-16">
      <Link
        to="/app/profile"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-sheeba-purple hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Profile
      </Link>

      {/* Header */}
      <div className="space-y-1">
        <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-sheeba-dark">
          Verified Attendance Timeline
        </h1>
        <p className="text-xs text-gray-500 font-light leading-relaxed">
          Official attendance entries verified at the door and credentialed by community organizers.
        </p>
      </div>

      {/* Timeline list */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl"></div>
          ))}
        </div>
      ) : badges.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-gray-200 space-y-2">
          <p className="font-serif text-sm font-bold text-sheeba-dark">No verified participation records yet.</p>
          <p className="text-xs text-gray-500 font-light">
            Your attendance will appear here automatically when you check in at an event door scanner.
          </p>
        </div>
      ) : (
        <div className="relative pl-6 border-l-2 border-sheeba-rose/40 space-y-6 pt-2">
          {badges.map((record) => (
            <div key={record.id} className="relative group">
              <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-sheeba-purple border-2 border-white ring-4 ring-sheeba-purple/20"></div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-3 hover:border-sheeba-purple transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    variant={
                      record.badgeCode === 'winner'
                        ? 'accent'
                        : record.badgeCode === 'speaker'
                        ? 'tertiary'
                        : record.badgeCode === 'participant'
                        ? 'secondary'
                        : 'primary'
                    }
                    icon={<Award className="w-3.5 h-3.5" />}
                  >
                    {record.badgeLabel}
                  </Badge>
                  <span className="text-[10px] font-mono text-gray-400">
                    Awarded: {new Date(record.awardedAt).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <h3 className="font-serif font-bold text-base text-sheeba-dark">{record.eventTitle}</h3>
                  <p className="text-xs text-sheeba-rose font-semibold mt-0.5">
                    Given by {record.issuerName}
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-light">
                  <span className="flex items-center gap-1">
                    <img src="/calendar.webp" alt="Calendar" className="w-3.5 h-3.5 object-contain shrink-0" />
                    Event Date: {record.eventDate}
                  </span>
                  <span className="flex items-center gap-1">
                    <img src="/location.webp" alt="Location" className="w-3.5 h-3.5 object-contain shrink-0" />
                    {record.eventLocation.split(',')[0]}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
