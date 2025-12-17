import React from "react";
import { RefreshCw, Download } from "lucide-react";
import { motion } from "framer-motion";

// design reference (will be served from your environment)
const designRef = "/mnt/data/Screenshot 2025-11-21 142130.png";

const AnalyticsDashboard: React.FC = () => {
  // sample data matching the new design
  const months = [
    { name: "May", revenue: 220000 },
    { name: "Jun", revenue: 275000 },
    { name: "Jul", revenue: 320000 },
    { name: "Aug", revenue: 370000 },
    { name: "Sep", revenue: 350000 },
    { name: "Oct", revenue: 380000 },
  ];

  const weeklyAppointments = [8, 12, 10, 16, 12, 7, 3];

  const performance = {
    sessionCompletion: 96,
    avgRating: 4.8,
    responseTime: 2, // in hours (we'll display < 2 hours)
    rebookingRate: 78,
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.28 } },
  };

  const maxRevenue = Math.max(...months.map((m) => m.revenue));
  const maxAppt = Math.max(...weeklyAppointments);

  return (
    <div className="min-h-screen bg-white p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Analytics</h2>
          <p className="text-sm text-gray-500">Home &gt; Analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 border rounded-md hover:bg-gray-100 transition">
            <RefreshCw size={16} />
          </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-white border rounded-md text-sm font-medium hover:bg-gray-50 transition">
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

      {/* Top metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-lg p-4 shadow-sm border flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Monthly Revenue</p>
            <h3 className="text-xl font-semibold">₹ 1,56,523</h3>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-sm text-green-600 font-semibold">+12%</div>
            {/* tiny sparkline */}
            <svg width="140" height="36" viewBox="0 0 140 36" className="mt-2">
              <polyline fill="none" stroke="#f472b6" strokeWidth="2" points="0,24 20,18 40,20 60,16 80,18 100,20 120,14 140,6" />
            </svg>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-lg p-4 shadow-sm border flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Total Sessions</p>
            <h3 className="text-xl font-semibold">4</h3>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-sm text-green-600 font-semibold">+20%</div>
            <svg width="140" height="36" viewBox="0 0 140 36" className="mt-2">
              <polyline fill="none" stroke="#60a5fa" strokeWidth="2" points="0,20 20,20 40,18 60,18 80,16 100,16 120,14 140,12" />
            </svg>
          </div>
        </motion.div>
      </div>

      {/* Badge + Export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-md font-semibold text-gray-800">Analytics</h3>
          <span className="text-xs bg-orange-100 text-orange-700 font-medium px-2 py-0.5 rounded-md">04</span>
        </div>
        <button className="flex items-center gap-2 px-3 py-2 bg-white border rounded-md text-sm font-medium hover:bg-gray-50 transition">
          <Download size={14} /> Export Report
        </button>
      </div>

      {/* Main grid: left big area + right metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-xl border shadow-sm p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Revenue Trend</h4>
            <p className="text-sm text-gray-500 mb-3">Monthly revenue over the last 6 months</p>

            {/* Simple area chart using SVG (static) */}
            <div className="w-full h-56 bg-white rounded-md p-2">
              <svg viewBox="0 0 600 240" className="w-full h-full">
                <defs>
                  <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#c7b9ff" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#c7b9ff" stopOpacity="0.25" />
                  </linearGradient>
                </defs>
                {/* background grid lines */}
                {[0, 1, 2, 3, 4].map((i) => (
                  <line key={i} x1={40} x2={560} y1={40 + i * 40} y2={40 + i * 40} stroke="#e5e7eb" strokeWidth={1} />
                ))}

                {/* compute points */}
                {(() => {
                  const w = 520; // chart width
                  const h = 160; // chart height
                  const left = 40;
                  const top = 20;
                  const pts = months.map((m, i) => {
                    const x = left + (i * w) / (months.length - 1);
                    const y = top + (1 - m.revenue / maxRevenue) * h;
                    return `${x},${y}`;
                  });
                  const areaPath = `M ${left + 0},${top + h} L ${pts.join(" ")} L ${left + w},${top + h} Z`;
                  const linePath = `M ${pts.join(" L ")}`;

                  return (
                    <g>
                      <path d={areaPath} fill="url(#areaGrad)" stroke="none" />
                      <path d={linePath} fill="none" stroke="#6b46c1" strokeWidth={2} />
                    </g>
                  );
                })()}

                {/* x labels */}
                {months.map((m, i) => (
                  <text key={m.name} x={40 + (i * 520) / (months.length - 1)} y={210} fontSize={12} fill="#6b7280" textAnchor="middle">
                    {m.name}
                  </text>
                ))}

                {/* legend */}
                <text x={300} y={230} fontSize={12} fill="#6b7280" textAnchor="middle">Revenue (₹)</text>
              </svg>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-xl border shadow-sm p-4">
              <h5 className="font-semibold text-gray-800 mb-2">Appointment Statistics</h5>
              <p className="text-sm text-gray-500 mb-3">Weekly appointment breakdown</p>

              {/* simple bar chart */}
              <div className="h-44 flex items-end gap-2 px-2">
                {weeklyAppointments.map((v, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div style={{ height: `${(v / maxAppt) * 100}%` }} className="w-full bg-green-400 rounded-t-md" />
                    <div className="text-xs text-gray-600 mt-2">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}</div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-green-400 mt-2">Appointments</div>
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-xl border shadow-sm p-4">
              <h5 className="font-semibold text-gray-800 mb-2">Performance Metrics</h5>
              <p className="text-sm text-gray-500 mb-3">Key performance indicators</p>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Session Completion Rate</span>
                    <span>{performance.sessionCompletion}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full mt-1">
                    <div className="h-2 rounded-full" style={{ width: `${performance.sessionCompletion}%`, background: '#16a34a' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Average Client Rating</span>
                    <span>{performance.avgRating}/5.0</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full mt-1">
                    <div className="h-2 rounded-full" style={{ width: `${(performance.avgRating / 5) * 100}%`, background: '#3b82f6' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Response Time</span>
                    <span>&lt; {performance.responseTime} hours</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full mt-1">
                    <div className="h-2 rounded-full" style={{ width: `60%`, background: '#a78bfa' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Rebooking Rate</span>
                    <span>{performance.rebookingRate}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full mt-1">
                    <div className="h-2 rounded-full" style={{ width: `${performance.rebookingRate}%`, background: '#fb923c' }} />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* right column: small summary card referencing uploaded design */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-xl border shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-800">Summary</h4>
            <img src={designRef} alt="design" className="w-20 h-12 object-cover rounded-md" />
          </div>

          <div className="space-y-3">
            <div className="text-sm text-gray-600">Monthly Revenue</div>
            <div className="text-lg font-semibold">₹ 3,80,000</div>
            <div className="text-sm text-green-600">+8% vs last month</div>

            <div className="border-t pt-3">
              <div className="text-sm text-gray-600">Active Consultants</div>
              <div className="text-lg font-semibold">24</div>
            </div>

            <div className="border-t pt-3">
              <div className="text-sm text-gray-600">Total Appointments</div>
              <div className="text-lg font-semibold">1,240</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
