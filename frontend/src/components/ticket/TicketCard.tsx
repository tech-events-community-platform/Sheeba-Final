import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import type { Ticket } from '../../types/ticket';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  Download,
  ShieldCheck,
  X,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Calendar,
  MapPin,
  Clock,
  User,
  Mail,
  RefreshCw,
} from 'lucide-react';
import { printTicketPass } from '../../utils/printTicket';

interface TicketCardProps {
  ticket: Ticket;
  onDownload?: () => void;
}

export const TicketCard: React.FC<TicketCardProps> = ({ ticket, onDownload }) => {
  const [isAttendeeBoxOpen, setIsAttendeeBoxOpen] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInDone, setCheckInDone] = useState(
    ticket.status === 'Checked in' || ticket.status === 'Used'
  );
  const { user } = useAuth();
  const navigate = useNavigate();

  const handlePrint = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    printTicketPass(`ticket-card-${ticket.id}`);
  };

  const verificationUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/verify-ticket?token=${encodeURIComponent(ticket.qrToken || ticket.id)}&code=${encodeURIComponent(ticket.ticketCode || '')}`
    : `/verify-ticket?token=${encodeURIComponent(ticket.qrToken || ticket.id)}`;
  const handleMarkAttended = async () => {
    setIsCheckingIn(true);
    try {
      await api.checkIn.markAttended({
        eventId: ticket.eventId,
        attendeeId: ticket.attendeeId,
        notes: 'Verified via Sheeba Ticket Pass',
      });
      setCheckInDone(true);
      setTimeout(() => {
        setIsAttendeeBoxOpen(false);
        navigate(`/profile/${ticket.attendeeId}`);
      }, 700);
    } catch (err: any) {
      alert(err.data?.message || err.message || 'Failed to mark attendance.');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const qrPayload = [
    `SHEEBA VERIFIED PASS`,
    `Attendee: ${ticket.attendeeName || 'Attendee'}`,
    ticket.attendeeEmail ? `Email: ${ticket.attendeeEmail}` : '',
    `Event: ${ticket.eventTitle || 'Tech Event'}`,
    `Code: ${ticket.ticketCode || ticket.id}`,
    `Status: ${ticket.status || 'Valid'}`,
    `Verify: ${verificationUrl}`,
  ].filter(Boolean).join('\n');
  // When scanned, gives the Attendee Name only (as explicitly requested)
  const qrAttendeeOnlyValue = ticket.attendeeName || 'Attendee';

  const isOrganizerOrAdmin =
    user?.role?.toUpperCase() === 'ORGANIZER' || user?.role?.toUpperCase() === 'ADMIN';

  return (
    <div className="max-w-md mx-auto w-full">
      {/* Container Ticket Card */}
      <div
        id={`ticket-card-${ticket.id}`}
        className="bg-white rounded-3xl shadow-md border border-[#E8DDD7] overflow-hidden relative"
      >
        {/* Top Header Brand */}
        <div className="bg-[#63474D] text-white p-6 text-center relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.webp"
                alt="Sheeba Logo"
                className="h-9 sm:h-10 w-auto object-contain shrink-0 drop-shadow-xs"
              />
              <span className="font-serif font-bold text-lg tracking-wider text-white">
                SHEEBA<span className="text-[#FFA686]">.</span>
              </span>
            </div>
            <Badge variant="success" icon={<ShieldCheck className="w-3 h-3" />}>
              {ticket.status}
              {checkInDone ? 'Attended' : ticket.status}
            </Badge>
          </div>
          <h2 className="font-serif text-2xl font-bold mb-1">{ticket.eventTitle}</h2>
          <p className="text-xs text-[#FFA686] font-medium tracking-wide">
            VERIFIED ATTENDANCE PASS
          </p>
        </div>

        {/* Ticket Details Body */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[#756366] block">ATTENDEE</span>
              <p className="font-bold text-sm text-[#2D1F23] mt-0.5">{ticket.attendeeName}</p>
            </div>
            <div>
              <span className="text-[#756366] block">TICKET CODE</span>
              <p className="font-mono font-bold text-sm text-[#2D1F23] mt-0.5">{ticket.ticketCode}</p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#E8DDD7] text-xs">
            <div className="flex items-center gap-2 text-[#756366]">
              <img src="/calendar.webp" alt="Date" className="w-4 h-4 object-contain flex-shrink-0" />
              <div>
                <p className="font-semibold text-[#2D1F23]">{ticket.eventDate}</p>
                <p className="text-[11px] text-[#756366]">{ticket.eventTime}</p>
              </div>
            </div>

            <div className="flex items-start gap-2 text-[#756366]">
              <img src="/location.webp" alt="Location" className="w-4 h-4 object-contain mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-[#2D1F23]">{ticket.eventLocation}</p>
              </div>
            </div>
          </div>

          {/* Ticket Tear Line Separator */}
          <div className="relative py-2 flex items-center justify-center">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full w-4 h-8 bg-[#FAF7F5] rounded-r-full border-r border-[#E8DDD7]"></div>
            <div className="w-full border-t-2 border-dashed border-[#E8DDD7]"></div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full w-4 h-8 bg-[#FAF7F5] rounded-l-full border-l border-[#E8DDD7]"></div>
          </div>

          {/* Dynamic QR Code Section (Clickable to open Attendee Information Box) */}
          <div className="text-center space-y-3 pt-2">
            <div
              onClick={() => setIsAttendeeBoxOpen(true)}
              title="Click QR Code to view Attendee Information"
              className="bg-[#FAF7F5] p-5 rounded-2xl border-2 border-[#D6A184]/50 inline-block shadow-inner w-full max-w-[280px] cursor-pointer hover:border-[#63474D] hover:shadow-md transition-all group"
            >
              <div className="bg-white p-3 rounded-xl border border-[#E8DDD7] inline-block shadow-xs group-hover:scale-105 transition-transform">
                <QRCodeSVG
                  value={qrAttendeeOnlyValue}
                  size={190}
                  bgColor="#ffffff"
                  fgColor="#63474D"
                  level="M"
                  includeMargin={false}
                />
              </div>

              {/* Click prompt badge */}
              <div className="mt-2.5 text-center">
                <span className="text-[11px] font-bold text-[#63474D] bg-[#63474D]/10 px-3 py-1 rounded-full inline-flex items-center gap-1.5 group-hover:bg-[#63474D] group-hover:text-white transition-colors">
                  <Sparkles className="w-3.5 h-3.5 text-[#FFA686]" />
                  Click QR for Attendee Box
                </span>
              </div>

              {/* Plain Text Attendee Details Beneath QR Code */}
              <div className="mt-3 pt-3 border-t border-[#E8DDD7] text-left space-y-1.5 bg-white p-3 rounded-xl border border-[#E8DDD7]/70">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#756366] block">Attendee Name</span>
                  <span className="font-bold text-xs text-[#2D1F23] block">{ticket.attendeeName || 'Registered Attendee'}</span>
                </div>
                {ticket.attendeeEmail && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#756366] block">Email</span>
                    <span className="text-[#63474D] font-medium text-xs block truncate">{ticket.attendeeEmail}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-[#FAF7F5]">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-[#756366] block">Pass Code</span>
                    <span className="font-mono font-bold text-[#63474D] text-xs">{ticket.ticketCode || 'SHB-PASS'}</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    Verified Pass
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-[#2A7B5F] font-semibold bg-[#2A7B5F]/10 py-2 px-4 rounded-xl border border-[#2A7B5F]/20">
              <img src="/tick.webp" alt="Valid" className="w-4 h-4 object-contain shrink-0" />
              <span>Scanning returns attendee name. Click QR for profile box.</span>
            </div>

            <p className="text-[11px] text-[#756366]">
              Displays attendee info and validates entry credentials.
            </p>
          </div>
        </div>

        {/* Card Footer actions */}
        <div className="bg-[#FAF7F5] px-6 py-4 border-t border-[#E8DDD7] flex items-center justify-between text-xs text-[#756366] no-print">
          <span className="flex items-center gap-1 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#63474D]" />
            Dynamic Signed Token Pass
            Verified Sheeba Pass
          </span>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1 text-[#63474D] hover:underline font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Print / Save Pass
          </button>
        </div>
      </div>

      {/* ATTRACTIVE ATTENDEE INFORMATION MODAL BOX (Opens on QR click) */}
      {isAttendeeBoxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className="bg-white rounded-3xl max-w-md w-full border border-[#E8DDD7] shadow-2xl overflow-hidden relative animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Brand Banner */}
            <div className="bg-gradient-to-br from-[#63474D] to-[#43272D] text-white p-6 text-center relative overflow-hidden">
              <button
                onClick={() => setIsAttendeeBoxOpen(false)}
                className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center justify-center gap-2 mb-3">
                <img src="/logo.webp" alt="Sheeba Logo" className="h-7 w-auto object-contain drop-shadow-xs" />
                <span className="font-serif font-bold text-sm tracking-wider text-white">
                  SHEEBA<span className="text-[#FFA686]">.</span> ATTENDEE PASS
                </span>
              </div>

              {/* Attendee Avatar Circle */}
              <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/60 mx-auto flex items-center justify-center font-serif text-3xl font-bold text-white shadow-inner mb-2">
                {ticket.attendeeName ? ticket.attendeeName.charAt(0).toUpperCase() : 'A'}
              </div>

              <h3 className="font-serif text-2xl font-bold text-white leading-tight">
                {ticket.attendeeName}
              </h3>
              <p className="text-xs text-[#FFA686] font-medium mt-0.5">
                {ticket.attendeeEmail}
              </p>
            </div>

            {/* Modal Body: Information Box */}
            <div className="p-6 space-y-4 bg-[#FAF7F5]">
              {/* Credentials Box */}
              <div className="p-4 bg-white rounded-2xl border border-[#E8DDD7] space-y-3 shadow-2xs">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-[#E8DDD7]">
                  <span className="text-[10px] uppercase font-bold text-[#756366]">Pass Number</span>
                  <span className="font-mono font-bold text-[#63474D] bg-[#FAF7F5] px-2.5 py-0.5 rounded-md border border-[#E8DDD7]">
                    {ticket.ticketCode || ticket.id}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] uppercase font-bold text-[#756366]">Entrance Status</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {checkInDone ? 'Attended • Verified' : 'Valid for Entry'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] uppercase font-bold text-[#756366]">Event</span>
                  <span className="font-bold text-[#2D1F23] truncate max-w-[210px]">{ticket.eventTitle}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] uppercase font-bold text-[#756366]">Date & Time</span>
                  <span className="text-[#2D1F23] font-medium">{ticket.eventDate} • {ticket.eventTime}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] uppercase font-bold text-[#756366]">Location</span>
                  <span className="text-[#756366] truncate max-w-[210px]">{ticket.eventLocation}</span>
                </div>
              </div>

              {/* Action Buttons: Mark as Attended + View Profile */}
              <div className="pt-2 space-y-2.5">
                {isOrganizerOrAdmin && !checkInDone && (
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={handleMarkAttended}
                    disabled={isCheckingIn}
                    className="bg-[#2A7B5F] hover:bg-[#20634c] text-white font-bold py-3 text-sm shadow-md cursor-pointer"
                    icon={isCheckingIn ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  >
                    {isCheckingIn ? 'Marking Attendance...' : '✓ Mark as Attended'}
                  </Button>
                )}

                <Link
                  to={`/profile/${ticket.attendeeId}`}
                  className="block w-full"
                  onClick={() => setIsAttendeeBoxOpen(false)}
                >
                  <Button
                    variant="outline"
                    fullWidth
                    className="border-[#63474D] text-[#63474D] hover:bg-[#63474D]/10 font-bold py-2.5 text-sm"
                    icon={<ExternalLink className="w-4 h-4" />}
                  >
                    View Attendee Profile
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => setIsAttendeeBoxOpen(false)}
                  className="border-gray-300 text-gray-700 hover:bg-black/5 text-xs py-2"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

