import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fonts, utilities, paymentMethods } from '../../theme';
import { ElectricityIcon, WaterIcon, GasIcon, BillIcon, BankTransferIcon, MobileBankingIcon, GooglePayIcon } from '../../Icons';
import AddMethodModal from './AddMethodModal';

const UtilIcons = {
  electricity: ElectricityIcon,
  water: WaterIcon,
  gas: GasIcon,
};

const METHOD_LABELS = {
  bank: 'Bank Transfer',
  mobile_banking: 'Mobile Banking',
  google_pay: 'Google Pay',
};

const methodSub = (m) => {
  if (m.bank_name) return `${m.bank_name} ···· ${m.account_num?.slice(-4)}`;
  if (m.provider_name) return `${m.provider_name} · ${m.mb_phone}`;
  if (m.email) return m.email;
  return '';
};

const PayBillModal = ({ bill, onClose, onSuccess, t, isDark }) => {
  const { authFetch } = useAuth();
  const [methods, setMethods] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchMethods = () => {
    setLoadingMethods(true);
    return authFetch('/api/consumer/payment-methods')
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setMethods(list);
        const def = list.find((m) => m.is_default) || list[0];
        if (def) setSelectedId(def.method_id);
      })
      .catch(() => {})
      .finally(() => setLoadingMethods(false));
  };

  useEffect(() => { fetchMethods(); }, [authFetch]);

  const handlePay = async () => {
    if (!selectedId) {
      setError('Please select a payment method');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await authFetch('/api/consumer/pay', {
        method: 'POST',
        body: JSON.stringify({
          bill_document_id: bill.bill_document_id,
          payment_amount: bill.amount,
          method_id: selectedId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const util = utilities[bill.utility_tag] || utilities.payment;
  const Icon = UtilIcons[bill.utility_tag] || BillIcon;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          borderRadius: 20,
          padding: 28,
          width: '100%',
          maxWidth: 440,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 13,
              background: util.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 12px ${util.glow}`,
            }}
          >
            <Icon size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: t.text }}>{bill.utility_name} Bill</div>
            <div style={{ fontSize: 12, color: t.textSub, fontFamily: fonts.mono }}>{bill.period}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: t.textMuted,
              fontSize: 22,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            background: isDark ? '#0A1020' : '#F8FAFF',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 22,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: t.textMuted,
              fontFamily: fonts.mono,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 4,
            }}
          >
            Amount Due
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: t.text, letterSpacing: '-0.5px' }}>
            ৳ {parseFloat(bill.amount).toLocaleString()}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: t.textSub, marginBottom: 10 }}>Pay With</div>
          {loadingMethods ? (
            <div
              style={{
                height: 60,
                borderRadius: 12,
                background: t.bgCard,
                border: `1px solid ${t.border}`,
                animation: 'pulse 1.5s infinite',
              }}
            />
          ) : methods.length === 0 ? (
            <div
              style={{
                padding: '16px',
                borderRadius: 12,
                border: `1.5px dashed ${t.border}`,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 13, color: t.textSub, marginBottom: 8 }}>No saved payment methods</div>
              <a href="/consumer/payments" style={{ fontSize: 12, color: t.primary, fontWeight: 500 }}>
                Add a payment method →
              </a>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {methods.map((m) => (
                <button
                  key={m.method_id}
                  onClick={() => setSelectedId(m.method_id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: `1.5px solid ${selectedId === m.method_id ? t.primary : t.border}`,
                    background:
                      selectedId === m.method_id ? (isDark ? 'rgba(59,111,255,0.1)' : '#EEF2FF') : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'left',
                  }}
                >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 9,
                        background: (paymentMethods[m.method_name] && paymentMethods[m.method_name].grad) || paymentMethods.bank.grad,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                    {(() => {
                      const IconComp = m.method_name === 'bank' ? BankTransferIcon : (m.method_name === 'mobile_banking' ? MobileBankingIcon : GooglePayIcon);
                      return <IconComp size={16} color="#fff" />;
                    })()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: t.text }}>
                      {METHOD_LABELS[m.method_name] || m.method_name}
                    </div>
                    <div style={{ fontSize: 11, color: t.textSub, fontFamily: fonts.mono }}>{methodSub(m)}</div>
                  </div>
                  {m.is_default && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: '2px 8px',
                        borderRadius: 100,
                        background: isDark ? 'rgba(59,111,255,0.15)' : '#EEF2FF',
                        color: t.primary,
                        fontFamily: fonts.mono,
                        flexShrink: 0,
                      }}
                    >
                      Default
                    </span>
                  )}
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      border: `2px solid ${selectedId === m.method_id ? t.primary : t.border}`,
                      background: selectedId === m.method_id ? t.primary : 'transparent',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {selectedId === m.method_id && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
                    )}
                  </div>
                </button>
              ))}

              <button
                onClick={() => setShowAdd(true)}
                style={{
                  marginTop: 6,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: `1.5px dashed ${t.border}`,
                  background: 'transparent',
                  color: t.primary,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                + Use another method
              </button>
            </div>
          )}
        </div>

        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
        {error && (
          <div
            style={{
              fontSize: 13,
              color: isDark ? '#F87171' : '#B91C1C',
              marginBottom: 14,
              padding: '10px 14px',
              borderRadius: 8,
              background: isDark ? '#2D0C0C' : '#FEE2E2',
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={loading || !selectedId || methods.length === 0}
          style={{
            width: '100%',
            padding: '13px',
            borderRadius: 10,
            border: 'none',
            background: loading || !selectedId ? t.textMuted : 'linear-gradient(135deg,#3B6FFF,#2952D9)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            fontFamily: fonts.ui,
            cursor: loading || !selectedId ? 'not-allowed' : 'pointer',
            boxShadow: loading || !selectedId ? 'none' : '0 4px 16px rgba(59,111,255,0.3)',
          }}
        >
          {loading ? 'Processing...' : `Pay ৳ ${parseFloat(bill.amount).toLocaleString()}`}
        </button>
      {showAdd && (
        <AddMethodModal
          onClose={() => setShowAdd(false)}
          onAdded={() => { fetchMethods(); }}
          t={t}
          isDark={isDark}
          authFetch={authFetch}
        />
      )}
      </div>
    </div>
  );
};

export default PayBillModal;
