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
            <div className="bg-[#FAF7F5] p-5 rounded-2xl border-2 border-[#D6A184]/50 inline-block shadow-inner">
              <QRCodeSVG
                value={verificationUrl}
                size={180}
                bgColor="#FAF7F5"
                fgColor="#63474D"
                level="H"
                includeMargin={false}
              />
              <div className="mt-2 text-[11px] font-mono font-bold text-[#63474D]">
                {ticket.ticketCode || 'SHB-PASS'}
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-[#2A7B5F] font-semibold bg-[#2A7B5F]/10 py-2 px-4 rounded-xl border border-[#2A7B5F]/20">
              <img src="/tick.webp" alt="Valid" className="w-4 h-4 object-contain shrink-0" />
              <span>Scan with phone camera or door scanner to verify.</span>
            </div>

            <p className="text-[11px] text-[#756366]">
              Scan to view attendee information and verify attendance.
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
