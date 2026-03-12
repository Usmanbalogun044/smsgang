import Link from "next/link";
import SearchRedirect from "@/components/SearchRedirect";

const trustedApps = [
  { icon: "chat", name: "WhatsApp" },
  { icon: "send", name: "Telegram" },
  { icon: "mail", name: "Google" },
  { icon: "photo_camera", name: "Instagram" },
  { icon: "movie", name: "Netflix" },
];

const quickServices = [
  { icon: "chat", name: "WhatsApp", price: "₦75" },
  { icon: "send", name: "Telegram", price: "₦120" },
  { icon: "mail", name: "Google", price: "₦50" },
];

const steps = [
  {
    num: "1",
    icon: "ads_click",
    title: "Select Service",
    desc: "Choose the app and country for your temporary number.",
    highlight: false,
  },
  {
    num: "2",
    icon: "payments",
    title: "Make Payment",
    desc: "Pay securely in Naira via Bank Transfer, Card, or USSD.",
    highlight: false,
  },
  {
    num: "3",
    icon: "mark_chat_read",
    title: "Receive Code",
    desc: "Your SMS code appears instantly on your dashboard.",
    highlight: true,
  },
];

const features = [
  {
    icon: "public",
    title: "Global Reach",
    desc: "Instant access to mobile numbers from over 150 countries. Perfect for bypass regional restrictions.",
  },
  {
    icon: "speed",
    title: "Lightning Fast",
    desc: "Optimized routes ensure your verification code reaches you in seconds, not minutes.",
  },
  {
    icon: "account_balance_wallet",
    title: "Local Payments",
    desc: "Zero exchange rate worries. Top up your wallet easily using standard Nigerian payment methods.",
  },
];

