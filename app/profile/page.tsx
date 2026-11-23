'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { cn } from '@/utils/cn';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Github, 
  Linkedin, 
  Lock,
  Sliders,
  Moon,
  Sun,
  Shield,
  Eye,
  EyeOff,
  Check,
  CheckCircle,
  AlertCircle,
  Loader2,
  Key,
  Palette,
  CreditCard,
  Save,
  Upload
} from 'lucide-react';
import { usersService } from '@/services/users';
import { Input } from '@/components/ui/input';

export default function ProfilePage() {
  const { 
    userProfile, 
    updateUserProfile, 
    theme, 
    setTheme,
    themeColor,
    setThemeColor,
    customColor,
    setCustomColor
  } = useStore();
  const [activeTab, setActiveTab] = useState('profile');

  // Profile fields state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [github, setGithub] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropImageRef = useRef<HTMLImageElement>(null);

  // Cropper states
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('File size must be less than 5MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setCropperSrc(reader.result);
        setTranslateX(0);
        setTranslateY(0);
        setScale(1);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // allow selecting same file again
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - translateX, y: e.clientY - translateY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTranslateX(e.clientX - dragStart.x);
    setTranslateY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - translateX, y: touch.clientY - translateY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setTranslateX(touch.clientX - dragStart.x);
    setTranslateY(touch.clientY - dragStart.y);
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    
    let initialWidth = 280;
    let initialHeight = 280;
    
    if (naturalWidth > naturalHeight) {
      initialHeight = 280;
      initialWidth = (naturalWidth / naturalHeight) * 280;
    } else {
      initialWidth = 280;
      initialHeight = (naturalHeight / naturalWidth) * 280;
    }
    
    img.width = initialWidth;
    img.height = initialHeight;
  };

  const handleApplyCrop = () => {
    if (!cropImageRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill background with white to avoid black bars in JPEG format
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 300, 300);

    ctx.save();
    ctx.translate(150, 150);
    
    const scaleFactor = 300 / 220;
    ctx.translate(translateX * scaleFactor, translateY * scaleFactor);
    ctx.scale(scale, scale);
    
    const img = cropImageRef.current;
    const w = img.clientWidth * scaleFactor;
    const h = img.clientHeight * scaleFactor;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();

    const croppedUrl = canvas.toDataURL('image/jpeg', 0.95);
    setAvatar(croppedUrl);
    setCropperSrc(null);
  };

  // Password fields state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Security / MFA state
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [isRotatingCert, setIsRotatingCert] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Sync state with store profile on load
  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.name || '');
      setEmail(userProfile.email || '');
      setCompanyName(userProfile.department || '');
      setPhone(userProfile.phone || '');
      setGithub(userProfile.github || '');
      setLinkedin(userProfile.linkedin || '');
      setAvatar(userProfile.avatar || '');
    }
  }, [userProfile]);

  // Handle profile updates
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      showToast('Name and Email are required fields.', 'error');
      return;
    }

    setIsSavingProfile(true);
    try {
      const payload = {
        full_name: fullName,
        email: email,
        phone: phone || null,
        github: github || null,
        linkedin: linkedin || null,
        profile_picture: avatar || null,
        department: companyName || null
      };

      await usersService.updateUser(userProfile.id, payload);
      
      // Update state in Zustand store
      updateUserProfile({
        name: fullName,
        email: email,
        phone: phone,
        github: github,
        linkedin: linkedin,
        avatar: avatar,
        department: companyName
      });

      showToast('Profile settings updated successfully!');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile settings.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle password change
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      showToast('Password field cannot be empty.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    setIsChangingPassword(true);
    try {
      await usersService.updateUser(userProfile.id, { password: newPassword });
      showToast('Security password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err.message || 'Failed to update security password.', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle Cert rotation simulation
  const handleRotateCert = () => {
    setIsRotatingCert(true);
    setTimeout(() => {
      setIsRotatingCert(false);
      showToast('Enterprise security certificate rotated successfully.');
    }, 1500);
  };

  const navTabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'brand', label: 'Themes', icon: Palette },
    { id: 'security', label: 'Security & Password', icon: Lock },
  ];

  const renderProfileTab = () => {
    return (
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Avatar Upload Section */}
        <div className="flex items-center gap-5 pb-5 border-b border-border-subtle/50">
          <div className="relative flex-shrink-0">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={avatar} 
                alt="Profile Avatar" 
                className="w-16 h-16 rounded-full object-cover border border-border-subtle shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xl shadow-sm">
                {fullName ? fullName.charAt(0).toUpperCase() : 'P'}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 bg-background-primary border border-border-subtle hover:bg-surface-hover text-text-primary text-2xs font-semibold rounded-md transition-colors"
            >
              Upload Photo
            </button>
            <p className="text-[10px] text-text-muted">JPG, GIF or PNG. Max size of 5MB</p>
          </div>
        </div>

        {/* Form Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-2xs font-bold text-text-secondary uppercase tracking-wider">Full Name</label>
            <Input 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Vincent CEO"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-2xs font-bold text-text-secondary uppercase tracking-wider">Email Address</label>
            <Input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. vincent@nurofin.com"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-2xs font-bold text-text-secondary uppercase tracking-wider">Department Name</label>
            <Input 
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Nurofin Merchant"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-2xs font-bold text-text-secondary uppercase tracking-wider">Phone Number</label>
            <Input 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +1 (555) 019-2834"
            />
          </div>
        </div>

        {/* Social Integrations */}
        <div className="border-t border-border-subtle/50 pt-6 space-y-4">
          <h4 className="text-xs font-bold text-text-primary">Social Connections</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-text-secondary tracking-wider uppercase flex items-center gap-1.5">
                <Github className="w-3.5 h-3.5" /> GitHub Profile URL
              </label>
              <Input 
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                placeholder="https://github.com/username"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-text-secondary tracking-wider uppercase flex items-center gap-1.5">
                <Linkedin className="w-3.5 h-3.5" /> LinkedIn Profile URL
              </label>
              <Input 
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/username"
              />
            </div>
          </div>
        </div>

        {/* Skill Sets */}
        <div className="border-t border-border-subtle/50 pt-6 space-y-3">
          <h4 className="text-xs font-bold text-text-primary">Core Skill Sets</h4>
          <div className="flex flex-wrap gap-2 pt-1">
            {userProfile.skills && userProfile.skills.length > 0 ? (
              userProfile.skills.map((skill, idx) => (
                <span 
                  key={idx}
                  className="text-3xs bg-background-primary border border-border-subtle px-2.5 py-1.5 rounded font-bold text-text-secondary select-none uppercase tracking-wider"
                >
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-xs text-text-muted">No skills assigned.</span>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="border-t border-border-subtle/50 pt-6 space-y-3">
          <h4 className="text-2xs font-bold text-text-muted uppercase tracking-wider">Account Metadata</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-3xs font-bold text-text-secondary uppercase tracking-wider">
            <div className="p-3.5 bg-background-primary border border-border-subtle rounded-md flex flex-col gap-1">
              <span className="text-text-muted">System ID</span>
              <span className="font-mono text-2xs lowercase text-text-primary mt-0.5">{userProfile.id}</span>
            </div>
            <div className="p-3.5 bg-background-primary border border-border-subtle rounded-md flex flex-col gap-1">
              <span className="text-text-muted">Security Role</span>
              <span className="text-2xs text-accent-blue mt-0.5">{userProfile.role}</span>
            </div>
            <div className="p-3.5 bg-background-primary border border-border-subtle rounded-md flex flex-col gap-1">
              <span className="text-text-muted">Department</span>
              <span className="text-2xs text-text-primary mt-0.5">{userProfile.department || 'Executive Board'}</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end border-t border-border-subtle/50 pt-5">
          <button 
            type="submit" 
            disabled={isSavingProfile}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#121A2A] dark:bg-white text-white dark:text-[#0B1220] hover:bg-black/90 dark:hover:bg-white/90 text-xs font-bold rounded-md shadow transition-all duration-200"
          >
            {isSavingProfile ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save Changes
          </button>
        </div>
      </form>
    );
  };

  const renderBrandTab = () => {
    const presets = [
      { id: 'blue', label: 'Blue Preset', color: '#3B82F6' },
      { id: 'green', label: 'Emerald Mint', color: '#10B981' },
      { id: 'purple', label: 'Deep Purple', color: '#8B5CF6' },
      { id: 'orange', label: 'Sunset Amber', color: '#F59E0B' },
      { id: 'red', label: 'Crimson Red', color: '#EF4444' }
    ];

    const getPreviewColor = () => {
      if (themeColor === 'custom') return customColor;
      const match = presets.find(p => p.id === themeColor);
      return match ? match.color : '#3B82F6';
    };

    return (
      <div className="space-y-6">
        {/* Theme Mode */}
        <div>
          <h4 className="text-xs font-bold text-text-primary">Appearance Theme</h4>
          <p className="text-2xs text-text-secondary mt-0.5">Choose how Nurofin AI interface looks on your browser.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Light Theme Card */}
          <button
            type="button"
            onClick={() => {
              setTheme('light');
              showToast('Workspace appearance set to Light Mode.');
            }}
            className={cn(
              "group relative flex flex-col items-center justify-center p-6 bg-background-primary border-2 rounded-xl transition-all duration-300 overflow-hidden hover:scale-[1.01]",
              theme === 'light' 
                ? "border-accent-blue shadow-lg shadow-accent-blue/5" 
                : "border-border-subtle hover:border-text-muted"
            )}
          >
            <div className="w-10 h-10 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue mb-3 transition-transform group-hover:rotate-45 duration-500">
              <Sun className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-text-primary mb-1">Light Mode</span>
            <span className="text-3xs text-text-secondary text-center">Clean and bright executive environment.</span>
            {theme === 'light' && (
              <div className="absolute top-2.5 right-2.5 bg-accent-blue text-white rounded-full p-0.5 w-4.5 h-4.5 flex items-center justify-center">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            )}
          </button>

          {/* Dark Theme Card */}
          <button
            type="button"
            onClick={() => {
              setTheme('dark');
              showToast('Workspace appearance set to Dark Mode.');
            }}
            className={cn(
              "group relative flex flex-col items-center justify-center p-6 bg-background-primary border-2 rounded-xl transition-all duration-300 overflow-hidden hover:scale-[1.01]",
              theme === 'dark' 
                ? "border-accent-blue shadow-lg shadow-accent-blue/5" 
                : "border-border-subtle hover:border-text-muted"
            )}
          >
            <div className="w-10 h-10 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue mb-3 transition-transform group-hover:-rotate-12 duration-500">
              <Moon className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-text-primary mb-1">Dark Mode</span>
            <span className="text-3xs text-text-secondary text-center">Low-light optimized dashboard interface.</span>
            {theme === 'dark' && (
              <div className="absolute top-2.5 right-2.5 bg-accent-blue text-white rounded-full p-0.5 w-4.5 h-4.5 flex items-center justify-center">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            )}
          </button>
        </div>

        {/* Dynamic Accents Presets */}
        <div className="border-t border-border-subtle/50 pt-6 space-y-4">
          <div>
            <h4 className="text-xs font-bold text-text-primary">Theme Accent Color</h4>
            <p className="text-2xs text-text-secondary mt-0.5">Select a brand color preset for primary actions, indicators, and background glows.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setThemeColor(preset.id as any);
                  showToast(`${preset.label} theme color selected.`);
                }}
                className={cn(
                  "group relative flex items-center gap-2.5 px-4 py-3 bg-background-primary border-2 rounded-xl transition-all duration-300 hover:scale-[1.02]",
                  themeColor === preset.id
                    ? "border-accent-blue shadow-lg shadow-accent-blue/5"
                    : "border-border-subtle hover:border-text-muted"
                )}
              >
                <span 
                  className="w-5.5 h-5.5 rounded-full border border-white/10 shadow-sm flex items-center justify-center transition-transform group-hover:scale-110" 
                  style={{ backgroundColor: preset.color }}
                />
                <span className="text-xs font-bold text-text-primary pr-2">{preset.label}</span>
                {themeColor === preset.id && (
                  <div className="absolute top-2 right-2 bg-accent-blue text-white rounded-full p-0.5 w-3.5 h-3.5 flex items-center justify-center">
                    <Check className="w-2 h-2 stroke-[3]" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Mix Picker */}
        <div className="border-t border-border-subtle/50 pt-6 space-y-4">
          <div>
            <h4 className="text-xs font-bold text-text-primary">Custom Accent Mix</h4>
            <p className="text-2xs text-text-secondary mt-0.5">Choose or input a custom hex value to paint the dashboard.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Custom Option Button */}
            <button
              type="button"
              onClick={() => {
                setThemeColor('custom');
                showToast('Custom Brand Accent Mix selected.');
              }}
              className={cn(
                "group relative flex items-center gap-3 p-3 bg-background-primary border-2 rounded-xl transition-all duration-300 w-full sm:w-auto min-w-[190px] hover:scale-[1.01]",
                themeColor === 'custom'
                  ? "border-accent-blue shadow-lg shadow-accent-blue/5"
                  : "border-border-subtle hover:border-text-muted"
              )}
            >
              <div 
                className="w-8 h-8 rounded-full border border-white/20 shadow-sm flex items-center justify-center transition-transform group-hover:scale-105"
                style={{
                  background: themeColor === 'custom' ? customColor : 'linear-gradient(135deg, #3B82F6, #10B981, #8B5CF6, #F59E0B, #EF4444)'
                }}
              />
              <div className="flex flex-col items-start">
                <span className="text-xs font-bold text-text-primary">Custom Mix</span>
                <span className="text-[10px] text-text-muted mt-0.5 font-mono uppercase">{customColor}</span>
              </div>
              {themeColor === 'custom' && (
                <div className="absolute top-2 right-2 bg-accent-blue text-white rounded-full p-0.5 w-3.5 h-3.5 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
            </button>

            {/* Custom Color Picker Fields */}
            <div className={cn(
              "flex items-center gap-3 p-2 border border-border-subtle rounded-xl bg-background-primary w-full sm:w-auto transition-all duration-300", 
              themeColor !== 'custom' && "opacity-40 pointer-events-none"
            )}>
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider pl-2">Select Hex:</span>
              <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-border-subtle/50 flex-shrink-0 cursor-pointer">
                <input 
                  type="color"
                  value={customColor}
                  disabled={themeColor !== 'custom'}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer border-0 p-0 outline-none"
                />
              </div>
              <input 
                type="text"
                value={customColor}
                disabled={themeColor !== 'custom'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.match(/^#[0-9A-Fa-f]{0,6}$/)) {
                    setCustomColor(val);
                  }
                }}
                placeholder="#10B981"
                className="w-24 bg-background-secondary border border-border-subtle rounded px-2.5 py-1.5 text-xs text-text-primary font-mono outline-none focus:border-accent-blue"
              />
            </div>
          </div>
        </div>

        {/* Live Interface Preview */}
        <div className="border-t border-border-subtle/50 pt-6 space-y-4">
          <div>
            <h4 className="text-xs font-bold text-text-primary">Live Dashboard Preview</h4>
            <p className="text-2xs text-text-secondary mt-0.5">Visualize your custom background grid pattern and animated color glow below.</p>
          </div>

          <div className="border border-border-subtle/80 rounded-xl p-4 bg-background-primary relative overflow-hidden h-48 select-none shadow-sm">
            <div className="absolute top-2.5 left-3 text-[9px] uppercase font-bold text-text-muted tracking-wider z-20 bg-background-secondary/40 backdrop-blur-md px-1.5 py-0.5 rounded border border-border-subtle/30">Layout Mockup</div>
            
            {/* Grid & Glow Simulator */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
              <div 
                className="absolute top-[-25%] left-[-15%] w-[65%] h-[65%] rounded-full opacity-70 dark:opacity-80 animate-pulse duration-[8000ms]"
                style={{
                  background: `radial-gradient(circle, ${getPreviewColor()}55 0%, transparent 70%)`
                }}
              />
              <div 
                className="absolute bottom-[-20%] right-[-15%] w-[70%] h-[70%] rounded-full opacity-60 dark:opacity-70 animate-pulse duration-[10000ms]"
                style={{
                  background: `radial-gradient(circle, ${getPreviewColor()}44 0%, transparent 70%)`
                }}
              />
              <div 
                className="absolute inset-0 opacity-[0.65] dark:opacity-[0.5]"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, ${getPreviewColor()}44 1px, transparent 1px),
                    linear-gradient(to bottom, ${getPreviewColor()}44 1px, transparent 1px)
                  `,
                  backgroundSize: '16px 16px'
                }}
              />
            </div>

            {/* Layout Mockup Overlay */}
            <div className="absolute inset-x-4 bottom-4 top-10 flex gap-3 z-10">
              {/* Sidebar Mockup */}
              <div className="w-1/4 rounded bg-background-secondary border border-border-subtle p-2 flex flex-col gap-2 shadow-sm">
                <div className="h-2 w-10 rounded" style={{ backgroundColor: `${getPreviewColor()}` }} />
                <div className="h-1.5 w-12 rounded bg-text-muted/15" />
                <div className="h-1.5 w-14 rounded bg-text-muted/10" />
                <div className="h-1.5 w-12 rounded bg-text-muted/10" style={{ backgroundColor: `${getPreviewColor()}15` }} />
                <div className="h-1.5 w-13 rounded bg-text-muted/10" />
                <div className="mt-auto flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-text-muted/20" />
                  <div className="flex flex-col gap-0.5">
                    <div className="h-1 w-8 rounded bg-text-muted/25" />
                    <div className="h-0.5 w-5 rounded bg-text-muted/15" />
                  </div>
                </div>
              </div>
              {/* Main Mockup */}
              <div className="flex-1 flex flex-col gap-2">
                {/* Topbar Mockup */}
                <div className="h-6 rounded bg-background-secondary border border-border-subtle p-1.5 flex items-center justify-between shadow-sm">
                  <div className="h-1.5 w-20 rounded bg-text-muted/15" />
                  <div className="w-3.5 h-3.5 rounded-full bg-text-muted/25" />
                </div>
                {/* Content Area Mockup */}
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div className="rounded bg-background-secondary/70 border border-border-subtle/50 p-2 flex flex-col gap-1.5 shadow-sm backdrop-blur-[1px]">
                    <div className="h-2 w-10 rounded" style={{ backgroundColor: `${getPreviewColor()}` }} />
                    <div className="h-1 w-16 rounded bg-text-muted/15" />
                    <div className="h-1 w-12 rounded bg-text-muted/15" />
                  </div>
                  <div className="rounded bg-background-secondary/70 border border-border-subtle/50 p-2 flex flex-col gap-1.5 shadow-sm backdrop-blur-[1px]">
                    <div className="h-2 w-12 rounded bg-text-muted/25" />
                    <div className="h-1 w-10 rounded bg-text-muted/15" />
                    <div className="mt-auto h-2.5 w-2.5 rounded-full self-end" style={{ backgroundColor: `${getPreviewColor()}` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Interface Preferences */}
        <div className="border-t border-border-subtle/50 pt-6 space-y-4">
          <h4 className="text-xs font-bold text-text-primary">Interface Preferences</h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 bg-background-primary border border-border-subtle rounded-lg">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-text-primary">Enable UI Micro-animations</span>
                <span className="text-2xs text-text-muted mt-0.5">Show interactive transitions and visual effects.</span>
              </div>
              <input 
                type="checkbox" 
                defaultChecked
                className="w-4 h-4 accent-accent-blue rounded text-accent-blue cursor-pointer" 
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-border-subtle/50 pt-5">
          <button 
            type="button" 
            onClick={() => showToast('Theme preferences updated.')}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#121A2A] dark:bg-white text-white dark:text-[#0B1220] hover:bg-black/90 dark:hover:bg-white/90 text-xs font-bold rounded-md shadow transition-all duration-200"
          >
            <Save className="w-3.5 h-3.5" />
            Save Changes
          </button>
        </div>
      </div>
    );
  };

  const renderSecurityTab = () => {
    return (
      <div className="space-y-6">
        {/* Update Password Form */}
        <form onSubmit={handleSavePassword} className="space-y-4">
          <h4 className="text-xs font-bold text-text-primary flex items-center gap-2 pb-1 border-b border-border-subtle/30">
            <Key className="w-4 h-4 text-accent-blue" />
            Update Password
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-text-secondary uppercase tracking-wider">New Password</label>
              <div className="relative flex items-center">
                <Input 
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 text-text-muted hover:text-text-secondary focus:outline-none"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-text-secondary uppercase tracking-wider">Confirm Password</label>
              <div className="relative flex items-center">
                <Input 
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 text-text-muted hover:text-text-secondary focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button 
              type="submit" 
              disabled={isChangingPassword}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#121A2A] dark:bg-white text-white dark:text-[#0B1220] hover:bg-black/90 dark:hover:bg-white/90 text-xs font-bold rounded-md shadow transition-all duration-200"
            >
              {isChangingPassword ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save Password
            </button>
          </div>
        </form>

        {/* MFA */}
        <div className="border-t border-border-subtle/50 pt-6 space-y-4">
          <h4 className="text-xs font-bold text-text-primary flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent-green" />
            MFA Verification
          </h4>
          <p className="text-2xs text-text-secondary leading-relaxed">
            Enhance account security by requiring confirmation from your authentication device upon login.
          </p>

          <div className="flex items-center justify-between p-3.5 bg-background-primary border border-border-subtle rounded-lg">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-text-primary">Multi-Factor Authentication (MFA)</span>
              <span className={cn(
                "text-[10px] font-semibold mt-0.5",
                mfaEnabled ? "text-accent-green" : "text-text-muted"
              )}>
                {mfaEnabled ? 'ENABLED' : 'DISABLED'}
              </span>
            </div>
            
            <button 
              type="button"
              onClick={() => {
                setMfaEnabled(!mfaEnabled);
                showToast(mfaEnabled ? 'MFA disabled.' : 'MFA enabled successfully.');
              }}
              className={cn(
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                mfaEnabled ? "bg-accent-blue" : "bg-border-subtle"
              )}
            >
              <span className={cn(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                mfaEnabled ? "translate-x-5" : "translate-x-0"
              )} />
            </button>
          </div>
        </div>

        {/* Rotate Certificate */}
        <div className="border-t border-border-subtle/50 pt-6 space-y-4">
          <h4 className="text-xs font-bold text-text-primary">Enterprise Security signature</h4>
          <p className="text-2xs text-text-secondary leading-relaxed">
            Rotate your cryptographically generated enterprise security certificate to guarantee secure asset verification.
          </p>
          <button 
            type="button"
            onClick={handleRotateCert}
            disabled={isRotatingCert}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-background-primary border border-border-subtle hover:bg-surface-hover text-text-primary text-xs font-bold rounded-md shadow-sm transition-all duration-200"
          >
            {isRotatingCert && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Rotate Security Certificate
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto font-sans text-text-primary space-y-6">
      
      {/* Title Header area */}
      <div className="space-y-1 pb-4">
        <h2 className="text-xl font-bold text-text-primary tracking-wide">Account Settings</h2>
        <p className="text-xs text-text-secondary">Manage your account preferences, security, and team access.</p>
      </div>

      {/* Main vertical tabs layout */}
      <div className="flex flex-col md:flex-row gap-8 items-start">
        
        {/* Left Side: Navigation Tabs List */}
        <div className="w-full md:w-60 flex-shrink-0 flex flex-row md:flex-col gap-1 bg-background-secondary border border-border-subtle p-1.5 sm:p-2 rounded-lg shadow-sm overflow-x-auto scrollbar-none">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-md text-xs font-bold transition-all text-left whitespace-nowrap flex-shrink-0 md:w-full",
                  isActive 
                    ? "bg-accent-blue/10 text-accent-blue dark:bg-white/[0.05] dark:text-white" 
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary dark:text-slate-400 dark:hover:bg-white/[0.03] dark:hover:text-white"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Side: Active Settings card view */}
        <div className="flex-1 w-full bg-background-secondary border border-border-subtle rounded-lg shadow-md overflow-hidden">
          
          {/* Card header banner */}
          <div className="px-6 py-4 border-b border-border-subtle bg-surface-card/10 flex items-center gap-2">
            {activeTab === 'profile' && <User className="w-4 h-4 text-text-secondary" />}
            {activeTab === 'brand' && <Palette className="w-4 h-4 text-text-secondary" />}
            {activeTab === 'security' && <Lock className="w-4 h-4 text-text-secondary" />}
            <span className="text-xs font-bold text-text-primary">
              {navTabs.find(t => t.id === activeTab)?.label}
            </span>
          </div>

          {/* Card inner body content */}
          <div className="p-6">
            {activeTab === 'profile' && renderProfileTab()}
            {activeTab === 'brand' && renderBrandTab()}
            {activeTab === 'security' && renderSecurityTab()}
          </div>
        </div>

      </div>

      {/* Cropper Modal Overlay */}
      {cropperSrc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background-secondary border border-border-subtle rounded-xl max-w-sm w-full p-5 shadow-2xl flex flex-col items-center space-y-4 animate-none">
            
            <div className="w-full flex items-center justify-between border-b border-border-subtle/50 pb-2">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Crop Profile Photo</h3>
              <button 
                type="button" 
                onClick={() => setCropperSrc(null)}
                className="text-text-muted hover:text-text-primary text-xs font-semibold"
              >
                Cancel
              </button>
            </div>

            {/* Viewport Box */}
            <div 
              className="relative w-[280px] h-[280px] bg-black rounded-lg overflow-hidden border border-border-subtle cursor-move select-none touch-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
            >
              {/* Outer Semitransparent Mask */}
              <div className="absolute inset-0 border-[30px] border-black/60 pointer-events-none z-10" />
              {/* Inner Circle outline */}
              <div className="absolute top-[30px] left-[30px] w-[220px] h-[220px] rounded-full border border-white pointer-events-none z-20 shadow-[0_0_0_9999px_rgba(0,0,0,0.3)]" />
              
              {/* Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                ref={cropImageRef}
                src={cropperSrc} 
                alt="Avatar Crop Preview" 
                draggable={false}
                style={{
                  transform: `translate(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px)) scale(${scale})`,
                  transformOrigin: 'center center',
                }}
                className="max-w-none absolute top-1/2 left-1/2"
                onLoad={handleImageLoad}
              />
            </div>

            {/* Zoom Slider */}
            <div className="w-full space-y-1">
              <div className="flex justify-between text-[10px] text-text-secondary font-bold uppercase">
                <span>Zoom</span>
                <span>{Math.round(scale * 100)}%</span>
              </div>
              <input 
                type="range"
                min="0.3"
                max="3"
                step="0.01"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full accent-accent-blue cursor-pointer h-1 bg-background-primary rounded-lg appearance-none"
              />
            </div>

            {/* Apply Button */}
            <button
              type="button"
              onClick={handleApplyCrop}
              className="w-full py-2.5 bg-accent-blue hover:bg-accent-blue-hover text-white text-xs font-bold rounded-md shadow transition-colors"
            >
              Apply Crop
            </button>

          </div>
        </div>
      )}

      {/* Floating Toast Alert Banner */}
      {toast && (
        <div className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg border shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-300",
          toast.type === 'success' 
            ? "bg-background-secondary border-accent-green/20 text-accent-green" 
            : "bg-background-secondary border-accent-red/20 text-accent-red"
        )}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="text-xs font-bold text-text-primary">{toast.message}</span>
        </div>
      )}
      
    </div>
  );
}
