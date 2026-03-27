import React from 'react';
import { useNavigate } from 'react-router-dom';

const StatusPipeline = ({ title, count, items, accent, onCardClick, viewAllPath }) => {
  const navigate = useNavigate();

  const accentClass = {
    elec:  'bg-elec/45',
    water: 'bg-water/45',
    gas:   'bg-gas/45',
  }[accent] || 'bg-elec/45';

  return (
    <div className="bg-card border-0.5 border-white/[0.07] rounded-2xl overflow-hidden">
      {/* Top accent stripe */}
      <div className={`h-[1.5px] ${accentClass} rounded-t-2xl`} />

      {/* Header */}
      <div className="p-5 border-b border-white/[0.05]">
        <h3 className="font-outfit text-base font-semibold text-txt flex items-center justify-between">
          {title}
          <span className="font-mono text-xs text-sub">({count})</span>
        </h3>
      </div>

      {/* Items */}
      <div className="p-3 space-y-2">
        {items.slice(0, 4).map((item, idx) => (
          <div
            key={idx}
            onClick={() => onCardClick && onCardClick(item)}
            className="bg-card2 border-0.5 border-white/[0.05] rounded-xl p-4 hover:border-white/[0.13] hover:-translate-y-0.5 transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 pr-2">
                <p className="font-outfit text-sm font-medium text-txt group-hover:text-elec transition-colors truncate">
                  {item.title || item.name}
                </p>
                <p className="font-mono text-[10px] text-sub mt-1 truncate">
                  {item.subtitle || item.description}
                </p>
              </div>
              <span className="font-mono text-[9px] text-muted shrink-0">
                {item.id}
              </span>
            </div>
          </div>
        ))}

        {count > 4 && (
          <button
            onClick={() => navigate(viewAllPath)}
            className="w-full py-3 font-mono text-[10px] uppercase tracking-[0.08em] text-elec hover:text-txt transition-colors"
          >
            View all {count} →
          </button>
        )}

        {count === 0 && (
          <div className="py-8 text-center">
            <p className="font-outfit text-sm text-sub">No pending items</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusPipeline;
