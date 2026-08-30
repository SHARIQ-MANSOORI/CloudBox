import React from 'react';
import { Link } from 'react-router-dom';
import { Cloud, UploadCloud, History, Trash2, Share2, ShieldCheck } from 'lucide-react';

export const LandingPage = () => {
  const features = [
    {
      icon: <UploadCloud className="w-6 h-6 text-blue-600" />,
      title: 'Resumable Uploads',
      description: 'Pick up right where you left off, even if your connection drops mid-way.'
    },
    {
      icon: <History className="w-6 h-6 text-blue-600" />,
      title: 'Version History',
      description: 'Access past versions of your files easily and restore them whenever you need.'
    },
    {
      icon: <Trash2 className="w-6 h-6 text-blue-600" />,
      title: 'Trash & Recovery',
      description: 'Deleted files are kept safe for 30 days, giving you plenty of time to recover them.'
    },
    {
      icon: <Share2 className="w-6 h-6 text-blue-600" />,
      title: 'Secure Sharing',
      description: 'Share files with secure links and maintain full control over who has access.'
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-blue-600" />,
      title: 'End-to-End Encryption',
      description: "Your files stay private—encrypted in a way that even we can't read them."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-blue-100 selection:text-blue-700">
      {/* Background Soft Glow Accents */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-sky-100/60 rounded-full blur-3xl pointer-events-none" />

      {/* Hero Section */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center z-10 my-auto">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 mb-6 transition-transform hover:scale-105 duration-200">
          <Cloud className="w-10 h-10" />
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 mb-3">
          CloudBox
        </h1>
        <p className="text-lg text-slate-600 font-normal mb-8 max-w-md mx-auto">
          Your secure, effortless personal cloud storage space.
        </p>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 max-w-sm mx-auto mb-16">
          <Link
            to="/signup"
            className="w-full sm:w-auto inline-flex justify-center items-center py-3 px-8 rounded-xl text-sm font-semibold transition-all duration-200 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20"
          >
            Sign Up
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto inline-flex justify-center items-center py-3 px-8 rounded-xl text-sm font-semibold transition-all duration-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm"
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-5xl mx-auto w-full z-10 mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-slate-100 shadow-sm shadow-slate-200/50 flex flex-col items-center sm:items-start text-center sm:text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="p-3 bg-blue-50 rounded-xl mb-4">
                {feature.icon}
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer copyright */}
      <div className="text-center text-xs text-slate-400 z-10">
        &copy; {new Date().getFullYear()} CloudBox Inc. All rights reserved.
      </div>
    </div>
  );
};
