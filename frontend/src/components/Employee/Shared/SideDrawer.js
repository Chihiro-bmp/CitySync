import React from 'react';

const SideDrawer = ({ open, onClose, children }) => {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-[999] animate-fade-in"
          style={{ backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[480px] bg-card border-l border-white/[0.07] z-[1000] transition-transform duration-300 ease-out overflow-y-auto ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-txt/60 hover:text-txt transition-colors z-10 font-mono text-sm"
        >
          ✕
        </button>

        {children}
      </div>
    </>
  );
};

export default SideDrawer;
