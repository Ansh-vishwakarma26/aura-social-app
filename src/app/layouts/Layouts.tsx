import React from "react";
import { Outlet } from "react-router";
import { DesktopSidebar, MobileBottomNav, MobileTopNav } from "../components/Navigation";
import { Logo } from "../components/ui/Logo";
import authHeroImage from "../../imports/Aonis___Skin_+_Hair_Branding.jpg";
import { NotificationProvider } from "../contexts/NotificationContext";
import { Sparkles, Shield, Zap } from "lucide-react";

export const MainLayout = () => {
  return (
    <NotificationProvider>
      <div className="flex min-h-screen relative bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300 overflow-hidden">
      {/* Background Gradient Mesh */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-zinc-200 dark:bg-zinc-800 opacity-40 dark:opacity-20 blur-[120px]"></div>
        <div className="absolute top-[10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-zinc-100 dark:bg-neutral-800 opacity-30 dark:opacity-15 blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[80vw] h-[80vw] rounded-full bg-zinc-200 dark:bg-zinc-900 opacity-40 dark:opacity-20 blur-[150px]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] dark:opacity-[0.05] mix-blend-overlay" style={{ filter: 'contrast(150%) brightness(100%)' }}></div>
      </div>
      
      <div className="relative z-10 flex w-full">
        <DesktopSidebar />
        <div className="flex-1 flex flex-col min-h-screen relative md:pl-64 pb-[68px] md:pb-0">
          <MobileTopNav />
          <main className="flex-1 w-full max-w-[600px] mx-auto pt-14 md:pt-8 md:py-8 px-4 md:px-0">
            <Outlet />
          </main>
          <MobileBottomNav />
        </div>
      </div>
    </div>
    </NotificationProvider>
  );
};

export const AuthLayout = () => {
  return (
    <div className="flex min-h-screen relative bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300 overflow-hidden items-center justify-center p-4">
      {/* Background Gradient Mesh */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-zinc-200 dark:bg-zinc-800 opacity-40 dark:opacity-20 blur-[120px]"></div>
        <div className="absolute top-[10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-zinc-100 dark:bg-neutral-800 opacity-30 dark:opacity-15 blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[80vw] h-[80vw] rounded-full bg-zinc-200 dark:bg-zinc-900 opacity-40 dark:opacity-20 blur-[150px]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] dark:opacity-[0.05] mix-blend-overlay" style={{ filter: 'contrast(150%) brightness(100%)' }}></div>
      </div>
      
      <div className="w-full max-w-4xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-3xl overflow-hidden flex flex-col md:flex-row relative z-10">
        {/* Left Side / Hero */}
        <div className="w-full md:w-1/2 p-8 text-white flex flex-col justify-between relative overflow-hidden hidden md:flex">
          <div className="relative z-10">
            <div className="w-16 h-16 flex items-center justify-center text-white mb-6">
              <Logo className="w-full h-full" />
            </div>
            <h1 className="text-4xl font-bold leading-tight mb-4">
              Your Life.<br />Your Network.
            </h1>
            <p className="text-white/90 text-lg">
              Connect with friends, join communities, and stay updated on what's happening.
            </p>
          </div>
          <img 
            src={authHeroImage}
            className="absolute inset-0 w-full h-full object-cover"
            alt="People"
          />
        </div>
        
        {/* Right Side / Content */}
        <div className="w-full md:w-1/2 p-8 md:p-12 relative flex items-center justify-center bg-white/40 dark:bg-zinc-950/40 backdrop-blur-3xl">
           <Outlet />
        </div>
      </div>
    </div>
  );
};
