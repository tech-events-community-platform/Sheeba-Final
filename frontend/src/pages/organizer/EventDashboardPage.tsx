import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import type { Event } from '../../types/event';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  QrCode,
  BarChart3,
  Award,
} from 'lucide-react';

export const EventDashboardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div className="max-w-4xl mx-auto py-12 px-4 animate-pulse h-64 bg-[#E8DDD7]/50 rounded-3xl"></div>;
  }

  if (!event) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <h2 className="font-serif text-xl font-bold text-[#2D1F23]">Event Not Found</h2>
        <Link to="/organizer/events">
          <Button variant="primary">Return to Manage Events</Button>
        </Link>
      </div>
    );
  }

  const attendanceRate =
    event.registeredCount > 0
      ? ((event.checkedInCount / event.registeredCount) * 100).toFixed(1)
      : '0.0';

  const capacityFillPercent = Math.min(100, Math.round((event.registeredCount / event.capacity) * 100));

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">

      {/* Header Banner */}
      <div className="bg-[#63474D] text-white p-6 sm:p-8 rounded-3xl space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="primary" className="uppercase font-mono text-[10px]">{event.type}</Badge>
            <Badge variant={event.status === 'open' ? 'success' : 'gray'}>
              {event.status === 'open' ? 'Open' : event.status}
            </Badge>
          </div>
          <span className="text-xs text-[#E8DDD7] font-mono">ID: {event.id}</span>
        </div>

        <h1 className="font-serif text-2xl sm:text-4xl font-extrabold text-white">{event.title}</h1>

        <div className="flex flex-wrap items-center gap-6 text-xs text-[#E8DDD7]">
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E8DDD7] shadow-xs space-y-1">
          <span className="text-xs font-semibold text-[#756366]">Registrations</span>
          <p className="font-serif text-2xl font-extrabold text-[#2D1F23]">{event.registeredCount}</p>
          <p className="text-[10px] text-[#756366]">Target capacity: {event.capacity}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8DDD7] shadow-xs space-y-1">
          <span className="text-xs font-semibold text-[#756366]">Checked In</span>
          <p className="font-serif text-2xl font-extrabold text-[#2A7B5F]">{event.checkedInCount}</p>
          <p className="text-[10px] text-[#2A7B5F] font-semibold">QR passes verified</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8DDD7] shadow-xs space-y-1">
          <span className="text-xs font-semibold text-[#756366]">Attendance Rate</span>
          <p className="font-serif text-2xl font-extrabold text-[#63474D]">{attendanceRate}%</p>
          <p className="text-[10px] text-[#756366]">Turnout ratio</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8DDD7] shadow-xs space-y-1">
          <span className="text-xs font-semibold text-[#756366]">Capacity Filled</span>
          <p className="font-serif text-2xl font-extrabold text-[#AA767C]">{capacityFillPercent}%</p>
          <p className="text-[10px] text-[#756366]">{event.capacity - event.registeredCount} spots open</p>
        </div>
      </div>

      {/* Primary Actions Bar */}
      <div className="bg-white p-5 rounded-2xl border border-[#E8DDD7] shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="text-xs text-[#2D1F23] font-bold">
          Quick Actions
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Link to={`/organizer/events/${event.id}/scanner`} className="flex-1 sm:flex-initial">
            <Button fullWidth variant="accent" icon={<QrCode className="w-4 h-4" />}>
              Door Scanner
            </Button>
          </Link>
          <Link to={`/organizer/events/${event.id}/attendees`} className="flex-1 sm:flex-initial">
            <Button fullWidth variant="primary" icon={<Award className="w-4 h-4" />}>
              Manage Badges
            </Button>
          </Link>
          <Link to={`/organizer/events/${event.id}/report`} className="flex-1 sm:flex-initial">
            <Button fullWidth variant="outline" icon={<BarChart3 className="w-4 h-4" />}>
              Sponsor Report
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white p-6 rounded-3xl border border-[#E8DDD7] space-y-3 shadow-xs text-xs">
        <h3 className="font-serif font-bold text-base text-[#2D1F23]">Event Details</h3>
        <p className="text-[#756366] leading-relaxed">{event.description}</p>
        <div className="pt-2 flex items-center gap-2">
          <span className="font-bold text-[#2D1F23]">Host:</span>
          <span>{event.organizerName}</span>
        </div>
      </div>
    </div>
  );
};
