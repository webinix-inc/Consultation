// Consultant Dashboard – production-stable (exact UI)
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, ClipboardList, IndianRupee, Users, Clock, CheckCircle2, TrendingUp, TrendingDown, Check, X, Search, RefreshCw } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import { useQuery } from "@tanstack/react-query";
import DashboardAPI from "@/api/dashboard.api";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

// ------------------------------
// Types
// ------------------------------
interface StatItem {
  id: string;
  title: string;
  value: string;
  delta: string;
  up: boolean;
}

interface ClientStats {
  total: number;
  active: number;
  inactive: number;
  activePercent: number;
  inactivePercent: number;
}

interface Appointment {
  id: string;
  name: string;
  with?: string;
  date?: string;
  avatar: string;
  time: string;
  status: string;
  tag?: string;
}

interface DashboardData {
  stats: StatItem[];
  clientStats: ClientStats;
  recentAppointments: Appointment[];
  monthlyRevenueTrends?: any[];
  activityTrend?: number[];
  performance?: any;
  metrics?: any;
  monthlyApptTrends?: { name: string; total: number; completed: number }[];
}

// ------------------------------
// Utils
// ------------------------------
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const sparkline = (n: number, base = 50) =>
  Array.from({ length: n }).map((_, i) => ({ x: i, y: Math.max(5, Math.round(base + (Math.sin(i / 2) * 12 + (Math.random() - 0.5) * 10))) }));

// Compute active tick count for a dotted gauge
export function computeActiveTicks(totalTicks: number, percent: number) {
  return Math.floor((clamp(percent, 0, 100) / 100) * totalTicks);
}

