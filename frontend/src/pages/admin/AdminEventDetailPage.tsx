import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import type { Event } from '../../types/event';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  ArrowLeft,
  XCircle,
} from 'lucide-react';

export const AdminEventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      if (id) {
        const evt = await api.events.getById(id);
        setEvent(evt || null);
      }
      setLoading(false);
    };
    fetchEvent();
  }, [id]);

  const handleApprove = async () => {
    if (!event) return;
    const updated = await api.events.update(event.id, { status: 'open' });
    setEvent(updated);
    setStatusMessage('Event status updated to OPEN / ACTIVE.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleCancel = async () => {
    if (!event) return;
    const updated = await api.events.update(event.id, { status: 'canceled' });
    setEvent(updated);
    setStatusMessage('Event status updated to CANCELED.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto py-12 animate-pulse h-64 bg-[#E8DDD7]/50 rounded-3xl"></div>;
  }

  if (!event) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <h2 className="font-serif text-xl font-bold text-[#2D1F23]">Event Not Found</h2>
        <Link to="/admin/events">
          <Button variant="primary">Return to Admin Events</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      <Link
        to="/admin/events"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#63474D] hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Admin Events Roster
      </Link>

      {statusMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-bold flex items-center gap-2 animate-fade-in">
          <img src="/tick.webp" alt="Success" className="w-4 h-4 object-contain shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#63474D] text-white p-6 sm:p-8 rounded-3xl space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="primary" className="uppercase font-mono text-[10px]">{event.type}</Badge>
            <Badge variant={event.status === 'open' ? 'success' : 'gray'}>
              {event.status}
            </Badge>
          </div>
          <span className="text-xs text-[#E8DDD7] font-mono">ID: {event.id}</span>
        </div>

        <h1 className="font-serif text-2xl sm:text-4xl font-extrabold text-white">{event.title}</h1>

        <div className="flex flex-wrap items-center gap-6 text-xs text-[#E8DDD7]">
          <span className="font-semibold text-[#FFA686]">
            Host: {event.organizerName}
          </span>
          <span className="flex items-center gap-1.5">
            <img src="/calendar.webp" alt="Calendar" className="w-4 h-4 object-contain shrink-0" />
            {event.date} • {event.time}
          </span>
          <span className="flex items-center gap-1.5">
            <img src="/location.webp" alt="Location" className="w-4 h-4 object-contain shrink-0" />
            {event.location}
          </span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white p-5 rounded-2xl border border-[#E8DDD7] shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <span className="text-xs text-[#2D1F23] font-bold">Admin State Moderation</span>
        <div className="flex gap-2">
          <Button onClick={handleApprove} variant="primary" size="sm" icon={<img src="/tick.webp" alt="Approve" className="w-4 h-4 object-contain shrink-0" />}>
            Set Open / Live
          </Button>
          <Button onClick={handleCancel} variant="danger" size="sm" icon={<XCircle className="w-4 h-4" />}>
            Cancel Event
          </Button>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white p-6 rounded-3xl border border-[#E8DDD7] space-y-3 text-xs shadow-xs">
        <h3 className="font-serif font-bold text-base text-[#2D1F23]">Description</h3>
        <p className="text-[#756366] leading-relaxed">{event.description}</p>
      </div>
    </div>
  );
};
