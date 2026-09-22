import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { Ticket } from '../../types/ticket';
import { Badge } from '../ui/Badge';
import { Download, ShieldCheck } from 'lucide-react';
import { printTicketPass } from '../../utils/printTicket';

interface TicketCardProps {
  ticket: Ticket;
  onDownload?: () => void;
}

export const TicketCard: React.FC<TicketCardProps> = ({ ticket, onDownload }) => {
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

  const qrPayload = [
    `SHEEBA VERIFIED PASS`,
    `Attendee: ${ticket.attendeeName || 'Attendee'}`,
    ticket.attendeeEmail ? `Email: ${ticket.attendeeEmail}` : '',
    `Event: ${ticket.eventTitle || 'Tech Event'}`,
    `Code: ${ticket.ticketCode || ticket.id}`,
    `Status: ${ticket.status || 'Valid'}`,
    `Verify: ${verificationUrl}`,
  ].filter(Boolean).join('\n');

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

          {/* Dynamic Signed QR Code Section */}
          <div className="text-center space-y-3 pt-2">
            <div className="bg-[#FAF7F5] p-5 rounded-2xl border-2 border-[#D6A184]/50 inline-block shadow-inner w-full max-w-[280px]">
              <div className="bg-white p-3 rounded-xl border border-[#E8DDD7] inline-block shadow-xs">
                <QRCodeSVG
                  value={qrPayload}
                  size={190}
                  bgColor="#ffffff"
                  fgColor="#63474D"
                  level="M"
                  includeMargin={false}
                />
              </div>

              {/* Attendee Details Beneath QR Code */}
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
              <span>Scan with phone camera or door scanner to verify.</span>
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
    </div>
  );
};