// ------------------------------
// Charts
// ------------------------------
function MiniRing({ percent, size = 40, stroke = 6, color = "#1F7AB7", icon }: { percent: number; size?: number; stroke?: number; color?: string; icon: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (clamp(percent, 0, 100) / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="block">
        <g transform={`translate(${size / 2}, ${size / 2}) rotate(-90)`}>
          <circle r={r} cx={0} cy={0} fill="none" stroke={color} strokeOpacity={0.15} strokeWidth={stroke} />
          <circle r={r} cx={0} cy={0} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`} />
        </g>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="grid place-items-center rounded-full" style={{ width: size - stroke - 6, height: size - stroke - 6, backgroundColor: color }}>
          <span className="text-white" style={{ lineHeight: 0 }}>{icon}</span>
        </div>
      </div>
    </div>
  );
}

function Sparkline({ data, stroke }: { data: { x: number; y: number }[]; stroke: string }) {
  return (
    <div className="h-20 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
          <defs>
            <linearGradient id={`area-${stroke}`} x1="0" y1="0" x2="0" y2="2">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.25} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="y" stroke={stroke} fill={`url(#area-${stroke})`} strokeWidth={2.2} dot={false} activeDot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Two concentric dotted arcs: OUTER (blue) full sweep, INNER (purple) progress
function ClientGauge({ percent, size = 230 }: { percent: number; size?: number }) {
  const totalTicks = 60;     // fewer ticks → wider spacing between dashes
  const startDeg = -225;     // starting angle
  const sweepDeg = 270;      // arc length – leaves bottom-left gap

  // Colors
  const outerColor = "#1F7AB7"; // blue
  const innerColor = "#6D28D9"; // purple

  // Geometry
  const radius = size / 2;
  const outerTickLen = Math.round(size * 0.09);
  const outerTickWidth = Math.max(5, Math.round(size * 0.022));
  const outerInnerR = radius - outerTickLen;

  // Increase distance between the two rings
  const ringGap = Math.round(size * 0.09); // previously ~0.065
  const innerTickLen = outerTickLen;
  const innerInnerR = outerInnerR - ringGap - innerTickLen;

  // Make inner ring visually thinner to improve hierarchy
  const outerMidR = outerInnerR + outerTickLen / 2;
  const innerMidR = innerInnerR + innerTickLen / 2;
  const radiusRatio = innerMidR / outerMidR;
  const innerTickWidth = Math.max(3, Math.round(outerTickWidth * radiusRatio * 0.8)); // thinner

  const activeInner = computeActiveTicks(totalTicks, percent);

  const point = (angle: number, innerR: number, len: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: Math.cos(rad) * (innerR + len / 2), y: Math.sin(rad) * (innerR + len / 2) };
  };

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block select-none">
        <g transform={`translate(${radius}, ${radius})`}>
          {/* OUTER FULL RING (blue) */}
          {Array.from({ length: totalTicks }).map((_, i) => {
            const angle = startDeg + (i / (totalTicks - 1)) * sweepDeg;
            const { x, y } = point(angle, outerInnerR, outerTickLen);
            return (
              <rect
                key={`o-${i}`}
                x={-outerTickWidth / 2}
                y={-(outerTickLen / 2)}
                width={outerTickWidth}
                height={outerTickLen}
                rx={outerTickWidth / 2}
                ry={outerTickWidth / 2}
                fill={outerColor}
                transform={`translate(${x}, ${y}) rotate(${angle + 90})`}
              />
            );
          })}

          {/* INNER PROGRESS RING (purple) */}
          {Array.from({ length: activeInner }).map((_, i) => {
            const angle = startDeg + (i / (totalTicks - 1)) * sweepDeg;
            const { x, y } = point(angle, innerInnerR, innerTickLen);
            return (
              <rect
                key={`i-${i}`}
                x={-innerTickWidth / 2}
                y={-(innerTickLen / 2)}
                width={innerTickWidth}
                height={innerTickLen}
                rx={innerTickWidth / 2}
                ry={innerTickWidth / 2}
                fill={innerColor}
                transform={`translate(${x}, ${y}) rotate(${angle + 90})`}
              />
            );
          })}
        </g>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center leading-tight">
          <div className="text-[12px] text-muted-foreground">All Clients</div>
          <div className="text-[24px] font-semibold">{Math.round(clamp(percent, 0, 100))}%</div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------
// UI Blocks
// ------------------------------
function StatCard({ title, value, delta, up, icon: Icon, stroke, data }: any) {
  return (
    <Card className="shadow-sm border-muted/50 hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${stroke}15`, color: stroke }}>
              <Icon className="h-5 w-5" />
            </span>
            {title}
          </CardTitle>
          <Badge variant="secondary" className={cn("text-xs bg-transparent p-0", up ? "text-emerald-600" : "text-red-600")}>
            {up ? (
              <span className="inline-flex items-center gap-1"><TrendingUp className="h-3 w-3" />{delta}</span>
            ) : (
              <span className="inline-flex items-center gap-1"><TrendingDown className="h-3 w-3" />{delta}</span>
            )}
          </Badge>
        </div>
        <div className="text-2xl font-bold mt-2">{value}</div>
      </CardHeader>
      <CardContent className="pt-1 p-0">
        <Sparkline data={data} stroke={stroke} />
      </CardContent>
    </Card>
  );
}

function AppointmentItem({ a }: { a: Appointment }) {
  return (
    <div className="flex items-center justify-between py-4 px-1 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
      <div className="flex items-center gap-3">
        {/* Avatar Added Back */}
        <Avatar className="h-10 w-10 border border-gray-200">
          <AvatarImage src={a.avatar} />
          <AvatarFallback className="bg-primary/10 text-primary">{a.name.split(" ").map((s: string) => s[0]).join("")}</AvatarFallback>
        </Avatar>

        {/* Col 1: Name and With */}
        <div className="flex flex-col min-w-[140px] sm:min-w-[180px]">
          <span className="font-semibold text-gray-900 text-base">{a.name}</span>
          <span className="text-sm text-gray-500 mt-0.5">with {a.with || "Consultant"}</span>
        </div>
      </div>

      {/* Col 2: Category Pill - Hidden on very small screens */}
      <div className="hidden sm:flex justify-center flex-1">
        {a.tag && (
          <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
            {a.tag}
          </span>
        )}
      </div>

      {/* Col 3: Date/Time & Status */}
      <div className="flex items-center gap-3 sm:gap-6 text-right">
        <div className="hidden sm:flex flex-col items-end">
          {a.date && <span className="text-xs text-slate-500 font-medium">{a.date}</span>}
          <span className="text-sm text-slate-900 font-bold mt-0.5 whitespace-nowrap">{a.time}</span>
        </div>

        <div className={cn("px-3 py-1 rounded-full text-xs font-medium min-w-[80px] text-center",
          a.status === 'Confirmed' ? 'bg-blue-100 text-blue-600' :
            a.status === 'Upcoming' ? 'bg-blue-100 text-blue-600' :
              a.status === 'Completed' ? 'bg-green-100 text-green-600' :
                'bg-gray-100 text-gray-600'
        )}>
          {a.status}
        </div>
      </div>
    </div>
  );
}

// ------------------------------
// Sub-Dashboards
// ------------------------------

const ConsultantDashboard = () => {
  const navigate = useNavigate();
  const [viewType, setViewType] = React.useState<"monthly" | "yearly">("monthly");
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());

  const { data, isLoading, refetch } = useQuery<DashboardData>({
    queryKey: ["consultant-stats", viewType, selectedDate, selectedYear],
    queryFn: () => {
      const [year, month] = selectedDate.split("-").map(Number);
      return DashboardAPI.getConsultantStats({
        viewType,
        month: viewType === "monthly" ? month : undefined,
        year: viewType === "monthly" ? year : selectedYear,
      });
    },
  });

  const stats = data?.stats || [
    { id: "total", title: "Completed Appointments", value: "0", delta: "+0%", up: true },
    { id: "today", title: "Today Appointments", value: "0", delta: "+0%", up: true },
    { id: "active", title: "Active Clients", value: "0", delta: "+0%", up: true },
    { id: "revenue", title: "Total Revenue", value: "₹0", delta: "+0%", up: true },
  ];

  const clientStats = data?.clientStats || {
    total: 0,
    active: 0,
    inactive: 0,
    activePercent: 0,
    inactivePercent: 0
  };

  const monthlyRevenueTrends = data?.monthlyRevenueTrends || [];
  const activityTrend = data?.activityTrend || [];

  // Add icons and colors to stats
  const enrichedStats = stats.map((s: StatItem) => {
    let icon = ClipboardList;
    let stroke = "#5E8BFF";
    let chartData = sparkline(10, 5); // Default flat-ish line

    if (s.id === "total" || s.id === "today") {
      // Use activity trend for appointment cards sparkline
      if (activityTrend.length > 0) {
        chartData = activityTrend.map((val, i) => ({ x: i, y: val }));
      } else {
        // Fallback: empty array to render flat line (length is arbitrary, say 10 or 30)
        chartData = Array.from({ length: 30 }).map((_, i) => ({ x: i, y: 0 }));
      }
    }

    if (s.id === "today") {
      icon = Calendar;
      stroke = "#F97316";
    }

    if (s.id === "active") {
      icon = Users;
      stroke = "#8B5CF6";
      // For active clients, we don't have a trend history in the current API, so we show a flat line to avoid fake data.
      chartData = Array(10).fill(0).map((_, i) => ({ x: i, y: 0 }));
    }

    if (s.id === "revenue") {
      icon = IndianRupee;
      stroke = "#EC4899";
      if (monthlyRevenueTrends.length > 0) {
        chartData = monthlyRevenueTrends.map((item: { revenue: number }, i: number) => ({ x: i, y: item.revenue }));
      } else {
        chartData = Array.from({ length: 6 }).map((_, i) => ({ x: i, y: 0 }));
      }
    }

    return { ...s, icon, stroke, data: chartData };
  });

  const recentAppointments = data?.recentAppointments || [];

  if (isLoading) return <div className="p-4">Loading dashboard...</div>;

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div></div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewType("monthly")}
              className={`px-3 py-1 text-sm font-medium rounded-md transition ${viewType === "monthly" ? "bg-white shadow text-indigo-600" : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setViewType("yearly")}
              className={`px-3 py-1 text-sm font-medium rounded-md transition ${viewType === "yearly" ? "bg-white shadow text-indigo-600" : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Yearly
            </button>
          </div>

          {/* Date Selector */}
          {viewType === "monthly" ? (
            <input
              type="month"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          ) : (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[100px]"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => refetch()}
            className="p-2 border rounded-md hover:bg-gray-100 transition"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {enrichedStats.map((s: any) => (
          <StatCard className="p-0" key={s.id} {...s} />
        ))}
      </div>

      {/* Middle Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent Appointments */}
        <Card className="xl:col-span-2 shadow-sm border-muted/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Appointment</CardTitle>
              <Button variant="outline" onClick={() => navigate("/appointments")} size="sm">All Appointments</Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y">
              {recentAppointments.length > 0 ? recentAppointments.map((a: Appointment, i: number) => (
                <AppointmentItem key={i} a={a} />
              )) : <div className="py-4 text-center text-muted-foreground text-sm">No recent appointments</div>}
            </div>
          </CardContent>
        </Card>

        {/* Client Panel */}
        <Card className="shadow-sm border-muted/50">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Client</CardTitle>
              <Button variant="outline" onClick={() => navigate("/clients")} size="sm">View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div className="relative w-full">
                <ClientGauge percent={clientStats.activePercent || 0} />
              </div>

              {/* Active / Inactive mini rings */}
              <div className="mt-4 w-full space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MiniRing percent={clientStats.activePercent} color="#1F7AB7" icon={<Check className="h-4 w-4" />} />
                    <div>
                      <div className="font-medium leading-tight">Active</div>
                      <div className="text-xs text-muted-foreground leading-tight">{clientStats.active} Clients</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium">{clientStats.activePercent}%</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MiniRing percent={clientStats.inactivePercent} color="#6D28D9" icon={<X className="h-4 w-4" />} />
                    <div>
                      <div className="font-medium leading-tight">Inactive</div>
                      <div className="text-xs text-muted-foreground leading-tight">{clientStats.inactive} Clients</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium">{clientStats.inactivePercent}%</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

const ClientDashboard = () => {
  const [viewType, setViewType] = useState<"monthly" | "yearly">("monthly");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data, isLoading, refetch } = useQuery<DashboardData>({
    queryKey: ["client-stats", viewType, selectedDate, selectedYear],
    queryFn: () => {
      const [year, month] = selectedDate.split("-").map(Number);
      return DashboardAPI.getClientStats({
        viewType,
        month: viewType === "monthly" ? month : undefined,
        year: viewType === "monthly" ? year : selectedYear,
      });
    },
  });

  const navigate = useNavigate();
  // Backend now returns 'upcoming', 'completed', 'total', 'spent' in stats array.
  const rawStats = data?.stats || [
    { id: "total", title: "Total Appointments", value: "0", delta: "+0%", up: true },
    { id: "completed", title: "Completed Sessions", value: "0", delta: "+0%", up: true },
    { id: "upcoming", title: "Upcoming Appointments", value: "0", delta: "+0%", up: true },
  ];

  // We want to show all stats returned by backend, so we don't filter 'spent' anymore.
  const stats = rawStats;
  // const monthlySpendingTrends = data?.monthlySpendingTrends || [];
  const monthlyApptTrends = data?.monthlyApptTrends || [];
  const activityTrend = data?.activityTrend || [];

  // Add icons and colors
  const enrichedStats = stats.map((s: StatItem) => {
    let icon = Calendar;
    let stroke = "#5E8BFF";
    let chartData = sparkline(24, 10); // Default fallback

    if (s.id === "total") {
      icon = ClipboardList;
      stroke = "#2563EB";
      if (activityTrend.length > 0) {
        chartData = activityTrend.map((val, i) => ({ x: i, y: val }));
      } else if (monthlyApptTrends.length > 0) {
        chartData = monthlyApptTrends.map((t: { total: number }, i: number) => ({ x: i, y: t.total }));
      } else {
        chartData = Array(12).fill(0).map((_, i) => ({ x: i, y: 0 }));
      }
    }
    if (s.id === "completed") {
      icon = CheckCircle2;
      stroke = "#10B981";
      if (monthlyApptTrends.length > 0) {
        chartData = monthlyApptTrends.map((t: { completed: number }, i: number) => ({ x: i, y: t.completed }));
      } else {
        chartData = Array(12).fill(0).map((_, i) => ({ x: i, y: 0 }));
      }
    }
    if (s.id === "upcoming") {
      icon = Calendar;
      stroke = "#F97316";
      if (monthlyApptTrends.length > 0) {
        chartData = monthlyApptTrends.map((t: { total: number; completed: number }, i: number) => ({
          x: i,
          y: Math.max(0, t.total - t.completed)
        }));
      } else {
        chartData = Array(12).fill(0).map((_, i) => ({ x: i, y: 0 }));
      }
    }
    // if (s.id === "spent") {
    //   icon = IndianRupee;
    //   stroke = "#10B981"; // Emerald
    //   if (monthlySpendingTrends.length > 0) {
    //     chartData = monthlySpendingTrends.map((t: { value: number }, i: number) => ({ x: i, y: t.value }));
    //   }
    // }

    return { ...s, icon, stroke, data: chartData };
  });

  const recentAppointments = data?.recentAppointments || [];

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let i = currentYear; i >= 2020; i--) {
    years.push(i);
  }

  if (isLoading) return <div className="p-4">Loading dashboard...</div>;

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div></div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewType("monthly")}
              className={cn("px-3 py-1.5 text-sm font-medium rounded-md transition-all", viewType === "monthly" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900")}
            >
              Monthly
            </button>
            <button
              onClick={() => setViewType("yearly")}
              className={cn("px-3 py-1.5 text-sm font-medium rounded-md transition-all", viewType === "yearly" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900")}
            >
              Yearly
            </button>
          </div>

          {/* Date Selectors */}
          {viewType === "monthly" ? (
            <input
              type="month"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
            />
          ) : (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-9 px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white min-w-[100px]"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}

          {/* Refresh Action */}
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {enrichedStats.map((s: any) => (
          <StatCard key={s.id} {...s} />
        ))}
      </div>

      {/* Middle Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Upcoming Appointments */}
        <Card className="xl:col-span-2 shadow-sm border-muted/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Upcoming Appointments</CardTitle>
              <Button variant="outline" onClick={() => navigate("/appointments")} size="sm">All Appointments</Button>

            </div>


          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y">
              {recentAppointments.length > 0 ? recentAppointments.map((a: Appointment, i: number) => (
                <AppointmentItem key={i} a={a} />
              )) : <div className="py-4 text-center text-muted-foreground text-sm">No upcoming appointments</div>}
            </div>
          </CardContent>
        </Card>

        {/* Recent Consultants */}
        <Card className="shadow-sm border-muted/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Consultants</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAppointments.length > 0 ? (
                Array.from(new Map(recentAppointments.map((appt) => [appt.name, appt])).values())
                  .slice(0, 4)
                  .map((consultant, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-gray-100">
                        <AvatarImage src={consultant.avatar} />
                        <AvatarFallback>{consultant.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{consultant.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{consultant.tag}</div>
                      </div>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => navigate(`/consultants`)}>
                        <Search className="h-4 w-4 text-gray-400" />
                      </Button>
                    </div>
                  ))
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">No recent consultants</p>
                  <Button variant="link" onClick={() => navigate("/consultants")} className="mt-2 h-auto p-0 text-xs">
                    Find a consultant
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

// ------------------------------
// Page
// ------------------------------
export default function Dashboard() {
  const { user } = useSelector((state: RootState) => state.auth);
  const isClient = user?.role === "Client";

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">
            Welcome, {user?.name || "User"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isClient ? "Manage your consultations and health journey" : "Here's what's happening with your practice today"}
          </p>
        </div>

      </div>

      {isClient ? <ClientDashboard /> : <ConsultantDashboard />}
    </div>
  );
}
