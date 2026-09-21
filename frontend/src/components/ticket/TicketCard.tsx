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

          <h2 className="font-serif text-xl font-bold text-white mb-1 leading-snug">{ticket.eventTitle}</h2>
          <p className="text-xs text-[#E8DDD7] font-medium uppercase font-mono">{ticket.eventType} Digital Entrance Pass</p>
        </div>

        {/* Card Body Details */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[#756366] uppercase tracking-wider text-[10px] font-bold block mb-1">
                ATTENDEE NAME
              </span>
              <p className="font-bold text-[#2D1F23] text-sm">{ticket.attendeeName}</p>
              <p className="text-[11px] text-[#756366]">{ticket.attendeeEmail}</p>
            </div>
            <div>
              <span className="text-[#756366] uppercase tracking-wider text-[10px] font-bold block mb-1">
                PASS NUMBER
              </span>
              <p className="font-mono font-bold text-[#2D1F23] text-xs bg-[#FAF7F5] border border-[#E8DDD7] px-2 py-1 rounded-md inline-block">
                {ticket.id}
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#E8DDD7] text-xs text-[#2D1F23]">
            <div className="flex items-start gap-2.5">
              <img src="/calendar.webp" alt="Calendar" className="w-4 h-4 object-contain mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-[#2D1F23]">{ticket.eventDate}</p>
                <p className="text-[#756366]">{ticket.eventTime}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 pt-1">
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
                value={ticket.qrToken}
                size={180}
                bgColor="#FAF7F5"
                fgColor="#63474D"
                level="H"
                includeMargin={false}
              />
              <div className="mt-2 text-[10px] font-mono text-[#756366] truncate max-w-[180px]">
                {ticket.qrToken}
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-[#2A7B5F] font-semibold bg-[#2A7B5F]/10 py-2 px-4 rounded-xl border border-[#2A7B5F]/20">
              <img src="/tick.webp" alt="Valid" className="w-4 h-4 object-contain shrink-0" />
              <span>Evaluated live server-side at door entrance.</span>
            </div>

            <p className="text-[11px] text-[#756366]">
              Pass remains valid through the day after the event.
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
