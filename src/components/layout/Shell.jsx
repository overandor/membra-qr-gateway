import React from 'react';

export default function Shell({ children }) {
  return (
    <div className="min-h-screen bg-background grid-lines">
      {children}
    </div>
  );
}
