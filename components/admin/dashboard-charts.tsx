"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "#003c33",
  PENDING: "#1863dc",
  COMPLETED: "#75758a",
  CANCELLED: "#b30000",
  NO_SHOW: "#ff7759",
};

export default function DashboardCharts({
  appointmentsPerDay,
  doctorStats,
  statusBreakdown,
}: {
  appointmentsPerDay: { label: string; appointments: number; revenue: number }[];
  doctorStats: { name: string; appointments: number; revenue: number }[];
  statusBreakdown: { name: string; value: number }[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <div className="bg-white border border-hairline rounded-lg p-5">
        <h3 className="font-display text-sm font-semibold text-primary">Appointments — last 14 days</h3>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={appointmentsPerDay} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="appt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#003c33" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#003c33" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#93939f" }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: "#93939f" }} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="appointments" name="Appointments" stroke="#003c33" fill="url(#appt)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-hairline rounded-lg p-5">
        <h3 className="font-display text-sm font-semibold text-primary">Revenue per doctor</h3>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={doctorStats} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#93939f" }} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: "#93939f" }} />
              <Tooltip formatter={(v) => `₹${v}`} />
              <Bar dataKey="revenue" name="Revenue" fill="#003c33" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-hairline rounded-lg p-5">
        <h3 className="font-display text-sm font-semibold text-primary">Appointments by status</h3>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {statusBreakdown.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#d9d9dd"} />
                ))}
              </Pie>
              <Tooltip />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-hairline rounded-lg p-5">
        <h3 className="font-display text-sm font-semibold text-primary">Doctor load</h3>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={doctorStats} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#93939f" }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#212121" }} width={130} />
              <Tooltip />
              <Bar dataKey="appointments" name="Appointments" fill="#1863dc" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
