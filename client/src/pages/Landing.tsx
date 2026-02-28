import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Plane, Hotel, Users, QrCode, FileSpreadsheet, Zap, ClipboardList, UserCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function Landing() {
  const { user } = useAuth();

  const stats = [
    { value: "500+", label: "Hotels Connected" },
    { value: "100+", label: "Airlines" },
    { value: "50K+", label: "Guests Managed" },
    { value: "99.9%", label: "Uptime" },
  ];

  const workflowSteps = [
    {
      step: "1",
      title: "Client Uploads Basics",
      desc: "Client uploads invite, schedule, and guest list to initialize the event workspace.",
      icon: ClipboardList,
    },
    {
      step: "2",
      title: "Labels & Rules Setup",
      desc: "Client configures labels (VIP/Staff/Family), budget limits, and offered options.",
      icon: Users,
    },
    {
      step: "3",
      title: "Guest Link Distribution",
      desc: "Each guest receives a unique link containing invite, RSVP, and booking journey.",
      icon: QrCode,
    },
    {
      step: "4",
      title: "Guest Self-Service",
      desc: "Guests RSVP, add +1s, book travel, request add-ons, and upload IDs with included/self-pay logic.",
      icon: Plane,
    },
    {
      step: "5",
      title: "Human-in-the-Loop",
      desc: "Agent/client review requests, approve changes, and finalize before ticketing.",
      icon: UserCheck,
    },
    {
      step: "6",
      title: "Reporting & Ground Ops",
      desc: "Generate final report and use manifest documents for ground team check and verification.",
      icon: FileSpreadsheet,
    },
  ];

  const [activeStep, setActiveStep] = useState("1");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="sticky top-0 w-full z-30 px-4 py-3 sm:px-6 sm:py-4 md:px-12 bg-background/85 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src="/favicon.png" alt="Vantage Logo" className="h-8 w-8 rounded-md object-cover" />
            <div className="text-xl sm:text-2xl italic font-bold text-primary">Vantage</div>
            <span className="hidden sm:inline-flex items-center px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-full">
              Powered by TBO
            </span>
          </div>
          <div className="flex gap-4 items-center">
            {user ? (
              <Link href="/dashboard">
                <button className="md:hidden px-4 py-2 bg-white/50 backdrop-blur border border-primary/10 rounded-full font-medium text-primary hover:bg-white transition-colors text-sm">
                  Go to Dashboard
                </button>
              </Link>
            ) : (
              <div className="hidden md:flex gap-2">
                <Link href="/auth/agent/signin">
                  <button className="px-5 py-2 border border-primary/30 rounded-full text-primary font-medium hover:bg-primary/5 transition-colors">
                    Agent Login
                  </button>
                </Link>
                <Link href="/auth/client/signin">
                  <button className="px-5 py-2 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors">
                    Client Login
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-4 pb-8 sm:pt-6 sm:pb-10 md:pt-8 md:pb-12 px-4 sm:px-6 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-[-20%] right-[-10%] w-[320px] h-[320px] sm:w-[450px] sm:h-[450px] md:w-[600px] md:h-[600px] bg-secondary/30 rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[260px] h-[260px] sm:w-[380px] sm:h-[380px] md:w-[500px] md:h-[500px] bg-accent/10 rounded-full blur-3xl opacity-50 pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/80 backdrop-blur border border-primary/10 rounded-full text-xs sm:text-sm font-medium text-primary mb-6 sm:mb-8"
          >
            <Zap className="w-4 h-4 text-orange-500" />
            TBO Voyagehacks 3.0 — Group Travel Innovation
          </motion.div>

          <motion.h1 
            className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-medium leading-tight text-primary mb-4 sm:mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            MICE & Destination Weddings <br />
            <span className="italic text-accent-foreground/80">Simplified.</span>
          </motion.h1>
          
          <motion.p 
                      className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-3xl mx-auto leading-relaxed px-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            The all-in-one platform for travel agents to manage group bookings, 
            guest logistics, and tiered hospitality — powered by <strong className="text-primary">TBO's real-time APIs</strong>.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-10 sm:mb-12 w-full sm:w-auto"
          >
            {user ? (
              <Link href="/dashboard">
                <button className="group w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-primary text-white rounded-full font-medium text-base sm:text-lg shadow-xl shadow-primary/20 hover:scale-105 transition-transform flex items-center justify-center gap-2">
                  Go to Dashboard
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
            ) : (
              <>
                <Link href="/auth/agent/signin">
                  <button className="group w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-primary text-white rounded-full font-medium text-base sm:text-lg shadow-xl shadow-primary/20 hover:scale-105 transition-transform flex items-center justify-center gap-2">
                    Start Managing Events
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
                <Link href="/auth/client/signin">
                  <button className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-white border-2 border-primary text-primary rounded-full font-medium text-base sm:text-lg hover:bg-primary hover:text-white transition-all">
                    I'm a Client
                  </button>
                </Link>
              </>
            )}
          </motion.div>

          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-3xl mx-auto"
          >
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-8 sm:py-10 md:py-12 px-4 sm:px-6 bg-white/50 backdrop-blur-sm border-t border-border/50">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-6 md:gap-8">
          {[
            { 
              icon: Hotel,
              title: "Live Hotel Search",
              desc: "Search and shortlist inventory from TBO hotel APIs with rates, occupancy, and room details in real time.",
            },
            { 
              icon: Plane,
              title: "Live Flight Search",
              desc: "Compare itinerary options from TBO flight APIs and assign group travel plans by guest tier.",
            },
            { 
              icon: Users,
              title: "Guest Experience Layer",
              desc: "Manage RSVP, approvals, rooming, and concierge requests with a secure guest portal flow.",
            }
          ].map((feature, idx) => (
            <motion.div 
              key={idx}
              className="p-6 rounded-2xl bg-muted/70 border border-border/40 shadow-sm hover:shadow-md transition-shadow"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
            >
              <div className="w-12 h-12 bg-secondary/50 rounded-xl flex items-center justify-center text-primary mb-6">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section className="py-8 sm:py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">How Vantage Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Built for TBO partner agents handling MICE and destination wedding operations at scale.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {workflowSteps.map((item, idx) => {
              const isActive = activeStep === item.step;
              return (
                <motion.button
                  key={item.step}
                  type="button"
                  onClick={() => setActiveStep((prev) => (prev === item.step ? "" : item.step))}
                  aria-expanded={isActive}
                  className={`text-left rounded-2xl border p-5 shadow-sm transition-colors h-[260px] ${
                    isActive ? "bg-secondary/35 border-primary/30" : "bg-white border-border/50 hover:bg-muted/30"
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.08 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isActive ? "bg-primary text-white" : "bg-secondary/60 text-primary"}`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">Step {item.step}</span>
                  </div>
                  <h3 className="text-base font-bold mb-1">{item.title}</h3>
                  <div className="mt-2 h-[104px] overflow-hidden">
                    <p className={`text-sm leading-relaxed text-muted-foreground transition-opacity duration-200 ${isActive ? "opacity-100" : "opacity-0"}`}>
                      {item.desc}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

    </div>
  );
}
