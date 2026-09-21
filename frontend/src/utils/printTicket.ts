/**
 * Utility to isolate and print an attendee pass on strictly 1 page.
 * Hides all navigation, tabs, headers, sidebars, footers, and non-ticket elements.
 */
export const printTicketPass = (ticketElementId: string) => {
  const cardEl = document.getElementById(ticketElementId);
  if (!cardEl) {
    window.print();
    return;
  }

  // Clean up any lingering print portals
  const existingPortal = document.getElementById('sheeba-print-pass-portal');
  if (existingPortal) {
    existingPortal.remove();
  }

  // Create isolated portal element attached directly to document.body
  const portal = document.createElement('div');
  portal.id = 'sheeba-print-pass-portal';

  // Deep clone the targeted ticket card
  const clone = cardEl.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id');

  // Strip out buttons, navigation links, and any no-print elements from the printed pass
  const interactiveEls = clone.querySelectorAll('.no-print, button, a[href]');
  interactiveEls.forEach((el) => el.remove());

  portal.appendChild(clone);
  document.body.appendChild(portal);
  document.body.classList.add('printing-ticket');

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    document.body.classList.remove('printing-ticket');
    portal.remove();
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  window.print();
  // Safety timeout in case browser doesn't dispatch afterprint
  setTimeout(cleanup, 1500);
};
