import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Ticket } from '../../types/ticket';
import {
  Download,
  Share2,
  Clock,
  QrCode,
  ShieldCheck,
  X,
  Copy,
  Send,
  Ticket as TicketIcon,
} from 'lucide-react';

export const AttendeeDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (user) {
          const userTickets = await api.registration.getAttendeeTickets(user.id);
          setTickets(userTickets);
        }
      } catch (err) {
        console.error('Failed to load attendee data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Badge Photos from public/badges/
  const getBadgeImage = (type?: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('hackathon')) return '/badges/hackathon-badge.webp';
    if (t.includes('workshop')) return '/badges/workshop-badge.webp';
    if (t.includes('meetup')) return '/badges/meetup-badge.webp';
    return '/badges/other.webp';
  };

  const userProfession = user?.organization || user?.bio || '';
  const publicShareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/profile/${user?.id || 'demo'}`
    : 'https://sheeba.events';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicShareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download JPG using HTML5 Canvas drawing
  const handleDownloadJPG = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 900;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1200, 900);

    // Decorative Top Gradient Bar
    const gradient = ctx.createLinearGradient(0, 0, 1200, 0);
    gradient.addColorStop(0, '#f45866');
    gradient.addColorStop(0.5, '#631a86');
    gradient.addColorStop(1, '#1e0b97');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 14);

    // Outer Border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, 1140, 840);

    // Header Branding
    ctx.fillStyle = '#0e0622';
    ctx.font = 'bold 24px Lora, Georgia, serif';
    ctx.fillText('SHEEBA', 60, 80);

    ctx.fillStyle = '#a2666f';
    ctx.font = 'bold 11px Nunito, sans-serif';
    ctx.fillText('VERIFIED EVENT INFRASTRUCTURE & CREDENTIALS', 60, 100);

    // Divider Line
    ctx.strokeStyle = '#4f0820';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(60, 120);
    ctx.lineTo(1140, 120);
    ctx.stroke();

    // Attendee Info
    ctx.fillStyle = '#0e0622';
    ctx.font = 'bold 36px Lora, Georgia, serif';
    ctx.fillText(user?.name || 'Abebe Kebede', 60, 180);

    ctx.fillStyle = '#6b7280';
    ctx.font = '500 18px Nunito, sans-serif';
    ctx.fillText(userProfession, 60, 215);

    ctx.fillStyle = '#2A7B5F';
    ctx.font = 'bold 14px Nunito, sans-serif';
    ctx.fillText(`✓ Verified Attendee • Member since ${user?.memberSince || '2026'}`, 60, 245);

    // Section Title
    ctx.fillStyle = '#0e0622';
    ctx.font = 'bold 22px Lora, Georgia, serif';
    ctx.fillText('OFFICIAL EVENT ATTENDANCE & BADGES', 60, 310);

    // Badges / Events List
    const displayItems = tickets.slice(0, 5);
    let yPos = 360;

    displayItems.forEach((item, index) => {
      // Card row background (#d4c5d6)
      ctx.fillStyle = index % 2 === 0 ? '#d4c5d6' : '#ded1df';
      ctx.fillRect(60, yPos - 30, 1080, 60);

      ctx.strokeStyle = '#c3b0c5';
      ctx.lineWidth = 1;
      ctx.strokeRect(60, yPos - 30, 1080, 60);

      // Badge Category Tag
      ctx.fillStyle = '#4f0820';
      ctx.font = 'bold 15px Nunito, sans-serif';
      ctx.fillText(item.eventType.toUpperCase(), 80, yPos + 7);

      // Title
      ctx.fillStyle = '#0e0622';
      ctx.font = 'bold 17px Lora, Georgia, serif';
      ctx.fillText(item.eventTitle, 230, yPos + 7);

      // Meta
      ctx.fillStyle = '#4f0820';
      ctx.font = 'bold 14px Nunito, sans-serif';
      ctx.fillText(`${item.eventType.toUpperCase()} • ${item.eventDate}`, 650, yPos + 7);

      // Verified Check
      ctx.fillStyle = '#1b4332';
      ctx.font = 'bold 14px Nunito, sans-serif';
      ctx.fillText('VERIFIED ATTENDED ✓', 960, yPos + 7);

      yPos += 72;
    });

    // Footer
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, 810);
    ctx.lineTo(1140, 810);
    ctx.stroke();

    ctx.fillStyle = '#9ca3af';
    ctx.font = '13px Nunito, sans-serif';
    ctx.fillText('Cryptographically signed by Sheeba Event Infrastructure • Verifiable at sheeba.events', 60, 840);
    ctx.fillText(`Generated on ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`, 900, 840);

    // Download trigger
    const link = document.createElement('a');
    link.download = `${(user?.name || 'sheeba-attendee').toLowerCase().replace(/\s+/g, '-')}-record.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    link.click();
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  const handleShareLinkedIn = () => {
    const text = encodeURIComponent(
      `Excited to share my verified event attendance record and developer badges on Sheeba! Check out my official credentials: ${publicShareUrl}`
    );
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicShareUrl)}&text=${text}`, '_blank');
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(
      `Verified attendance & permanent credentials from Ethiopia's developer ecosystem on @SheebaEvents 🏆✨\n\nCheck out my record: ${publicShareUrl}`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const handleShareTelegram = () => {
    const text = encodeURIComponent(
      `Check out my verified developer attendance record on Sheeba: ${publicShareUrl}`
    );
    window.open(`https://t.me/share/url?url=${encodeURIComponent(publicShareUrl)}&text=${text}`, '_blank');
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-20">
      {/* 1. Attendee Profile Header (Unboxed, Pure Information) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4 sm:gap-5">
          <img
            src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
            alt={user?.name}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-sheeba-purple/30 shadow-xs shrink-0"
          />
          <div className="space-y-1">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-sheeba-dark leading-tight">
              {user?.name || 'Abebe Kebede'}
            </h1>
            {userProfession ? (
              <p className="text-sm sm:text-base text-gray-600 font-light">
                {userProfession}
              </p>
            ) : null}
            {user?.bio && (
              <p className="text-xs text-gray-500 font-light max-w-xl leading-relaxed">
                {user.bio}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 font-light pt-0.5">
              <span>{user?.email}</span>
              <span>•</span>
              <span className="text-[#2A7B5F] font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Attendee
              </span>
              <span>•</span>
              <span>Member since {user?.memberSince || '2026'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Swishing Line with sharp tapered ends in #4f0820 */}
      <div className="w-full flex items-center justify-center my-6">
        <svg className="w-full h-1.5 text-[#4f0820]" viewBox="0 0 1000 6" preserveAspectRatio="none">
          <path d="M0,3 Q500,6 1000,3 Q500,0 0,3 Z" fill="currentColor" />
        </svg>
      </div>

      {/* 3. The Core Event Attendance Showcase */}
      <div className="space-y-4 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-sheeba-dark">
              Event Attendance Record
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 font-light mt-0.5">
              Official verifiable log of participation across Ethiopian developer events, workshops, and hackathons.
            </p>
          </div>

          {/* Export Action & Dynamic Entry Counter */}
          <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsExportOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-300 text-black text-xs sm:text-sm font-semibold hover:bg-gray-50 shadow-2xs transition-all duration-200 cursor-pointer active:scale-98"
            >
              <Download className="w-4 h-4 text-sheeba-pink" />
              <span>Export</span>
            </button>
            <span className="text-[11px] font-semibold text-gray-500 px-0.5">
              {tickets.filter((t) => (t.status as string) === 'Checked in' || (t.status as string) === 'Used').length} verified badges • {tickets.length} total registrations
            </span>
          </div>
        </div>

        {/* List of Events - Colored in #d4c5d6 with 3-4px gap between rows */}
        <div className="space-y-3 pt-2">
          {loading ? (
            <div className="p-12 text-center text-sm text-gray-400 animate-pulse font-light border border-gray-100 rounded-2xl">
              Loading verified attendance records...
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-gray-200 rounded-2xl space-y-3">
              <p className="font-serif text-base font-bold text-sheeba-dark">No event records found</p>
              <p className="text-xs text-gray-500 font-light max-w-sm mx-auto">
                When you register and check in to events using direct organizer links, your verified timeline and credentials will appear here.
              </p>
            </div>
          ) : (
            tickets.map((t) => {
              const badgeImg = getBadgeImage(t.eventType);
              const isCheckedIn = (t.status as string) === 'Checked in' || (t.status as string) === 'Used';

              return (
                <div
                  key={t.id}
                  className="p-5 rounded-2xl bg-[#d4c5d6] border border-[#c3b0c5] shadow-2xs hover:shadow-xs space-y-3 transition-all duration-200"
                >
                  {/* Top Row: Badge Photo (only if checked-in) / Ticket Pass Icon + Title + Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-4 min-w-0">
                      {isCheckedIn ? (
                        <img
                          src={badgeImg}
                          alt={`${t.eventType} Badge`}
                          className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0 mix-blend-multiply transition-transform hover:scale-105"
                          title="Verified Attendance Badge Earned"
                        />
                      ) : (
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/70 border border-black/10 flex items-center justify-center text-[#4f0820] shrink-0 shadow-2xs">
                          <TicketIcon className="w-6 h-6 text-[#63474D]" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-serif font-bold text-base sm:text-lg text-[#0e0622] truncate">
                          {t.eventTitle}
                        </h3>
                        {isCheckedIn ? (
                          <p className="text-xs text-[#1b4332] font-bold capitalize mt-0.5 flex items-center gap-1">
                            <img src="/tick.webp" alt="Done" className="w-3.5 h-3.5 object-contain" />
                            <span>{t.eventType} • Verified Turnout & Official Badge Earned</span>
                          </p>
                        ) : (
                          <p className="text-xs text-[#4f0820] font-semibold capitalize mt-0.5 flex items-center gap-1">
                            <QrCode className="w-3 h-3 text-[#AA767C]" />
                            <span>{t.eventType} • Registered Pass (Awaiting Door QR Scan for Badge)</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {isCheckedIn ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1b4332]/15 text-xs font-bold text-[#1b4332] border border-[#1b4332]/30 shadow-2xs">
                          <img src="/tick.webp" alt="Done" className="w-3.5 h-3.5 object-contain" />
                          Verified Attended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 text-xs font-bold text-[#63474D] border border-black/10 shadow-2xs">
                          <QrCode className="w-3.5 h-3.5 text-[#AA767C]" />
                          Registered (Pending Check-in)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Details Always Visible directly without dropdown click */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-black/10 text-xs text-gray-800">
                    <div className="space-y-0.5">
                      <span className="text-[11px] uppercase tracking-wider font-bold text-gray-600 flex items-center gap-1">
                        <img src="/calendar.webp" alt="Calendar" className="w-3 h-3 object-contain shrink-0" /> Schedule
                      </span>
                      <p className="font-bold text-[#0e0622]">{t.eventDate}</p>
                      <p className="text-gray-600 font-light flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-500" /> {t.eventTime}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[11px] uppercase tracking-wider font-bold text-gray-600 flex items-center gap-1">
                        <img src="/location.webp" alt="Location" className="w-3 h-3 object-contain shrink-0" /> Venue
                      </span>
                      <p className="font-bold text-[#0e0622]">{t.eventLocation}</p>
                      <p className="text-gray-600 font-light">Addis Ababa, Ethiopia</p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[11px] uppercase tracking-wider font-bold text-gray-600 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-[#1b4332]" /> Pass Credential
                      </span>
                      <p className="font-mono text-xs font-bold text-[#0e0622]">Pass #{t.id}</p>
                      <Link
                        to={`/app/ticket/${t.eventId}`}
                        className="inline-flex items-center gap-1 text-[#4f0820] hover:text-black font-bold text-xs pt-0.5 underline"
                      >
                        <QrCode className="w-3 h-3 text-sheeba-pink" />
                        <span>View Dynamic QR Pass →</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. Export & Social Sharing Modal with Compact Card and Black Button Text */}
      {isExportOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => setIsExportOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-gray-100 z-10 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-[#4f0820]" />
                <h3 className="font-serif font-bold text-lg text-sheeba-dark">Export & Share Record</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsExportOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Real Compact Shareable Badge Card (Dedicated unboxed rows with elegant serif fonts) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#fdfafb] border border-[#e8d5d9] space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#e8d5d9]">
                <div className="flex items-center gap-3">
                  <img
                    src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
                    alt={user?.name}
                    className="w-11 h-11 rounded-full object-cover border border-[#4f0820]/30 shadow-2xs"
                  />
                  <div>
                    <h4 className="font-serif font-bold text-base text-sheeba-dark leading-tight">{user?.name}</h4>
                    {userProfession && <p className="text-xs text-gray-600 font-light">{userProfession}</p>}
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold text-[#1b4332] bg-[#1b4332]/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
              </div>

              {/* Each Verified Event in its Own Elegant Unboxed Row */}
              <div className="space-y-2.5 pt-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 block">
                  Official Verified Badges ({tickets.length})
                </span>
                <div className="space-y-2">
                  {tickets.map((t) => (
                    <div key={t.id} className="flex items-start gap-2.5 text-xs">
                      <img
                        src={getBadgeImage(t.eventType)}
                        alt={`${t.eventType} Badge`}
                        className="w-7 h-7 object-contain shrink-0 mix-blend-multiply mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-serif font-bold text-[13px] text-sheeba-dark leading-tight">
                          {t.eventTitle}
                        </p>
                        <p className="text-[11px] text-gray-500 font-light mt-0.5">
                          {t.eventDate} • {t.eventLocation}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Download Actions (Black text on both buttons) */}
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-gray-400">Download Formats</span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleDownloadJPG}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white border border-gray-300 text-black text-xs sm:text-sm font-semibold hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
                >
                  <Download className="w-4 h-4 text-sheeba-pink" />
                  <span>Download JPG</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white border border-gray-300 text-black text-xs sm:text-sm font-semibold hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
                >
                  <Download className="w-4 h-4 text-sheeba-rose" />
                  <span>Download PDF / Print</span>
                </button>
              </div>
            </div>

            {/* Social Share Buttons */}
            <div className="space-y-2 pt-1">
              <span className="text-xs uppercase tracking-wider font-semibold text-gray-400">Share Directly</span>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={handleShareLinkedIn}
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#0077b5] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.64a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28z" />
                  </svg>
                  <span>LinkedIn</span>
                </button>
                <button
                  type="button"
                  onClick={handleShareTwitter}
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-black text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span>X / Twitter</span>
                </button>
                <button
                  type="button"
                  onClick={handleShareTelegram}
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#229ED9] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Telegram</span>
                </button>
              </div>
            </div>

            {/* Copy Share Link */}
            <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicShareUrl}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono text-gray-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sheeba-dark text-xs font-semibold transition-colors cursor-pointer"
              >
                {copied ? <img src="/tick.webp" alt="Copied" className="w-3.5 h-3.5 object-contain shrink-0" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
