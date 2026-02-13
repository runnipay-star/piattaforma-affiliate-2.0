
import React from 'react';

export const VariableIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.745 3A2.25 2.25 0 0 0 2.5 5.25v13.5A2.25 2.25 0 0 0 4.745 21h14.51A2.25 2.25 0 0 0 21.5 18.75V5.25A2.25 2.25 0 0 0 19.255 3H4.745Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.125c.621 0 1.125.504 1.125 1.125v2.25M12 7.125a1.125 1.125 0 0 0-1.125 1.125v2.25m2.25 0h2.25a1.125 1.125 0 0 0 1.125-1.125V8.25m-3.375 2.25V12M12 15.75h.008v.008H12v-.008Zm0-2.25h.008v.008H12v-.008Zm-3.375 0h.008v.008H8.625v-.008Zm6.75 0h.008v.008h-.008v-.008Z" />
  </svg>
);
