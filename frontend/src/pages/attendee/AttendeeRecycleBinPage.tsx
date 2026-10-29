import React from 'react';
import { RecycleBinView } from '../../components/recycleBin/RecycleBinView';
import { Ticket, MessageSquare } from 'lucide-react';
import type { RecycleBinEntityType } from '../../types/recycleBin';

export const AttendeeRecycleBinPage: React.FC = () => {
  return (
    <RecycleBinView
      role="ATTENDEE"
      title="My Deleted Records"
      subtitle="Safely recover your cancelled event registrations, ticket passes, and event reviews within the 30-day retention window."
      allowedEntityTypes={[
        { type: 'registration' as RecycleBinEntityType, label: 'Registrations & Tickets', icon: Ticket },
        { type: 'review' as RecycleBinEntityType, label: 'Event Reviews', icon: MessageSquare },
      ]}
    />
  );
};
