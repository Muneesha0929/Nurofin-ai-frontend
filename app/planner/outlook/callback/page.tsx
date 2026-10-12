'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { plannerService } from '@/services/planner';

function OutlookCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Connecting Outlook Calendar...');
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setMessage('Outlook authorization was denied. Please try again.');
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage('No authorization code received.');
      return;
    }
    
    calledRef.current = true;

    const handleCallback = async () => {
      try {
        const redirectUri = `${window.location.origin}/planner/outlook/callback`;
        await plannerService.outlookCallback(code, redirectUri);
        setStatus('success');
        setMessage('Outlook Calendar connected successfully!');
        setTimeout(() => {
          router.push('/planner');
        }, 1500);
      } catch (err) {
        setStatus('error');
        setMessage('Failed to connect Outlook Calendar. Please try again.');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-primary">
      <div className="bg-background-secondary border border-border-subtle rounded-lg p-8 max-w-md w-full text-center space-y-4">
        {status === 'loading' && (
          <>
            <div className="w-10 h-10 border-4 border-[#0078D4] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-text-primary font-semibold">{message}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-12 h-12 bg-accent-green/10 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-accent-green font-semibold">{message}</p>
            <p className="text-text-secondary text-xs">Redirecting to planner...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-accent-red/10 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-accent-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-accent-red font-semibold">{message}</p>
            <button
              onClick={() => router.push('/planner')}
              className="mt-4 px-4 py-2 bg-[#0078D4] text-white text-xs font-semibold rounded hover:bg-[#106EBE] transition-colors"
            >
              Back to Planner
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function OutlookCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background-primary">
        <div className="w-10 h-10 border-4 border-[#0078D4] border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    }>
      <OutlookCallbackContent />
    </Suspense>
  );
}
