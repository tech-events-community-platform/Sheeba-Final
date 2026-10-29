import React from 'react';
import { RecycleBinView } from '../../components/recycleBin/RecycleBinView';
import { HandCoins } from 'lucide-react';
import type { RecycleBinEntityType } from '../../types/recycleBin';

export const SponsorRecycleBinPage: React.FC = () => {
  return (
    <RecycleBinView
      role="SPONSOR"
      title="Sponsorship Recycle Bin"
      subtitle="Recover your deleted sponsorship deals, pledges, and event partnership agreements within 30 days."
      allowedEntityTypes={[
        { type: 'sponsorship_deal' as RecycleBinEntityType, label: 'Deals & Pledges', icon: HandCoins },
      ]}
    />
  );
};
