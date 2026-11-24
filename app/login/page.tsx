'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, KeyRound, Mail, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { authService } from '@/services/auth';
import { cn } from '@/utils/cn';
import { useStore } from '@/lib/store';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { updateUserProfile } = useStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const session = await authService.login(data.email, data.password);
      updateUserProfile({
        id: String(session.user.id),
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        avatar: "" // fallback
      });
      router.push('/dashboard');
    } catch (err) {
      setErrorMsg('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07070a] p-4 md:p-8 font-sans text-white w-full">
      {/* Background decoration elements */}
      <div className="absolute top-1/3 left-[15%] h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-blue/25 blur-[120px] animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-1/3 left-[30%] h-[600px] w-[600px] -translate-x-1/2 translate-y-1/2 rounded-full bg-indigo-500/25 blur-[140px] animate-pulse duration-[10000ms]" />
      
      {/* Background grid lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Split Layout Container */}
      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center px-4">
        
        {/* Left Column: Branding */}
        <div className="flex flex-col justify-center items-center md:items-start text-center md:text-left space-y-6 order-1">
          <div className="space-y-4">
            {/* Large Nurofin Logo */}
            <img 
              src="/logo-white.svg" 
              alt="Nurofin Logo" 
              className="h-10 md:h-12 w-auto animate-fade-in hover:scale-105 transition-transform duration-300 mx-auto md:mx-0"
            />
            {/* Large Tagline */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white max-w-lg">
              The Intelligence Layer <br className="hidden lg:block" />
              for <span className="bg-gradient-to-r from-accent-blue via-indigo-400 to-accent-blue bg-clip-text text-transparent bg-[size:200%_auto]">Modern Financial Services.</span>
            </h1>
          </div>
          <div className="w-12 h-1 bg-gradient-to-r from-accent-blue to-indigo-500 rounded-full" />
          <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
            Powering executive operations, data analytics, and real-time financial tracking in a unified workspace.
          </p>
        </div>

        {/* Right Column: Login Card */}
        <div className="flex justify-center w-full order-2">
          <div className="relative w-full max-w-lg bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] p-10 space-y-8 overflow-hidden">
            {/* Glowing border top */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-blue/40 to-transparent" />
            
            {/* Header Section */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-wide text-white">
                System Login
              </h2>
              <p className="text-xs text-slate-400">
                Enter credentials to access the Executive Operating System.
              </p>
            </div>

            {/* Error message */}
            {errorMsg && (
              <div className="bg-accent-red/10 border border-accent-red/20 rounded-lg p-3 text-center text-xs text-accent-red font-medium backdrop-blur-md">
                {errorMsg}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-accent-blue" /> Email Address
                </label>
                <Input
                  type="email"
                  placeholder="vincent@nurofin.com"
                  {...register('email')}
                  className={cn(
                    "bg-white/5 border-white/10 text-white placeholder-slate-500 focus-visible:ring-accent-blue focus-visible:border-accent-blue/50 h-11 text-sm",
                    errors.email ? 'border-accent-red focus-visible:ring-accent-red' : ''
                  )}
                />
                {errors.email && (
                  <span className="text-[10px] text-accent-red font-medium">{errors.email.message}</span>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-accent-blue" /> Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={cn(
                    "bg-white/5 border-white/10 text-white placeholder-slate-500 focus-visible:ring-accent-blue focus-visible:border-accent-blue/50 h-11 text-sm",
                    errors.password ? 'border-accent-red focus-visible:ring-accent-red' : ''
                  )}
                />
                {errors.password && (
                  <span className="text-[10px] text-accent-red font-medium">{errors.password.message}</span>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="relative w-full h-12 mt-6 overflow-hidden rounded-lg bg-gradient-to-r from-accent-blue to-indigo-600 hover:from-accent-blue-hover hover:to-indigo-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_4px_20px_rgba(59,130,246,0.3)] hover:shadow-[0_6px_24px_rgba(59,130,246,0.5)] disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Authenticating Gateway...
                  </>
                ) : (
                  <>
                    <span>Access System</span>
                    <Sparkles className="w-4 h-4 text-white/80 animate-pulse" />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="text-center pt-2 flex flex-col items-center justify-center gap-1.5">
              <span className="text-[10px] text-slate-500 tracking-wider font-mono uppercase">
                Authorized Personnel Only
              </span>
              <span className="text-[9px] text-slate-600 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
                Secured Connection • TLS 1.3 Certified
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
