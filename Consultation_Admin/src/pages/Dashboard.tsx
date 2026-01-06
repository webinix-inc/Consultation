import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
  type Variants,
} from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import AnalyticsAPI from "@/api/analytics.api";
import UserAPI from "@/api/user.api";
import ConsultantAPI from "@/api/consultant.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  Calendar,
  Users,
  IndianRupee,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

// ------------------------------
// Utils
// ------------------------------
const sparkline = (n: number, base = 50) =>
  Array.from({ length: n }).map((_, i) => ({
    x: i,
    y: Math.max(
      5,
      Math.round(base + (Math.sin(i / 2) * 12 + (Math.random() - 0.5) * 10))
    ),
  }));

function Sparkline({
  data,
  stroke,
}: {
  data: { x: number; y: number }[];
  stroke: string;
}) {
  return (
    <div className="h-20 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
        >
          <defs>
            <linearGradient id={`area-${stroke}`} x1="0" y1="0" x2="0" y2="2">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.25} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="y"
            stroke={stroke}
            fill={`url(#area-${stroke})`}
            strokeWidth={2.2}
            dot={false}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatCard({ title, value, delta, up, icon: Icon, stroke, data }: any) {
  return (
    <Card className="shadow-sm border-muted/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-2">
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${stroke}15` }}
            >
              <Icon className="h-4 w-4" />
            </span>
            {title}
          </CardTitle>
          <Badge
            variant="secondary"
            className={`text-xs ${up ? "text-emerald-600" : "text-red-600"
              } bg-transparent p-0`}
          >
            {up ? (
              <span className="inline-flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {delta}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                {delta}
              </span>
            )}
          </Badge>
        </div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </CardHeader>
      <CardContent className="pt-1 p-0">
        <Sparkline data={data} stroke={stroke} />
      </CardContent>
    </Card>
  );
}

const AdminDashboard: React.FC = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["analytics-overview"],
    queryFn: AnalyticsAPI.overview,
    refetchOnWindowFocus: true,
  });

  // Fetch consultants directly
  const { data: consultantsData } = useQuery({
    queryKey: ["all-consultants"],
    queryFn: () => ConsultantAPI.getAllConsultants({ limit: 6, sort: "-createdAt" }), // Fetch 6 most recent
    refetchOnWindowFocus: true,
  });

  const consultants = useMemo(() => {
    if (!consultantsData?.data) return [];

    return consultantsData.data
      .map((expert: any) => ({
        id: expert._id || expert.id,
        name: expert.name || expert.fullName || "Consultant",
        field: expert.category || "General",
        // Map status to UI friendly string
        status: (expert.status === 'Active' || expert.status === 'Approved') ? "Available" : "Unavailable"
      }));
  }, [consultantsData]);

  const chartData = useMemo(
    () =>
      (data?.data?.topCategories || []).map((c: any) => ({
        name: c.title,
        value: c.appointmentCount || 0,
      })),
    [data]
  );

  const COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ef4444",
    "#14b8a6",
  ];



  // const cardData = useMemo(() => {
  //   const cards = data?.data?.cards || {};
  //   return [
  //     { title: "Total Consultants", value: String(cards.totalConsultants || 0), color: "#3b82f6", change: "+0%" },
  //     { title: "Appointments", value: String(cards.totalAppointments || 0), color: "#f97316", change: "+0%" },
  //     { title: "Active Clients", value: String(cards.activeClients || 0), color: "#8b5cf6", change: "+0%" },
  //     { title: "Monthly Revenue", value: `₹${Number(cards.monthlyRevenue || 0).toLocaleString("en-IN")}`, color: "#ec4899", change: "+0%" },
  //   ];
  // }, [data]);

  const cardData = useMemo(() => {
    const cards = data?.data?.cards || {};
    const trends = data?.data?.monthlyTrends || [];

    const sparklineData = (key: string) => {
      if (trends.length > 0) {
        return trends.map((t: any, i: number) => ({ x: i, y: t[key] || 0 }));
      }
      return Array.from({ length: 12 }).map((_, i) => ({ x: i, y: 0 }));
    };

    return [
      {
        id: "consultants",
        title: "Total Consultants",
        value: String(cards.totalConsultants || 0),
        delta: "+12%",
        up: true,
        icon: Users,
        stroke: "#3b82f6",
        data: sparklineData("consultants"),
      },
      {
        id: "appointments",
        title: "Appointments",
        value: String(cards.totalAppointments || 0),
        delta: "+5%",
        up: true,
        icon: Calendar,
        stroke: "#f97316",
        data: sparklineData("appt"),
      },
      {
        id: "clients",
        title: "Active Clients",
        value: String(cards.activeClients || 0),
        delta: "+18%",
        up: true,
        icon: Users,
        stroke: "#8b5cf6",
        data: sparklineData("clients"),
      },
      {
        id: "revenue",
        title: "Monthly Revenue",
        value: `₹${Number(cards.monthlyRevenue || 0).toLocaleString("en-IN")}`,
        delta: "+8%",
        up: true,
        icon: IndianRupee,
        stroke: "#ec4899",
        data: sparklineData("revenue"),
      },
    ];
  }, [data]);

  // const appointments = useMemo(
  //   () =>
  //     (data?.data?.recentAppointments || [])
  //       .slice(0, 4) // Show only 4 most recent appointments
  //       .map((a: any, idx: number) => ({
  //         id: a._id || idx,
  //         name: a.client,
  //         consultant: a.consultant,
  //         category: a.category,
  //         time: a.timeStart,
  //         status: a.status,
  //       })),
  //   [data]
  // );



  // Update the appointments mapping
  const appointments = useMemo(() => {
    if (!data?.data?.recentAppointments) return [];

    return data.data.recentAppointments
      .slice(0, 4)
      .map((appointment: any) => {
        return {
          id: appointment._id,
          name: appointment.client || "Unknown Client",
          consultant: appointment.consultant || "Unknown Consultant",
          category: appointment.category,
          time: appointment.timeStart,
          status: appointment.status,
        };
      });
  }, [data]);



  // ✅ Framer Motion variants (type-safe)
  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 },
    },
  };

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 90, damping: 16 },
    },
  };

  return (
    <motion.div
      className="min-h-screen bg-white p-6 space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div
        className="flex justify-between items-center"
        variants={fadeUp}
      >
        <h1 className="text-xl font-semibold text-gray-800">Welcome, Admin</h1>

      </motion.div>

      {/* Summary Cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={container}
      >
        {cardData.map((s: any) => (
          <StatCard className="p-0" key={s.id} {...s} />
        ))}
      </motion.div>

      {/* Middle Section */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        variants={container}
      >
        {/* Recent Appointments */}
        <motion.div
          variants={fadeUp}
          whileHover={{ y: -5, boxShadow: "0 8px 20px rgba(0,0,0,0.08)" }}
          className="bg-white p-5 rounded-2xl border shadow-sm"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-700">Recent Appointments</h3>
            <a href="/appointments" className="text-blue-500 text-sm font-medium hover:underline">
              All Appointments
            </a>
          </div>
          <div className="space-y-3">
            {appointments.map((a) => (
              <div
                key={a.id}
                className="flex justify-between items-center border-b last:border-none pb-2"
              >
                <div>
                  <p className="font-medium text-gray-800">{a.name}</p>
                  <p className="text-sm text-gray-500">with {a.consultant}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                    {a.category}
                  </span>
                  <div className="text-sm text-gray-700">{a.time}</div>
                  <span className="text-xs text-green-600 font-medium">
                    {a.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Top Categories */}
        <motion.div
          variants={fadeUp}
          whileHover={{ y: -5, boxShadow: "0 8px 20px rgba(0,0,0,0.08)" }}
          className="bg-white p-5 rounded-2xl border shadow-sm"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800">Top Categories</h3>
            <a
              href="/consultation-categories"
              className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              All Categories
            </a>
          </div>

          <div className="flex flex-col">
            {/* Chart & Legend Area */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 mb-8">
              {/* Donut Chart */}
              <div className="relative w-48 h-48 flex-shrink-0">
                {chartData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData.slice(0, 5)}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          cornerRadius={4}
                        >
                          {chartData.map((entry, i) => (
                            <Cell
                              key={`cell-${i}`}
                              fill={COLORS[i % COLORS.length]}
                              strokeWidth={0}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [
                            `${value}`,
                            "Appointments",
                          ]}
                          contentStyle={{
                            borderRadius: "8px",
                            border: "none",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xs text-gray-500 font-medium">
                        Appointments
                      </span>
                      <span className="text-2xl font-bold text-gray-800">
                        {data?.data?.cards?.totalAppointments || 0}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full w-full bg-gray-50 rounded-full">
                    <span className="text-xs text-gray-400">No Data</span>
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="flex flex-col gap-3 min-w-[140px]">
                {chartData.length > 0 ? (
                  chartData.slice(0, 5).map((entry, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-sm text-gray-600 font-medium truncate">
                        {entry.name}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-gray-400 italic">
                    No categories found
                  </span>
                )}
              </div>
            </div>

            {/* Footer Stats */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-100">
              <div className="flex flex-col pl-2">
                <span className="text-xl font-bold text-gray-800">
                  ₹{Number(data?.data?.cards?.monthlyRevenue || 0).toLocaleString("en-IN")}
                </span>
                <span className="text-xs text-gray-500 mt-1">Revenue Generated</span>
              </div>
              <div className="flex flex-col pl-6 border-l border-gray-100">
                <span className="text-xl font-bold text-gray-800">
                  {data?.data?.cards?.totalAppointments || 0}+
                </span>
                <span className="text-xs text-gray-500 mt-1">Appointments last month</span>
              </div>
            </div>
          </div>
        </motion.div>



      </motion.div>

      {/* Consultants */}
      <motion.div
        variants={fadeUp}
        whileHover={{ y: -5, boxShadow: "0 8px 20px rgba(0,0,0,0.08)" }}
        className="bg-white p-5 rounded-2xl border shadow-sm"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-700">Consultants</h3>
          <a href="/consultants" className="text-blue-500 text-sm font-medium hover:underline">
            View All
          </a>
        </div>
        <div className="grid md:grid-cols-2 gap-y-2">
          {isLoading ? (
            <div className="col-span-2 py-4 text-center text-gray-500">
              Loading consultants...
            </div>
          ) : isError ? (
            <div className="col-span-2 py-4 text-center text-red-500">
              Failed to load consultants
            </div>
          ) : consultants.length === 0 ? (
            <div className="col-span-2 py-4 text-center text-gray-500">
              No consultants found
            </div>
          ) : (
            consultants.map((c) => (
              <div
                key={c.id}
                className="flex justify-between items-center py-1 px-2 border-b"
              >
                <div>
                  <p className="font-medium text-gray-800">{c.name}</p>
                  <p className="text-sm text-gray-500">{c.field}</p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${c.status === "Available"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                    }`}
                >
                  {c.status}
                </span>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AdminDashboard;
