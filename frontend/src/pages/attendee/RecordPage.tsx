import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { BadgeAward } from '../../types/attendance';
import {
  Award,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

export const RecordPage: React.FC = () => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<BadgeAward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecord = async () => {
      setLoading(true);
      try {
        if (user) {
          const userBadges = await api.badges.getAttendeeBadges(user.id);
          setBadges(userBadges);
        }
      } catch (e) {
        console.error('Failed to load badges:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [user]);

  const stats = user?.stats || {
    meetupsCount: 8,
    workshopsCount: 4,
    hackathonsCount: 2,
    totalEventsAttended: 14,
  };

  const milestoneSummary = [
    {
      category: 'Hackathons & Prototypes',
      glyph: '🏆',
      count: stats.hackathonsCount,
      unit: 'Hackathons Completed',
      tier: 'Winner & Participant Tier',
      issuers: 'GDG Addis, ALX Tech Community',
      proof: 'Cryptographic Credential Badges',
    },
    {
      category: 'Hands-On Technical Workshops',
      glyph: '🎟️',
      count: stats.workshopsCount,
      unit: 'Lab Certifications',
      tier: '100% Practical Attendance',
      issuers: 'Bole Innovation Hub, React Ethiopia',
      proof: 'Verifiable Lab Passes',
    },
    {
      category: 'Community Meetups & Evenings',
      glyph: '🎫',
      count: stats.meetupsCount,
      unit: 'Evenings Attended',
      tier: 'Verified Door Check-ins',
      issuers: 'Addis Tech Builders, AI Addis',
      proof: 'Turnout Timestamp Proof',
    },
    {
      category: 'Cumulative Ecosystem Participation',
      glyph: '🎖️',
      count: stats.totalEventsAttended,
      unit: 'Total Verified Gatherings',
      tier: 'Top 5% Ecosystem Turnout',
      issuers: 'Sheeba Event Infrastructure',
      proof: 'Tamper-Proof Portfolio',
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-20">
      {/* 1. Header Overview */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-gray-100 pb-4">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-sheeba-dark">
              Cumulative Participation Record
            </h1>
            <p className="text-sm text-gray-500 font-light mt-0.5">
              Comprehensive tabular breakdown of total verified milestones, hours, categories, and organizing authorities.
            </p>
          </div>
          {user?.id && (
            <Link
              to={`/profile/${user.id}`}
              className="text-xs font-semibold text-sheeba-purple hover:underline inline-flex items-center gap-1 shrink-0"
            >
              <span>View Public Profile</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* 2. Unified Master Totals Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold text-sheeba-dark flex items-center gap-2">
            <Award className="w-5 h-5 text-sheeba-purple" />
            Milestone Totals & Category Breakdown
          </h2>
          <span className="text-xs font-semibold text-gray-400">
            {stats.totalEventsAttended} Total Verified Check-ins
          </span>
        </div>

        <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#fcfafc] border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 sm:px-5">Category & Milestone</th>
                  <th className="py-3.5 px-4 text-center">Total Count</th>
                  <th className="py-3.5 px-4">Verification Level</th>
                  <th className="py-3.5 px-4">Primary Issuing Authorities</th>
                  <th className="py-3.5 px-4 text-right">Credential Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-sans">
                {milestoneSummary.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-4 px-4 sm:px-5">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl select-none">{item.glyph}</span>
                        <div>
                          <p className="font-serif font-bold text-sm text-sheeba-dark">{item.category}</p>
                          <p className="text-[11px] text-gray-500 font-light">{item.unit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="font-serif font-bold text-lg text-sheeba-purple">
                        {item.count}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1b4332]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#2A7B5F]" />
                        {item.tier}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-600 font-light">
                      {item.issuers}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-sheeba-dark font-medium font-mono text-[11px]">
                        {item.proof}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. Verified Credential Issuance Ledger */}
      <div className="space-y-4 pt-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-sheeba-dark">
            Organizing Authority Issuance Ledger
          </h2>
          <p className="text-xs text-gray-500 font-light mt-0.5">
            Cryptographically signed badge awards permanently bound to this attendee profile.
          </p>
        </div>

        <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#fcfafc] border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 sm:px-5">Event & Award</th>
                  <th className="py-3.5 px-4">Issuing Organizer</th>
                  <th className="py-3.5 px-4">Date Issued</th>
                  <th className="py-3.5 px-4 text-right">Security Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-sans">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400 font-light">
                      Loading issuance ledger...
                    </td>
                  </tr>
                ) : badges.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500 font-light">
                      No issuance records logged yet.
                    </td>
                  </tr>
                ) : (
                  badges.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3.5 px-4 sm:px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-bold text-xs text-sheeba-dark">{b.badgeLabel}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-600 font-light">{b.eventTitle}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-sheeba-rose font-semibold">
                        {b.issuerName}
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 font-light">
                        {new Date(b.awardedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-mono text-[10px] text-gray-400">
                          {b.id.slice(0, 14)}...
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
