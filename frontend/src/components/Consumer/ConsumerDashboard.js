import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAvatar } from '../../context/AvatarContext';
import { 
  getConsumerProfile, 
  getConsumerConnections, 
  getConsumerBills, 
  getConsumerUsage, 
  getConsumerComplaints 
} from '../../services/api';

const BentoCard = ({ 
  title, 
  value, 
  sub, 
  tag, 
  bgImage, 
  stripeColor, 
  subColor, 
  wide, 
  onClick, 
  drawerContent,
  flexValue,
  onHoverEnter,
  onHoverLeave,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handlePlusClick = (e) => {
    e.stopPropagation();
    setIsDrawerOpen(!isDrawerOpen);
  };

  return (
    <div 
      onClick={!isDrawerOpen ? onClick : undefined}
      onMouseEnter={() => {
        if (!isDrawerOpen) onHoverEnter?.();
      }}
      onMouseLeave={() => {
        if (!isDrawerOpen) onHoverLeave?.();
      }}
      style={{ flex: flexValue }}
      className={`card relative overflow-hidden border border-white/5 transition-all duration-500 cursor-pointer group 
        ${isDrawerOpen ? 'cursor-default' : 'hover:border-white/15'}`}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] z-[2]" style={{ backgroundColor: stripeColor }}></div>
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-700 brightness-[0.34] saturate-[0.52] group-hover:scale-105 group-hover:brightness-[0.27]"
        style={{ backgroundImage: `url(${bgImage})` }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-t from-bg/97 via-bg/10 to-transparent"></div>

      <div className="absolute bottom-0 left-0 right-0 p-4 z-[3]">
        <span className="font-mono text-[8px] tracking-[0.16em] uppercase text-muted block mb-1">{tag}</span>
        <div className="font-rajdhani text-2xl font-bold text-txt truncate leading-none">{value}</div>
        <div 
          className="font-mono text-[9px] mt-1 transition-all duration-200 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0"
          style={{ color: subColor }}
        >
          {sub}
        </div>
      </div>

      <div className="absolute bottom-3.5 right-4 z-[3] font-mono text-sm text-white/20 transition-all duration-200 opacity-0 -translate-x-1 translate-y-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0">↗</div>

      <button 
        onClick={handlePlusClick}
        className={`absolute top-3 right-3 z-[20] w-7 h-7 rounded-full border border-white/15 bg-black/50 text-txt text-lg font-light flex items-center justify-center transition-all duration-300 backdrop-blur-md opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 ${
          isDrawerOpen ? 'rotate-45 opacity-100 scale-100' : ''
        }`}
      >
        {isDrawerOpen ? '×' : '+'}
      </button>

      {/* Drawer */}
      <div className={`absolute top-0 right-0 bottom-0 w-[62%] bg-black/60 backdrop-blur-3xl border-l border-white/10 transition-transform duration-500 z-[15] p-4 flex flex-col justify-end ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {drawerContent}
      </div>
    </div>
  );
};

const ConsumerDashboard = () => {
  const { user } = useAuth();
  const { avatar: profileAvatar } = useAvatar();
  const navigate = useNavigate();
  const [hoveredRow, setHoveredRow] = useState({ r1: null, r2: null, r3: null });
  const hoverTimers = useRef({ r1: null, r2: null, r3: null });

  const baseFlex = (wide) => (wide ? '1.65 1 0' : '1 1 0');
  const enterRow = (rowKey, idx) => {
    if (hoverTimers.current[rowKey]) clearTimeout(hoverTimers.current[rowKey]);
    hoverTimers.current[rowKey] = null;
    setHoveredRow((prev) => ({ ...prev, [rowKey]: idx }));
  };
  const leaveRow = (rowKey) => {
    if (hoverTimers.current[rowKey]) clearTimeout(hoverTimers.current[rowKey]);
    hoverTimers.current[rowKey] = setTimeout(() => {
      setHoveredRow((prev) => ({ ...prev, [rowKey]: null }));
    }, 14);
  };

  const [data, setData] = useState({
    profile: null,
    connections: [],
    bills: [],
    usage: [],
    complaints: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profile, connections, bills, usage, complaints] = await Promise.all([
          getConsumerProfile(),
          getConsumerConnections(),
          getConsumerBills(5),
          getConsumerUsage(),
          getConsumerComplaints()
        ]);
        setData({
          profile: profile.data,
          connections: connections.data,
          bills: bills.data,
          usage: usage.data,
          complaints: complaints.data
        });
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const elecUsage = data.connections.find(c => c.utility_tag === 'electricity')?.units_used || 0;
  const waterUsage = data.connections.find(c => c.utility_tag === 'water')?.units_used || 0;
  const gasUsage = data.connections.find(c => c.utility_tag === 'gas')?.units_used || 0;
  const latestBill = data.bills[0] || { total_amount: 0, bill_status: 'N/A' };
  const openComplaints = data.complaints.filter(c => c.status !== 'Resolved').length;

  return (
    <div className="max-w-[1200px] mx-auto w-full px-6">
      <div className="flex flex-col gap-[9px] w-full">
        {/* ROW 1 */}
        <div className="flex gap-[9px] h-[252px]">
          <BentoCard 
            wide
            tag="prepaid · account balance"
            value={`৳ ${data.profile?.total_outstanding || '0.00'}`}
            sub="Active · View Details"
            subColor="rgba(232,232,232,0.4)"
            bgImage="https://plus.unsplash.com/premium_photo-1681589452911-055f7f058dce?q=75&w=900"
            stripeColor="rgba(232,232,232,0.18)"
            onClick={() => navigate('/consumer/payments')}
            flexValue={
              hoveredRow.r1 === null
                ? baseFlex(true)
                : hoveredRow.r1 === 0
                  ? '2.5 1 0'
                  : '0.55 1 0'
            }
            onHoverEnter={() => enterRow('r1', 0)}
            onHoverLeave={() => leaveRow('r1')}
            drawerContent={
              <>
                <div className="font-mono text-[8px] tracking-widest uppercase text-muted mb-2">account balance</div>
                <div className="text-[11.5px] leading-relaxed text-txt/65 mb-3">
                  Keep your connections running. Top up anytime to restore or maintain active services across all your meters.
                </div>
                <button
                  className="font-mono text-[8.5px] tracking-widest uppercase px-3 py-2 rounded-md bg-txt text-bg font-medium mb-2 hover:opacity-80"
                  onClick={() => navigate('/consumer/payments')}
                >
                  Top up account →
                </button>
                <button
                  className="font-mono text-[8.5px] tracking-widest uppercase px-3 py-2 rounded-md bg-transparent border border-white/15 text-txt/50 hover:border-white/30 hover:text-txt"
                  onClick={() => navigate('/consumer/payments')}
                >
                  View transaction history →
                </button>
              </>
            }
          />
          <BentoCard 
            tag="electricity"
            value={`${elecUsage} kWh`}
            sub="↑ 12% vs last month"
            subColor="#CCFF00"
            bgImage="https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&q=75"
            stripeColor="#CCFF00"
            onClick={() => navigate('/consumer/usage')}
            flexValue={
              hoveredRow.r1 === null
                ? baseFlex(false)
                : hoveredRow.r1 === 1
                  ? '2.5 1 0'
                  : '0.55 1 0'
            }
            onHoverEnter={() => enterRow('r1', 1)}
            onHoverLeave={() => leaveRow('r1')}
            drawerContent={
              <>
                <div className="font-mono text-[8px] tracking-widest uppercase text-muted mb-2">electricity usage</div>
                <div className="text-[11.5px] leading-relaxed text-txt/65 mb-3">
                  Peak hours, daily trends, tariff slab breakdown — all on your usage page.
                </div>
                <button
                  className="font-mono text-[8.5px] tracking-widest uppercase px-3 py-2 rounded-md bg-lime text-bg font-medium mb-2 hover:opacity-80"
                  onClick={() => navigate('/consumer/usage')}
                >
                  Check every usage →
                </button>
              </>
            }
          />
          <BentoCard 
            tag="water"
            value={`${waterUsage} kL`}
            sub="Normal range · No alerts"
            subColor="#00D4FF"
            bgImage="https://images.unsplash.com/photo-1574482620826-40685ca5ebd2?q=75&w=600"
            stripeColor="#00D4FF"
            onClick={() => navigate('/consumer/usage')}
            flexValue={
              hoveredRow.r1 === null
                ? baseFlex(false)
                : hoveredRow.r1 === 2
                  ? '2.5 1 0'
                  : '0.55 1 0'
            }
            onHoverEnter={() => enterRow('r1', 2)}
            onHoverLeave={() => leaveRow('r1')}
            drawerContent={
              <>
                <div className="font-mono text-[8px] tracking-widest uppercase text-muted mb-2">water usage</div>
                <div className="text-[11.5px] leading-relaxed text-txt/65 mb-3">
                  Daily and monthly consumption, spike alerts, and quality grades for your supply region.
                </div>
                <button
                  className="font-mono text-[8.5px] tracking-widest uppercase px-3 py-2 rounded-md bg-cyan text-bg font-medium mb-2 hover:opacity-80"
                  onClick={() => navigate('/consumer/usage')}
                >
                  Check every usage →
                </button>
              </>
            }
          />
        </div>

        {/* ROW 2 */}
        <div className="flex gap-[9px] h-[252px]">
          <BentoCard 
            tag="latest bill"
            value={`৳ ${latestBill.total_amount}`}
            sub={latestBill.bill_status === 'PAID' ? 'Paid' : 'Unpaid'}
            subColor={latestBill.bill_status === 'PAID' ? '#44ff99' : '#ff4444'}
            bgImage="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=75"
            stripeColor="#FF9900"
            onClick={() => navigate('/consumer/bills')}
            flexValue={
              hoveredRow.r2 === null
                ? baseFlex(false)
                : hoveredRow.r2 === 0
                  ? '2.5 1 0'
                  : '0.55 1 0'
            }
            onHoverEnter={() => enterRow('r2', 0)}
            onHoverLeave={() => leaveRow('r2')}
            drawerContent={
              <>
                <div className="font-mono text-[8px] tracking-widest uppercase text-muted mb-2">billing</div>
                <div className="text-[11.5px] leading-relaxed text-txt/65 mb-3">
                   Review line items, and configure payment from your bills page.
                </div>
                <button
                  className="font-mono text-[8.5px] tracking-widest uppercase px-3 py-2 rounded-md bg-orange text-bg font-medium mb-2 hover:opacity-80"
                  onClick={() => navigate('/consumer/bills')}
                >
                  Check every bill →
                </button>
                
              </>
            }
          />
          <BentoCard 
            tag="gas"
            value={`${gasUsage} m³`}
            sub="↓ 8% this month"
            subColor="#FF9900"
            bgImage="https://images.unsplash.com/photo-1513828583688-c52646db42da?w=600&q=75"
            stripeColor="rgba(255,153,0,0.5)"
            onClick={() => navigate('/consumer/usage')}
            flexValue={
              hoveredRow.r2 === null
                ? baseFlex(false)
                : hoveredRow.r2 === 1
                  ? '2.5 1 0'
                  : '0.55 1 0'
            }
            onHoverEnter={() => enterRow('r2', 1)}
            onHoverLeave={() => leaveRow('r2')}
            drawerContent={
              <>
                <div className="font-mono text-[8px] tracking-widest uppercase text-muted mb-2">gas usage</div>
                <div className="text-[11.5px] leading-relaxed text-txt/65 mb-3">
                  Daily patterns, billing period comparisons, and savings opportunities all on your usage page.
                </div>
                <button
                  className="font-mono text-[8.5px] tracking-widest uppercase px-3 py-2 rounded-md bg-orange text-bg font-medium mb-2 hover:opacity-80"
                  onClick={() => navigate('/consumer/usage')}
                >
                  Check every usage →
                </button>
              </>
            }
          />
          <BentoCard 
            tag="complaints · support"
            value={`${openComplaints} open`}
            sub="Track resolution updates"
            subColor="rgba(232,232,232,0.36)"
            bgImage="https://images.unsplash.com/photo-1534536281715-e28d76689b4d?w=800&q=75"
            stripeColor="rgba(232,232,232,0.12)"
            onClick={() => navigate('/consumer/complaints')}
            flexValue={
              hoveredRow.r2 === null
                ? baseFlex(false)
                : hoveredRow.r2 === 2
                  ? '2.5 1 0'
                  : '0.55 1 0'
            }
            onHoverEnter={() => enterRow('r2', 2)}
            onHoverLeave={() => leaveRow('r2')}
            drawerContent={
              <>
                <div className="font-mono text-[8px] tracking-widest uppercase text-muted mb-2">active complaints</div>
                <div className="text-[11.5px] leading-relaxed text-txt/65 mb-3">
                  Real-time updates from field workers, resolution timelines, and direct communication logs.
                </div>
                <button
                  className="font-mono text-[8.5px] tracking-widest uppercase px-3 py-2 rounded-md bg-white/10 text-txt border border-white/20 hover:bg-white/20 mb-2"
                  onClick={() => navigate('/consumer/complaints')}
                >
                  Track every complaint →
                </button>
                <button
                  className="font-mono text-[8.5px] tracking-widest uppercase px-3 py-2 rounded-md bg-transparent border border-white/15 text-txt/50 hover:border-white/30 hover:text-txt"
                  onClick={() => navigate('/consumer/complaints?new=1')}
                >
                  File new complaint →
                </button>
              </>
            }
          />
        </div>

        {/* ROW 3 */}
        <div className="flex gap-[9px] h-[148px]">
          <BentoCard 
            wide
            tag="connections · infrastructure"
            value={`${data.connections.length} active`}
            sub={data.connections.map(c => c.utility_name).join(' · ')}
            subColor="rgba(232,232,232,0.36)"
            bgImage="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=75"
            stripeColor="#CCFF00"
            onClick={() => navigate('/consumer/connections')}
            flexValue={
              hoveredRow.r3 === null
                ? baseFlex(true)
                : hoveredRow.r3 === 0
                  ? '2.5 1 0'
                  : '0.55 1 0'
            }
            onHoverEnter={() => enterRow('r3', 0)}
            onHoverLeave={() => leaveRow('r3')}
            drawerContent={
              <>
                <div className="font-mono text-[8px] tracking-widest uppercase text-muted mb-2">your connections</div>
                <div className="flex flex-col gap-1 mb-3">
                  {data.connections.map(conn => (
                    <div key={conn.connection_id} className="flex items-center justify-between bg-white/5 p-1.5 rounded-md border border-white/5">
                      <span className="font-mono text-[8px] text-txt/70">{conn.utility_name}</span>
                      <span className="font-mono text-[7px] text-lime uppercase">{conn.connection_status}</span>
                    </div>
                  ))}
                </div>
                <button
                  className="font-mono text-[8.5px] tracking-widest uppercase px-3 py-2 rounded-md bg-lime text-bg font-medium mb-2 hover:opacity-80"
                  onClick={() => navigate('/consumer/connections')}
                >
                  Manage connections →
                </button>
                <button
                  className="font-mono text-[8.5px] tracking-widest uppercase px-3 py-2 rounded-md bg-transparent border border-white/15 text-txt/50 hover:border-white/30 hover:text-txt"
                  onClick={() => navigate('/consumer/applications')}
                >
                  + Apply for new connection →
                </button>
              </>
            }
          />
          <BentoCard 
            tag="account"
            value={user?.firstName + ' ' + user?.lastName}
            sub="Residential · Dhaka"
            subColor="rgba(232,232,232,0.36)"
            bgImage={profileAvatar || "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=600&q=75"}
            stripeColor="rgba(204,255,0,0.25)"
            onClick={() => navigate('/consumer/profile')}
            flexValue={
              hoveredRow.r3 === null
                ? baseFlex(false)
                : hoveredRow.r3 === 1
                  ? '2.5 1 0'
                  : '0.55 1 0'
            }
            onHoverEnter={() => enterRow('r3', 1)}
            onHoverLeave={() => leaveRow('r3')}
            drawerContent={
              <>
                <div className="font-mono text-[8px] tracking-widest uppercase text-muted mb-2">account</div>
                <div className="text-[11.5px] leading-relaxed text-txt/65 mb-3">
                  Manage your personal info, notification preferences, and account settings.
                </div>
                <button
                  className="font-mono text-[8.5px] tracking-widest uppercase px-3 py-2 rounded-md bg-white/10 text-txt border border-white/20 hover:bg-white/20 mb-2"
                  onClick={() => navigate('/consumer/profile')}
                >
                  View profile →
                </button>
                <button
                  className="font-mono text-[8.5px] tracking-widest uppercase px-3 py-2 rounded-md bg-transparent border border-red-500/20 text-red-500/60 hover:border-red-500/40 hover:text-red-500"
                  onClick={() => navigate('/consumer/profile')}
                >
                  Deactivate account →
                </button>
              </>
            }
          />
        </div>
      </div>
    </div>
  );
};

export default ConsumerDashboard;