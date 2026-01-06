// Consultant Dashboard – production-stable (exact UI)
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, ClipboardList, IndianRupee, Users, Clock, CheckCircle2, TrendingUp, TrendingDown, Check, X, MessageSquare, Search } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import { useQuery } from "@tanstack/react-query";
import DashboardAPI from "@/api/dashboard.api";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

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

function AppointmentItem({ a }: { a: any }) {
  return (
    <div className="group flex items-center justify-between py-3 px-1 hover:bg-muted/50 rounded-lg transition-colors -mx-1 px-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
          <AvatarImage src={a.avatar} />
          <AvatarFallback className="bg-primary/10 text-primary">{a.name.split(" ").map((s: string) => s[0]).join("")}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-semibold text-sm leading-tight text-gray-900 group-hover:text-primary transition-colors">{a.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            {a.tag && <span className="inline-block px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-medium uppercase tracking-wider">{a.tag}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-right">
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center justify-end gap-1"><Clock className="h-3 w-3" /> {a.time}</div>
        </div>
        <div className={cn("text-xs font-medium px-2 py-1 rounded-full",
          a.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700' :
            a.status === 'Upcoming' ? 'bg-blue-50 text-blue-700' :
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
  const { data, isLoading } = useQuery({
    queryKey: ["consultant-stats"],
    queryFn: DashboardAPI.getConsultantStats,
  });

  const navigate = useNavigate();
  const stats = data?.stats || [
    { id: "total", title: "Total Appointments", value: "0", delta: "+0%", up: true },
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

  // Add icons and colors to stats
  const enrichedStats = stats.map((s: any) => {
    let icon = ClipboardList;
    let stroke = "#5E8BFF";
    let data = sparkline(40, 48);

    if (s.id === "today") { icon = Calendar; stroke = "#F97316"; data = sparkline(24, 52); }
    if (s.id === "active") { icon = Users; stroke = "#8B5CF6"; data = sparkline(24, 50); }
    if (s.id === "revenue") { icon = IndianRupee; stroke = "#EC4899"; data = sparkline(24, 55); }

    return { ...s, icon, stroke, data };
  });

  const recentAppointments = data?.recentAppointments || [];

  if (isLoading) return <div className="p-4">Loading dashboard...</div>;

  return (
    <>
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
              {recentAppointments.length > 0 ? recentAppointments.map((a: any, i: number) => (
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
  const { data, isLoading } = useQuery({
    queryKey: ["client-stats"],
    queryFn: DashboardAPI.getClientStats,
  });

  const navigate = useNavigate();
  // Filter out "spent" if it comes from the backend
  const rawStats = data?.stats || [
    { id: "upcoming", title: "Upcoming Appointments", value: "0", delta: "+0%", up: true },
    { id: "consultants", title: "My Consultants", value: "0", delta: "+0%", up: true },
    { id: "messages", title: "Unread Messages", value: "0", delta: "+0%", up: true },
  ];
  const stats = rawStats.filter((s: any) => s.id !== "spent");

  // Add icons and colors
  const enrichedStats = stats.map((s: any) => {
    let icon = Calendar;
    let stroke = "#5E8BFF";
    let data = sparkline(24, 10);

    if (s.id === "consultants") { icon = Users; stroke = "#8B5CF6"; data = sparkline(24, 5); }
    if (s.id === "messages") { icon = MessageSquare; stroke = "#F97316"; data = sparkline(24, 2); }

    return { ...s, icon, stroke, data };
  });

  const recentAppointments = data?.recentAppointments || [];

  if (isLoading) return <div className="p-4">Loading dashboard...</div>;

  return (
    <>
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
              {recentAppointments.length > 0 ? recentAppointments.map((a: any, i: number) => (
                <AppointmentItem key={i} a={a} />
              )) : <div className="py-4 text-center text-muted-foreground text-sm">No upcoming appointments</div>}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions / Suggestions */}
        <Card className="shadow-sm border-muted/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full justify-start gap-2" variant="outline">
              <Search className="h-4 w-4" /> Find a Consultant
            </Button>
            <Button className="w-full justify-start gap-2" variant="outline">
              <Calendar className="h-4 w-4" /> Schedule Appointment
            </Button>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Suggested Consultants</h4>
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://i.pravatar.cc/100?img=${i + 20}`} />
                      <AvatarFallback>C{i}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Dr. Emily Chen</div>
                      <div className="text-xs text-muted-foreground">Cardiology</div>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    </Button>
                  </div>
                ))}
              </div>
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
