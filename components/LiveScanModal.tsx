'use client';
import { useState } from 'react';
import { useTheme } from '@/lib/theme-context';

interface Props {
  scanCount: number;
  freeScanLimit: number;
  onSubmit: (code: string) => void;
  onCancel: () => void;
}

export default function LiveScanModal({ scanCount, freeScanLimit, onSubmit, onCancel }: Props) {
  const { theme } = useTheme();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const isFlap = theme === 'flap';

  const borderCls = isFlap ? 'border-flap-border' : 'border-crt-green';
  const bgCls = isFlap ? 'bg-flap-bg' : 'bg-crt-black';
  const textCls = isFlap ? 'text-flap-yellow' : 'text-crt-green';
  const dimCls = isFlap ? 'text-flap-yellow/60' : 'text-crt-green/60';
  const inputBorder = isFlap
    ? 'border-flap-border focus:border-flap-yellow'
    : 'border-crt-green/40 focus:border-crt-green';
  const btnCls = isFlap
    ? 'border-flap-yellow text-flap-yellow hover:bg-flap-yellow/10'
    : 'border-crt-green text-crt-green hover:bg-crt-green/10';
  const cancelCls = isFlap
    ? 'border-flap-border text-flap-yellow/50 hover:border-flap-yellow/50'
    : 'border-crt-green/30 text-crt-green/50 hover:border-crt-green/60';

  const exhausted = scanCount >= freeScanLimit;

  const handleSubmit = () => {
    if (!code.trim()) { setError('CODE REQUIRED'); return; }
    setError('');
    onSubmit(code.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onCancel}
    >
      <div
        className={`border-2 ${borderCls} ${bgCls} ${textCls} font-mono max-w-md w-full mx-4`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`border-b ${borderCls} px-4 py-2`}>
          <div className="text-sm font-bold tracking-widest">
            {exhausted ? 'FREE SCANS EXHAUSTED' : 'LIVE SCAN READY'}
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-4">
          {!exhausted ? (
            <>
              <p className={`text-sm ${dimCls} mb-4`}>
                LIVE SCANS: {freeScanLimit - scanCount}/{freeScanLimit} REMAINING
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => onSubmit('')}
                  className={`flex-1 border px-3 py-2 text-sm cursor-pointer transition-colors ${btnCls}`}
                >
                  [+] SCAN NOW
                </button>
                <button
                  onClick={onCancel}
                  className={`border px-3 py-2 text-sm cursor-pointer transition-colors ${cancelCls}`}
                >
                  [X] CANCEL
                </button>
              </div>
            </>
          ) : (
            <>
              <p className={`text-xs ${dimCls} mb-1`}>({freeScanLimit}/{freeScanLimit} USED)</p>
              <p className="text-sm mb-4">ENTER INVITE CODE TO CONTINUE</p>
              <div className={`flex items-center border ${inputBorder} px-2 py-1 mb-2 transition-colors`}>
                <span className={dimCls}>&gt;</span>
                <input
                  autoFocus
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="CODE: ________"
                  className={`flex-1 ml-2 bg-transparent outline-none text-sm placeholder-current/30`}
                  spellCheck={false}
                />
              </div>
              {error && <p className="text-crt-red text-xs mb-2">[ERR] {error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleSubmit}
                  className={`flex-1 border px-3 py-2 text-sm cursor-pointer transition-colors ${btnCls}`}
                >
                  [SUBMIT]
                </button>
                <button
                  onClick={onCancel}
                  className={`border px-3 py-2 text-sm cursor-pointer transition-colors ${cancelCls}`}
                >
                  [CANCEL]
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
