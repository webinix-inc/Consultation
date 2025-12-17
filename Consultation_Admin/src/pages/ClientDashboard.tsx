import React, { useState } from "react";
import {
  User,
  Calendar,
  Heart,
  FileText,
  DollarSign,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  Edit,
  Download,
  Eye,
  Trash2,
  Star,
  Clock,
  CheckCircle2,
  
} from "lucide-react";

/**
 * Single-file implementation of the User Dashboard
 * Tabs: Profile • My Bookings • My Consultants • Upload Document • Payments
 * TailwindCSS + TypeScript, no external components.
 */
const UserDashboard: React.FC = () => {
  const [tab, setTab] = useState<
    "profile" | "bookings" | "consultants" | "documents" | "payments"
  >("profile");

  const statCards = [
    { title: "Today Appointments", value: "108", delta: "+20%", color: "blue" },
    { title: "Completed Sessions", value: "32", delta: "-15%", color: "orange" },
    { title: "Upcoming Appointments", value: "65", delta: "+18%", color: "violet" },
    { title: "Total Spent", value: "₹1,56,523", delta: "+12%", color: "pink" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Header Card */}
      <div className="bg-white border rounded-xl shadow-sm p-6 flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center gap-4">
          <img
            src="https://randomuser.me/api/portraits/men/35.jpg"
            alt="Avatar"
            className="w-16 h-16 rounded-full object-cover"
          />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Abhishek</h1>
            <p className="text-sm text-gray-500">abhishek.maurya@example.com</p>
            <div className="flex gap-2 mt-2">
              <span className="px-2 py-0.5 rounded-md text-xs bg-blue-50 text-blue-700 border border-blue-200">
                Active Member
              </span>
              <span className="px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-700 border border-gray-200">
                32 Sessions
              </span>
            </div>
          </div>
        </div>
        <div className="text-right mt-4 md:mt-0">
          <p className="text-xs text-gray-500">Member since</p>
          <p className="text-sm font-medium text-gray-800">January 2024</p>
        </div>
      </div>

      {/* Tabs (single page) */}
      <div className="flex bg-white border rounded-lg overflow-hidden">
        {[
          { key: "profile", label: "Profile", icon: <User size={14} /> },
          { key: "bookings", label: "My Bookings", icon: <Calendar size={14} /> },
          { key: "consultants", label: "My Consultants", icon: <Heart size={14} /> },
          { key: "documents", label: "Upload Document", icon: <FileText size={14} /> },
          { key: "payments", label: "Payments", icon: <DollarSign size={14} /> },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`flex flex-1 items-center justify-center gap-2 py-2 text-sm font-medium transition ${
              tab === (t.key as typeof tab)
                ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600"
                : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ================= PROFILE ================= */}
      {tab === "profile" && (
        <div className="space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((c, i) => (
              <div
                key={i}
                className="bg-white border rounded-xl shadow-sm p-4 relative overflow-hidden"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs ${
                        c.color === "blue"
                          ? "bg-blue-600"
                          : c.color === "orange"
                          ? "bg-orange-500"
                          : c.color === "violet"
                          ? "bg-violet-500"
                          : "bg-pink-500"
                      }`}
                    >
                      ●
                    </span>
                    <p className="text-sm text-gray-600">{c.title}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      c.delta.startsWith("+")
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {c.delta}
                  </span>
                </div>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {c.value}
                </p>
                {/* subtle sparkline bar */}
                <div className="mt-4 h-10 w-full rounded bg-gradient-to-r from-gray-100 to-white border" />
              </div>
            ))}
          </div>

          {/* Personal Information */}
          <div className="bg-white border rounded-xl shadow-sm">
            <div className="flex items-center justify-between px-6 pt-6">
              <div>
                <h3 className="text-gray-900 font-semibold">
                  Personal Information
                </h3>
                <p className="text-sm text-gray-500">
                  Manage your profile details and personal information
                </p>
              </div>
              <button className="flex items-center gap-2 bg-blue-600 text-white text-sm px-3 py-1.5 rounded-md hover:bg-blue-700">
                <Edit size={14} />
                Edit Profile
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Full Name" value="Abhishek" icon={<User size={14} />} />
              <Field
                label="Email Address"
                value="abhishek.maurya@example.com"
                icon={<Mail size={14} />}
              />
              <Field
                label="Phone Number"
                value="+1 (555) 123-4567"
                icon={<Phone size={14} />}
              />
              <Field label="Date of Birth" value="" placeholder="DD/MM/YYYY" icon={<CalendarDays size={14} />} />
              <Field
                label="Address"
                value="123 Main St, New York, NY 10001"
                icon={<MapPin size={14} />}
              />
              <Field
                label="Emergency Contact"
                value="Jane Doe • +1 (555) 987-6543"
                icon={<Phone size={14} />}
              />
              <div className="md:col-span-2">
                <label className="text-sm text-gray-700">Bio</label>
                <textarea
                  placeholder="Tell us about yourself and your consultation needs..."
                  className="w-full mt-1 text-sm bg-gray-50 border rounded-md p-2"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= BOOKINGS ================= */}
      {tab === "bookings" && (
        <div className="space-y-6">
          <SectionTitle
            title="Upcoming Appointments"
            subtitle="Your scheduled consultations"
          />
          <div className="bg-white border rounded-xl shadow-sm divide-y">
            {[
              {
                initials: "DSW",
                name: "Dr. Sarah Wilson",
                tags: ["Health"],
                status: "Confirmed" as const,
                date: "Fri, Oct 24",
                time: "10:00 AM (60 min)",
                mode: "Virtual",
                notes: "Follow up on blood pressure medication",
                price: "$150",
              },
              {
                initials: "MC",
                name: "Michael Chen",
                tags: ["Finance"],
                status: "Pending" as const,
                date: "Sun, Oct 26",
                time: "02:00 PM (45 min)",
                mode: "Office • 456 Finance Ave",
                notes: "401k portfolio review",
                price: "$200",
              },
              {
                initials: "LJ",
                name: "Lisa Johnson",
                tags: ["Legal"],
                status: "Confirmed" as const,
                date: "Tue, Oct 28",
                time: "09:00 AM (60 min)",
                mode: "Office • 789 Law Building",
                notes: "Contract review and signing",
                price: "$30",
              },
            ].map((a, i) => (
              <BookingRow key={i} {...a} />
            ))}
          </div>

          <SectionTitle title="Past Appointments" subtitle="Your consultation history" />
          <div className="bg-white border rounded-xl shadow-sm divide-y">
            {[
              {
                initials: "DSW",
                name: "Dr. Sarah Wilson",
                tags: ["Health"],
                status: "Completed" as const,
                date: "Oct 5, 2025",
                time: "10:00 AM (60 min)",
                price: "$150",
                review: "Excellent consultation, very thorough and professional.",
              },
              {
                initials: "MC",
                name: "Michael Chen",
                tags: ["Finance"],
                status: "Completed" as const,
                date: "Oct 1, 2025",
                time: "02:00 PM (60 min)",
                price: "$200",
                review: "Great insights on market trends.",
              },
              {
                initials: "LJ",
                name: "Lisa Johnson",
                tags: ["Legal"],
                status: "Completed" as const,
                date: "Sep 28, 2025",
                time: "09:00 AM (60 min)",
                price: "$30",
                review: "Very knowledgeable and helpful.",
              },
              {
                initials: "RM",
                name: "Robert Martinez",
                tags: ["IT"],
                status: "Completed" as const,
                date: "Sep 15, 2025",
                time: "03:00 PM (60 min)",
                price: "$180",
                review: "Identified critical vulnerabilities and provided solutions.",
              },
            ].map((a, i) => (
              <PastRow key={i} {...a} />
            ))}
          </div>
        </div>
      )}

      {/* ================= CONSULTANTS ================= */}
      {tab === "consultants" && (
        <div className="space-y-6">
          <SectionTitle
            title="My Consultants"
            subtitle="Professionals you've worked with"
          />
          <div className="bg-white border rounded-xl shadow-sm divide-y">
            {[
              {
                initials: "DSW",
                name: "Dr. Sarah Wilson",
                fav: true,
                chips: ["Health", "Cardiology"],
                rating: 4.9,
                sessions: 5,
                last: "05/10/2025",
                email: "sarah.wilson@health.com",
              },
              {
                initials: "MC",
                name: "Michael Chen",
                fav: true,
                chips: ["Finance", "Investment Strategy"],
                rating: 4.8,
                sessions: 3,
                last: "01/10/2025",
                email: "michael@finance.com",
              },
              {
                initials: "LJ",
                name: "Lisa Johnson",
                fav: false,
                chips: ["Legal", "Corporate Law"],
                rating: 4.9,
                sessions: 2,
                last: "28/09/2025",
                email: "lisa.johnson@legal.com",
              },
              {
                initials: "RM",
                name: "Robert Martinez",
                fav: false,
                chips: ["IT", "Network Security"],
                rating: 4.9,
                sessions: 1,
                last: "15/09/2025",
                email: "robert.m@techsec.com",
              },
            ].map((c, i) => (
              <ConsultantRow key={i} {...c} />
            ))}
          </div>

          <SectionTitle
            title="Favourite Consultants"
            subtitle="Quick access to your preferred professionals"
          />
          <div className="bg-white border rounded-xl shadow-sm p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { initials: "DSW", name: "Dr. Sarah Wilson", title: "Cardiology" },
              { initials: "MC", name: "Michael Chen", title: "Investment Strategy" },
            ].map((f, i) => (
              <div
                key={i}
                className="border rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Avatar initials={f.initials} />
                  <div>
                    <p className="font-medium text-gray-800">{f.name}</p>
                    <p className="text-sm text-gray-500">{f.title}</p>
                  </div>
                </div>
                <div className="w-40">
                  <button className="w-full text-xs bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
                    Quick Book
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= DOCUMENTS ================= */}
      {tab === "documents" && (
        <div className="space-y-4">
          <SectionTitle
            title="Document Management"
            subtitle="Manage and monitor all platform documents"
          />
          <div className="flex justify-between items-center">
            <div className="relative w-full max-w-md">
              <input
                className="w-full border rounded-md pl-3 pr-3 py-2 text-sm bg-white"
                placeholder="Search by consultant, invoice number..."
              />
            </div>
            <button className="ml-3 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Upload Document
            </button>
          </div>

          <div className="bg-white border rounded-xl shadow-sm divide-y">
            {[
              { badge: "Medical Report", file: "Medical Report - Amit Patel.pdf", meta: "Client: Amit Patel • Consultant: Dr. Priya Sharma • 2.4 MB • 2024-10-20", color: "yellow" },
              { badge: "Consultation Notes", file: "Consultation Notes - Neha Gupta.docx", meta: "Client: Neha Gupta • Consultant: Dr. Priya Sharma • 156 KB • 2024-10-18", color: "amber" },
              { badge: "Prescription", file: "Prescription - Rohit Verma.pdf", meta: "Client: Rohit Verma • Consultant: Vikram Malhotra • 324 KB • 2024-10-15", color: "green" },
              { badge: "Lab Results", file: "Lab Results - Kavita Iyer.pdf", meta: "Client: Kavita Iyer • Consultant: Anjali Desai • 1.8 MB • 2024-10-12", color: "purple" },
              { badge: "Treatment Plan", file: "Treatment Plan - Arjun Reddy.pdf", meta: "Client: Arjun Reddy • Consultant: Dr. Priya Sharma • 890 KB • 2024-10-10", color: "rose" },
              { badge: "Invoice", file: "Invoice - Pooja Nair.pdf", meta: "Client: Pooja Nair • Consultant: Rajesh Kumar • 215 KB • 2024-10-08", color: "orange" },
            ].map((d, i) => (
              <DocRow key={i} {...d} />
            ))}
          </div>
        </div>
      )}

      {/* ================= PAYMENTS ================= */}
      {tab === "payments" && (
        <div className="space-y-4">
          <SectionTitle
            title="Payment History"
            subtitle="Complete record of all your transactions"
          />
          <div className="flex justify-between items-center">
            <div className="relative w-full max-w-md">
              <input
                className="w-full border rounded-md pl-3 pr-3 py-2 text-sm bg-white"
                placeholder="Search by consultant, invoice number..."
              />
            </div>
            <button className="ml-3 px-3 py-2 text-sm border rounded-md bg-white">
              All Payments ▾
            </button>
          </div>

          <div className="bg-white border rounded-xl shadow-sm divide-y">
            {[
              {
                day: "Oct 23",
                name: "Dr. Sarah Wilson",
                tags: ["Health", "Completed"],
                title: "Cardiology • Follow-up Consultation",
                invoice: "INV-2025-001",
                card: "Visa ••••4242",
                txn: "TXN: TXN-ABC123456",
                amount: "$150",
              },
              {
                day: "Oct 20",
                name: "Michael Chen",
                tags: ["Finance", "Completed"],
                title: "Investment Strategy • Portfolio Review",
                invoice: "INV-2025-002",
                card: "Visa ••••4242",
                txn: "TXN: TXN-ABC123457",
                amount: "$200",
              },
              {
                day: "Oct 15",
                name: "Lisa Johnson",
                tags: ["Legal", "Completed"],
                title: "Corporate Law • Contract Review",
                invoice: "INV-2025-003",
                card: "Mastercard ••••8888",
                txn: "TXN: TXN-ABC123458",
                amount: "$300",
              },
              {
                day: "Oct 10",
                name: "Robert Martínez",
                tags: ["IT", "Completed"],
                title: "Network Security • Security Audit",
                invoice: "INV-2025-004",
                card: "Visa ••••4242",
                txn: "TXN: TXN-ABC123459",
                amount: "$180",
              },
              {
                day: "Oct 5",
                name: "Dr. Sarah Wilson",
                tags: ["Health", "Completed"],
                title: "Cardiology • Initial Consultation",
                invoice: "INV-2025-005",
                card: "Visa ••••4242",
                txn: "TXN: TXN-ABC123460",
                amount: "$150",
              },
            ].map((p, i) => (
              <PaymentRow key={i} {...p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------------- Small helpers (same-file) ---------------- */
const Field = ({
  label,
  value,
  placeholder,
  icon,
}: {
  label: string;
  value?: string;
  placeholder?: string;
  icon: React.ReactNode;
}) => (
  <div>
    <label className="text-sm text-gray-700">{label}</label>
    <div className="mt-1 flex items-center gap-2 bg-gray-50 border rounded-md px-2 py-2">
      <span className="text-gray-400">{icon}</span>
      <input
        className="w-full bg-transparent outline-none text-sm text-gray-800 placeholder:text-gray-400"
        defaultValue={value}
        placeholder={placeholder}
        readOnly={!placeholder}
      />
    </div>
  </div>
);

const SectionTitle = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="flex flex-col">
    <h3 className="font-semibold text-gray-900">{title}</h3>
    <p className="text-sm text-gray-500">{subtitle}</p>
  </div>
);

const Chip = ({ text, tone = "gray" }: { text: string; tone?: "gray" | "green" | "blue" | "yellow" }) => {
  const map: Record<string, string> = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700",
    yellow: "bg-yellow-100 text-yellow-700",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-md ${map[tone]}`}>{text}</span>;
};

const Avatar = ({ initials }: { initials: string }) => (
  <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-semibold">
    {initials}
  </div>
);

/* ---- Bookings ---- */
type BookingProps = {
  initials: string;
  name: string;
  tags: string[];
  status: "Confirmed" | "Pending";
  date: string;
  time: string;
  mode: string;
  notes: string;
  price: string;
  key?: number;
};
const BookingRow: React.FC<BookingProps> = (a) => (
  <div className="p-4 flex items-start justify-between">
    <div className="flex gap-3">
      <Avatar initials={a.initials} />
      <div>
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900">{a.name}</p>
          {a.tags.map((t, i) => (
            <Chip key={i} text={t} tone="blue" />
          ))}
          <Chip text={a.status} tone={a.status === "Confirmed" ? "green" : "yellow"} />
        </div>
        <div className="mt-1 text-xs text-gray-500 space-x-2">
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={12} />
            {a.date} • {a.time}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock size={12} />
            {a.mode}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">• {a.notes}</p>
      </div>
    </div>
    <div className="text-right">
      <p className="text-sm text-gray-900">{a.price}</p>
      <div className="mt-2 flex gap-2">
        <button className="text-xs border rounded px-2 py-1 hover:bg-gray-100">Reschedule</button>
        <button className="text-xs border rounded px-2 py-1 hover:bg-gray-100">Cancel</button>
      </div>
      <button className="mt-2 text-xs text-gray-600 hover:underline">View Details</button>
    </div>
  </div>
);

type PastProps = Omit<BookingProps, "status" | "mode" | "notes"> & {
  status: "Completed";
  review: string;
  key?: number;
};
const PastRow: React.FC<PastProps> = (a) => (
  <div className="p-4 flex items-start justify-between">
    <div className="flex gap-3">
      <Avatar initials={a.initials} />
      <div>
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900">{a.name}</p>
          {a.tags.map((t, i) => (
            <Chip key={i} text={t} tone="blue" />
          ))}
          <Chip text={a.status} tone="green" />
        </div>
        <div className="mt-1 text-xs text-gray-500 space-x-2">
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={12} />
            {a.date} • {a.time}
          </span>
        </div>
        <div className="flex items-center text-yellow-500 text-xs mt-1">
          <Star size={12} className="fill-yellow-400 text-yellow-400 mr-1" />
          <span>5.0</span>
        </div>
        <p className="text-xs text-gray-600 mt-1">{a.review}</p>
      </div>
    </div>
    <div className="text-right">
      <p className="text-sm text-gray-900">{a.price}</p>
      <div className="mt-2 flex gap-2">
        <button className="text-xs border rounded px-2 py-1 hover:bg-gray-100">Invoice</button>
        <button className="text-xs border rounded px-2 py-1 hover:bg-gray-100">Notes</button>
      </div>
      <button className="mt-2 text-xs text-gray-600 hover:underline">Book Again</button>
    </div>
  </div>
);

/* ---- Consultants ---- */
type ConsultantProps = {
  initials: string;
  name: string;
  fav: boolean;
  chips: string[];
  rating: number;
  sessions: number;
  last: string;
  email: string;
};
const ConsultantRow: React.FC<ConsultantProps> = (c) => (
  <div className="p-4 flex items-center justify-between">
    <div className="flex items-start gap-3">
      <Avatar initials={c.initials} />
      <div>
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900">{c.name}</p>
          {c.fav && <span className="text-red-500">❤</span>}
        </div>
        <div className="flex gap-2 mt-1">
          {c.chips.map((t, i) => (
            <Chip key={i} text={t} tone="blue" />
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
          <span className="inline-flex items-center gap-1">
            <Star size={12} className="fill-yellow-400 text-yellow-400" />
            {c.rating}
          </span>
          <span>{c.sessions} sessions completed</span>
          <span>Last: {c.last}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">{c.email}</p>
      </div>
    </div>
    <div className="flex gap-2">
      <button className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700">
        Book Session
      </button>
      <button className="text-xs border rounded px-3 py-1.5 hover:bg-gray-100">
        View History
      </button>
      <button className="text-xs border rounded px-3 py-1.5 hover:bg-gray-100">
        Message
      </button>
    </div>
  </div>
);

/* ---- Documents ---- */
type DocProps = { badge: string; file: string; meta: string; color: string };
const DocRow: React.FC<DocProps> = ({ badge, file, meta, color }) => {
  const mapColor: Record<string, string> = {
    yellow: "bg-yellow-100 text-yellow-700",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-green-100 text-green-700",
    purple: "bg-purple-100 text-purple-700",
    rose: "bg-rose-100 text-rose-700",
    orange: "bg-orange-100 text-orange-700",
  };
  return (
    <div className="p-4 flex items-center justify-between">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
          <FileText size={16} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-md ${mapColor[color]}`}>
              {badge}
            </span>
            <p className="font-medium text-gray-900">{file}</p>
          </div>
          <p className="text-xs text-gray-500 mt-1">{meta}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 text-gray-600">
        <Eye size={16} className="cursor-pointer hover:text-blue-600" />
        <Download size={16} className="cursor-pointer hover:text-green-600" />
        <Trash2 size={16} className="cursor-pointer hover:text-red-600" />
      </div>
    </div>
  );
};

/* ---- Payments ---- */
type PayProps = {
  day: string;
  name: string;
  tags: string[];
  title: string;
  invoice: string;
  card: string;
  txn: string;
  amount: string;
};
const PaymentRow: React.FC<PayProps> = (p) => (
  <div className="p-4 flex items-start justify-between">
    <div className="flex items-start gap-3">
      <div className="w-10 text-center">
        <p className="text-xs bg-gray-100 rounded-md px-1 py-1">{p.day}</p>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900">{p.name}</p>
          {p.tags.map((t, i) => (
            <Chip
              key={i}
              text={t}
              tone={t === "Completed" ? "green" : t === "Health" ? "blue" : "gray"}
            />
          ))}
        </div>
        <p className="text-sm text-gray-600">{p.title}</p>
        <div className="text-xs text-gray-500 mt-1 space-y-0.5">
          <p>Invoice: {p.invoice}</p>
          <p>{p.card}</p>
          <p>{p.txn}</p>
        </div>
      </div>
    </div>
    <div className="text-right">
      <p className="text-gray-900 font-semibold">{p.amount}</p>
      <div className="mt-2 flex gap-2">
        <button className="text-xs border rounded px-2 py-1 hover:bg-gray-100">Invoice</button>
        <button className="text-xs border rounded px-2 py-1 hover:bg-gray-100">Receipt</button>
      </div>
      <button className="mt-2 text-xs text-gray-600 hover:underline">View Details</button>
    </div>
  </div>
);

export default UserDashboard;
