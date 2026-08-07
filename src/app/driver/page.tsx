"use client";

import { useEffect, useState } from "react";

export default function DriverPanel() {
  const [tg, setTg] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const telegram = (window as any).Telegram?.WebApp;
      if (telegram) {
        telegram.ready();
        setTg(telegram);
        const user = telegram.initDataUnsafe?.user;
        if (user) {
          fetch(`/api/drivers`)
            .then(res => res.json())
            .then(data => {
              const current = data.find((d: any) => d.telegramId.toString() === user.id.toString());
              setDriver(current);
              setLoading(false);
            });
        }
      }
    }
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-900 text-white italic">Cargando perfil de conductor...</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 font-sans">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-yellow-500 uppercase italic">Panel Conductor</h1>
          <p className="text-gray-400 text-sm">Hola, {driver?.firstName || "Chofer"}</p>
        </div>
        <span className="text-4xl">🏍️</span>
      </header>

      {/* Tarjeta de Deuda */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-6 shadow-2xl border border-gray-700 mb-6">
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Comisión Pendiente</p>
        <h2 className="text-4xl font-black text-white">{driver?.debt || 0} <span className="text-lg text-yellow-500">CUP</span></h2>
        
        <div className="mt-6 pt-6 border-t border-gray-700">
          <p className="text-gray-400 text-[10px] uppercase font-bold mb-2 text-center">Tarjeta de Pago</p>
          <div className="bg-black/30 p-4 rounded-2xl text-center border border-dashed border-gray-600">
            <code className="text-yellow-400 text-lg font-mono tracking-tighter">9225 XXXX XXXX XXXX</code>
          </div>
        </div>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-900 p-4 rounded-2xl border border-gray-800">
          <p className="text-gray-500 text-[10px] font-bold uppercase">Viajes</p>
          <p className="text-xl font-bold">{driver?.totalRides || 0}</p>
        </div>
        <div className="bg-gray-900 p-4 rounded-2xl border border-gray-800">
          <p className="text-gray-500 text-[10px] font-bold uppercase">Gratis</p>
          <p className="text-xl font-bold text-green-400">{driver?.freeRidesLeft || 0}</p>
        </div>
      </div>

      <button 
        onClick={() => tg?.close()}
        className="w-full py-4 bg-yellow-500 text-black font-black rounded-2xl shadow-xl active:scale-95 transition-transform"
      >
        VOLVER A TELEGRAM
      </button>

      <footer className="mt-10 text-center">
        <p className="text-gray-600 text-[10px] uppercase tracking-widest font-bold">TaxiMotos.CU © 2026</p>
      </footer>
    </div>
  );
}
