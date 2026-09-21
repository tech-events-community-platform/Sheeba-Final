import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

interface TelegramAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const TelegramAuthModal: React.FC<TelegramAuthModalProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sheba Account Access">
      <div className="space-y-4 text-center">
        <div className="w-16 h-16 bg-[#63474D]/10 rounded-full flex items-center justify-center mx-auto text-[#63474D]">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <div>
          <h4 className="font-serif text-xl font-bold text-[#2D1F23]">Sign in with Email</h4>
          <p className="text-xs text-[#756366] mt-1">
            Sheba uses verified email and password authentication with a single role per account.
          </p>
        </div>

        <Link to="/login" onClick={onClose} className="block">
          <Button fullWidth variant="primary" icon={<img src="/mail-icon.webp" alt="Email" className="w-4 h-4 object-contain" />}>
            Go to Email Sign In
          </Button>
        </Link>
      </div>
    </Modal>
  );
};
