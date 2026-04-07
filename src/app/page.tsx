"use client";

import { useEffect, useState } from "react";

interface Stats {
  totalRides: number; todayRides: number; completedRides: number;
  pendingRides: number; totalEarnings: number; todayEarnings: number;
  activeDrivers: number; cancelledRides: number;
}
interface Driver {
  id: number; telegramId: number; firstName: string; lastName: string | null;
  phone: string | null; motorcyclePlate: string | null; status: string;
  rating: number; totalRides: number; totalEarnings: number;
}
interface Ride {
  id: number; clientName: string; clientPhone: string | null;
  driverName: string | null; pickupAddress: string; dropoffAddress: string | null;
  fare: number | null; status: string; createdAt: string; completedAt: string | null;
}
interface Payment {
  id: number; rideId: number; amount: number; method: string;
  status: string; paidAt: string | null;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/stats").then((r) => r.json()),
      fetch("/api/drivers").then((r) => r.json()),
      fetch("/api/rides").then((r) => r.json()),
      fetch("/api/payments").then((r) => r.json()),
    ]).then(([s, d, r, p]) => {
      setStats(s); setDrivers(d); setRides(r); setPayments(p); setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const sc: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400", assigned: "bg-blue-500/20 text-blue-400",
    in_progress: "bg-purple-500/20 text-purple-400", completed: "bg-green-500/20 text-green-400",
    cancelled: "bg-red-500/20 text-red-400",
  };
  const se: Record<string, string> = {
    pending: "⏳", assigned: "🛵", in_progress: "🏁", completed: "✅", cancelled: "❌",
    available: "🟢", busy: "🔴", offline: "⚫",
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-2xl animate-pulse">🛵 Cargando...</div></div>;

  return (
    <div className="min-h-screen">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <span className="text-3xl">🛵</span>
          <div><h1 className="text-xl font-bold">TaxiMotos.CU</h1><p className="text-gray-400 text-sm">Panel de Administración</p></div>
        </div>
      </header>
      <div className="bg-gray-900 border-b border-gray-800 px-6">
        <div className="max-w-7xl mx-auto flex gap-1">
          {[
            { key: "overview", label: "📊 Inicio" },
            { key: "drivers", label: "🏍️ Conductores" },
            { key: "rides", label: "🚗 Viajes" },
            { key: "payments", label: "💰 Pagos" },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={"px-4 py-3 text-sm font-medium transition-colors " + (activeTab === tab.key ? "text-yellow-400 border-b-2 border-yellow-400" : "text-gray-400 hover:text-white")}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <main className="max-w-7xl mx-auto p-6">
        {activeTab === "overview" && stats && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="text-gray-400 text-sm">Viajes Totales</p>
                <p className="text-3xl font-bold mt-1">{stats.totalRides}</p>
                <p className="text-green-400 text-sm mt-1">+{stats.todayRides} hoy</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="text-gray-400 text-sm">Ingresos Totales</p>
                <p className="text-3xl font-bold mt-1">{stats.totalEarnings} CUP</p>
                <p className="text-green-400 text-sm mt-1">+{stats.todayEarnings} CUP hoy</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="text-gray-400 text-sm">Conductores</p>
                <p className="text-3xl font-bold mt-1">{stats.activeDrivers}</p>
                <p className="text-gray-400 text-sm mt-1">{drivers.filter((d) => d.status === "available").length} disponibles</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="text-gray-400 text-sm">Pendientes</p>
                <p className="text-3xl font-bold mt-1">{stats.pendingRides}</p>
                <p className="text-gray-400 text-sm mt-1">{stats.completedRides} completados</p>
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <h2 className="text-lg font-bold mb-4">🚗 Últimos Viajes</h2>
              <div className="space-y-3">
                {rides.slice(0, 10).map((ride) => (
                  <div key={ride.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">#{ride.id}</span>
                        <span className={"text-xs px-2 py-0.5 rounded-full " + (sc[ride.status] || "")}>{se[ride.status]} {ride.status}</span>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">👤 {ride.clientName} → 🛵 {ride.driverName || "Sin asignar"}</p>
                      <p className="text-gray-500 text-xs">{ride.pickupAddress} → {ride.dropoffAddress || "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{ride.fare ? ride.fare + " CUP" : "—"}</p>
                    </div>
                  </div>
                ))}
                {rides.length === 0 && <p className="text-gray-500 text-center py-4">No hay viajes aún</p>}
              </div>
            </div>
          </div>
        )}
        {activeTab === "drivers" && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <h2 className="text-lg font-bold mb-4">🏍️ Conductores ({drivers.length})</h2>
            <div className="space-y-3">
              {drivers.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-2xl">{se[d.status] || "⚫"}</div>
                    <div>
                      <p className="font-bold">{d.firstName} {d.lastName || ""}</p>
                      <p className="text-gray-400 text-sm">📱 {d.phone || "—"} | 🏍️ {d.motorcyclePlate || "—"}</p>
                      <p className="text-gray-500 text-sm">ID: {d.telegramId} | ⭐ {d.rating.toFixed(1)}</p>
                    </div>
                  </div>
                  <div className="text-right"><p className="font-bold">{d.totalRides} viajes</p><p className="text-green-400">{d.totalEarnings} CUP</p></div>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === "rides" && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <h2 className="text-lg font-bold mb-4">🚗 Historial ({rides.length})</h2>
            <div className="space-y-3">
              {rides.map((ride) => (
                <div key={ride.id} className="p-4 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-lg">#{ride.id}</span>
                    <span className={"text-xs px-2 py-0.5 rounded-full " + (sc[ride.status] || "")}>{se[ride.status]} {ride.status}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>👤 {ride.clientName} ({ride.clientPhone || "—"})</div>
                    <div>🛵 {ride.driverName || "Sin asignar"}</div>
                    <div>🏠 {ride.pickupAddress}</div>
                    <div>🎯 {ride.dropoffAddress || "No especificado"}</div>
                  </div>
                  {ride.fare && <p className="mt-2 font-bold text-green-400">💰 {ride.fare} CUP</p>}
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === "payments" && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <h2 className="text-lg font-bold mb-4">💰 Pagos ({payments.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-3 px-2">Ticket</th><th className="text-left py-3 px-2">Monto</th>
                  <th className="text-left py-3 px-2">Método</th><th className="text-left py-3 px-2">Estado</th>
                  <th className="text-left py-3 px-2">Fecha</th>
                </tr></thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-gray-800">
                      <td className="py-3 px-2 font-bold">#{p.rideId}</td>
                      <td className="py-3 px-2">{p.amount} CUP</td>
                      <td className="py-3 px-2">{p.method === "cash" ? "💵 Efectivo" : "🏦 Transfer"}</td>
                      <td className="py-3 px-2"><span className={"text-xs px-2 py-0.5 rounded-full " + (p.status === "completed" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400")}>{p.status}</span></td>
                      <td className="py-3 px-2 text-gray-400">{p.paidAt ? new Date(p.paidAt).toLocaleString("es-CU") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
