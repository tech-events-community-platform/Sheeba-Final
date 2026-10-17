import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import type { Event } from '../../types/event';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Search, PlusCircle } from 'lucide-react';

export const AdminEventsPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  useEffect(() => {
    const fetchEvents = async () => {
      const data = await api.events.getAll();
      setEvents(data);
    };
    fetchEvents();
  }, []);


  const filteredEvents = events.filter((evt) => {
    const matchesStatus = statusFilter === 'All' || evt.status === statusFilter;
    const matchesSearch =
      evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.organizerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#2D1F23]">Platform Events Oversight</h1>
          <p className="text-xs text-[#756366]">Manage events across the Sheba platform and assist organizers.</p>
        </div>
        <Link to="/organizer/events/create">
          <Button variant="primary" icon={<PlusCircle className="w-4 h-4" />}>
            Create Platform Event
          </Button>
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-[#E8DDD7] shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#756366]" />
          <input
            type="text"
            placeholder="Search events by title, organizer, or venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
          />
        </div>

        <div className="flex gap-2">
          {['All', 'open', 'completed', 'canceled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                statusFilter === status
                  ? 'bg-[#63474D] text-white shadow-xs'
                  : 'bg-[#FAF7F5] text-[#756366] hover:bg-[#F4EFEB]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-[#E8DDD7] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#FAF7F5] border-b border-[#E8DDD7] text-[10px] font-bold uppercase tracking-wider text-[#756366]">
                <th className="py-3 px-4">Event Title</th>
                <th className="py-3 px-4">Organizer</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Date & Location</th>
                <th className="py-3 px-4">Turnout</th>
                <th className="py-3 px-4">Pricing</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DDD7] text-[#2D1F23]">
              {filteredEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-[#FAF7F5]/50">
                  <td className="py-3.5 px-4 font-bold max-w-xs truncate">{evt.title}</td>
                  <td className="py-3.5 px-4 text-[#AA767C] font-semibold">{evt.organizerName}</td>
                  <td className="py-3.5 px-4 uppercase font-mono text-[10px]">
                    <Badge variant="primary">{evt.type}</Badge>
                  </td>
                  <td className="py-3.5 px-4">
                    <p>{evt.date}</p>
                    <p className="text-[10px] text-[#756366]">{evt.location.split(',')[0]}</p>
                  </td>
                  <td className="py-3.5 px-4 font-bold">
                    {evt.checkedInCount} / {evt.registeredCount}
                  </td>
                  <td className="py-3.5 px-4 font-semibold">
                    {evt.isPaid ? `${evt.ticketPrice} ETB` : 'Free'}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant={evt.status === 'open' ? 'success' : 'gray'}>
                      {evt.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <Link to={`/e/${evt.shareLinkToken}`} target="_blank" className="text-xs text-[#63474D] font-semibold hover:underline">
                      Public Link
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
