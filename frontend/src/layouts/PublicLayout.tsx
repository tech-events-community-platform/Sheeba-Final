import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import { Footer } from '../components/layout/Footer';

export const PublicLayout: React.FC = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const authRoutes = [
    '/login',
    '/register',
    '/pending-approval',
    '/contact',
    '/sponsor/auth',
    '/sponsor/forgot-password',
  ];
  const isAuthPage = authRoutes.some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
  );
  const isExternalRegistration =
    location.pathname.startsWith('/e/') ||
    (location.pathname.startsWith('/events/') && location.pathname.includes('/register'));

  React.useEffect(() => {
    if (isHome) {
      document.documentElement.classList.add('home-page');
      document.body.classList.add('home-page');
    } else {
      document.documentElement.classList.remove('home-page');
      document.body.classList.remove('home-page');
    }
    return () => {
      document.documentElement.classList.remove('home-page');
      document.body.classList.remove('home-page');
    };
  }, [isHome]);

  if (isExternalRegistration) {
    return (
      <div
        className="min-h-screen flex flex-col bg-cover bg-center bg-no-repeat bg-fixed"
        style={{ backgroundImage: `url('/register-bg.webp')` }}
      >
        <Header />
        <main className="flex-1 pt-20 sm:pt-24">
          <Outlet />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfafc]">
      <Header />
      <main
        className={`flex-1 ${
          isHome
            ? ''
            : isAuthPage
            ? 'pt-16 sm:pt-18 pb-4 flex flex-col justify-center'
            : 'pt-24 sm:pt-28'
        }`}
      >
        <Outlet />
      </main>
      {isHome && <Footer />}
    </div>
  );
};