export default function Home() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-16 pb-24 lg:pt-24 lg:pb-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
            {/* Left — copy */}
            <div className="flex flex-col gap-8 flex-1 text-center lg:text-left">
              <div className="flex flex-col gap-6">
                <div
                  className="inline-flex items-center gap-2 border border-[#0f6df0]/20 text-[#0f6df0] text-[13px] font-bold uppercase tracking-wider px-4 py-2 rounded-full w-fit mx-auto lg:mx-0"
                  style={{ background: "rgba(15,109,240,0.05)" }}
                >
                  <span className="flex h-2 w-2 rounded-full bg-[#0f6df0] animate-pulse" />
                  Verified &amp; Secure SMS Gateway
                </div>

                <h1 className="text-slate-900 text-5xl md:text-7xl font-black leading-[1.1] tracking-tight">
                  Reliable SMS for{" "}
                  <br className="hidden md:block" />
                  <span className="text-[#0f6df0]">300+ Digital Apps</span>
                </h1>

                <p className="text-slate-600 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  Receive instant verification codes from global numbers.
                  Privacy-focused, high-speed delivery for WhatsApp, Telegram,
                  and more.{" "}
                  <span className="font-bold text-slate-900">From ₦50.</span>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-5">
                <Link
                  href="/register"
                  className="w-full sm:w-auto flex min-w-[200px] items-center justify-center rounded-2xl h-16 px-10 bg-[#0f6df0] text-white text-lg font-bold transition-all hover:-translate-y-1"
                  style={{ boxShadow: "0 20px 40px rgba(15,109,240,0.3)" }}
                >
                  Get a Number Now
                </Link>
                <Link
                  href="/services"
                  className="w-full sm:w-auto flex min-w-[200px] items-center justify-center rounded-2xl h-16 px-10 border border-slate-200 text-slate-700 text-lg font-bold hover:bg-slate-50 transition-all"
                >
                  View Full Pricing
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-8 mt-4 pt-8 border-t border-slate-100">
                {["100% Privacy", "Instant SMS", "API Access"].map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <span
                      className="material-symbols-outlined text-green-500"
                      style={{ fontSize: 20 }}
                    >
                      check_circle
                    </span>
                    <span className="text-sm font-semibold text-slate-500">{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — image */}
            <div className="flex-1 w-full relative">
              <div
                className="relative z-10 rounded-[2.5rem] overflow-hidden border-8 border-white bg-slate-100"
                style={{ boxShadow: "0 32px 64px -16px rgba(0,0,0,0.15)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1000&auto=format&fit=crop"
                  alt="User receiving SMS verification on smartphone"
                  className="w-full h-full object-cover aspect-square"
                />
              </div>
              {/* Floating verification badge */}
              <div
                className="absolute -bottom-6 -left-6 z-20 bg-white p-5 rounded-2xl border border-slate-100 hidden md:block"
                style={{ boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-green-600"
                      style={{ fontSize: 20 }}
                    >
                      done_all
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                      Verification
                    </p>
                    <p className="text-sm font-black text-slate-900">Successful!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trusted By ───────────────────────────────────────── */}
      <section className="py-12 border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-sm font-bold text-slate-400 uppercase tracking-widest mb-10">
            Trusted for verifications on
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 hover:opacity-100 grayscale hover:grayscale-0 transition-all">
            {trustedApps.map((app) => (
              <div key={app.name} className="flex items-center gap-2 text-xl font-bold text-slate-800">
                <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
                  {app.icon}
                </span>
                {app.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Find Your Service ────────────────────────────────── */}
      <section className="py-24 bg-white" id="pricing">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              Find Your Service
            </h2>
            <p className="text-slate-500">
              Instantly check availability and pricing for any application.
            </p>
          </div>

          {/* Search input */}
          <div className="relative group max-w-3xl mx-auto">
            <div
              className="absolute -inset-1 rounded-[2rem] blur opacity-25 group-focus-within:opacity-50 transition duration-500"
              style={{ background: "linear-gradient(to right, #0f6df0, #2563eb)" }}
            />
            <div className="relative flex items-center bg-white rounded-2xl md:rounded-3xl p-2 shadow-2xl border border-slate-100">
              <div className="pl-6 text-slate-400">
                <span className="material-symbols-outlined" style={{ fontSize: 28 }}>
                  search
                </span>
              </div>
              <SearchRedirect />
              <Link
                href="/services"
                className="bg-[#0f6df0] hover:bg-blue-600 text-white px-8 md:px-12 py-4 md:py-5 rounded-xl md:rounded-2xl font-bold text-lg transition-all flex-shrink-0"
                style={{ boxShadow: "0 8px 24px rgba(15,109,240,0.2)" }}
              >
                Check Price
              </Link>
            </div>
          </div>

          {/* Quick service chips */}
          <div className="flex flex-wrap justify-center gap-4 mt-12">
            {quickServices.map((s) => (
              <Link
                key={s.name}
                href={`/services/${s.name.toLowerCase()}`}
                className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-[#0f6df0]/30 hover:bg-[#0f6df0]/5 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-[#0f6df0]">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    {s.icon}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-400 uppercase">{s.name}</p>
                  <p className="text-sm font-black text-slate-900">From {s.price}</p>
                </div>
              </Link>
            ))}
            <div className="flex items-center gap-2 px-6 py-3 bg-green-500/10 text-green-600 rounded-full text-xs font-black uppercase tracking-widest border border-green-500/20">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
              </span>
              1,240 Online
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6">
              Simple 3-Step Process
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Get your verification code in under 60 seconds. No technical skills required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Dashed connector */}
            <div className="hidden md:block absolute top-[40px] left-0 w-full h-0.5 border-t-2 border-dashed border-slate-200 -z-10" />

            {steps.map((step) => (
              <div key={step.num} className="flex flex-col items-center text-center gap-6">
                <div
                  className={`w-20 h-20 rounded-3xl shadow-xl flex items-center justify-center relative border ${
                    step.highlight
                      ? "bg-[#0f6df0] border-transparent"
                      : "bg-white border-slate-100"
                  }`}
                  style={
                    step.highlight
                      ? { boxShadow: "0 8px 24px rgba(15,109,240,0.3)" }
                      : {}
                  }
                >
                  <span
                    className="absolute -top-3 -right-3 w-8 h-8 rounded-full text-white text-sm font-black flex items-center justify-center"
                    style={{ background: step.highlight ? "#1e293b" : "#0f6df0" }}
                  >
                    {step.num}
                  </span>
                  <span
                    className={`material-symbols-outlined ${
                      step.highlight ? "text-white" : "text-[#0f6df0]"
                    }`}
                    style={{ fontSize: 36 }}
                  >
                    {step.icon}
                  </span>
                </div>
                <h4 className="text-xl font-bold text-slate-900">{step.title}</h4>
                <p className="text-slate-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((f) => (
              <div
                key={f.title}
                className="group p-10 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-2xl hover:border-[#0f6df0]/10 transition-all duration-300"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform"
                  style={{ background: "rgba(15,109,240,0.05)", color: "#0f6df0" }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 28 }}>
                    {f.icon}
                  </span>
                </div>
                <h4 className="text-2xl font-black text-slate-900 mb-4">{f.title}</h4>
                <p className="text-slate-600 leading-relaxed text-lg">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 pb-32">
        <div
          className="relative bg-slate-900 rounded-[3rem] p-12 md:p-24 overflow-hidden"
          style={{ boxShadow: "0 48px 100px rgba(0,0,0,0.2)" }}
        >
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="max-w-xl text-center md:text-left">
              <h2 className="text-white text-4xl md:text-6xl font-black mb-6 leading-tight">
                Ready to secure your privacy?
              </h2>
              <p className="text-white/70 text-xl font-medium">
                Join 50,000+ satisfied users today. Setup takes less than a minute.
              </p>
            </div>
            <div className="shrink-0">
              <Link
                href="/register"
                className="bg-white text-slate-900 px-12 py-6 rounded-2xl text-xl font-black hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all inline-block"
                style={{ boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}
              >
                Create Account
              </Link>
            </div>
          </div>
          {/* Decorative blobs */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div
            className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full blur-3xl"
            style={{ background: "rgba(15,109,240,0.2)" }}
          />
        </div>
      </section>
    </>
  );
}
