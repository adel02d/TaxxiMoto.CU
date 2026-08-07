"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from 'next/dynamic';

const MapContent = dynamic(() => import('./MapComponent'), { 
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-50 text-gray-400 italic animate-pulse">Cargando mapa...</div>
});

export default function MiniApp() {
  const [tg, setTg] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [pickup, setPickup] = useState<[number, number] | null>(null);
  const [dropoff, setDropoff] = useState<[number, number] | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [distance, setDistance] = useState(0);
  const [price, setPrice] = useState(0);
  const [calculating, setCalculating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const telegram = (window as any).Telegram?.WebApp;
      if (telegram) {
        telegram.ready();
        telegram.expand();
        setTg(telegram);
        const tgUser = telegram.initDataUnsafe?.user;
        setUser(tgUser);
        if (tgUser) setClientName(`${tgUser.first_name}${tgUser.last_name ? ' ' + tgUser.last_name : ''}`);
      }

      navigator.geolocation.getCurrentPosition((pos) => {
        setPickup([pos.coords.latitude, pos.coords.longitude]);
        setPickupAddress("📍 Ubicación actual");
      }, () => console.log("GPS no disponible"));
    }
  }, []);

  const calculateRoute = useCallback(async (p: [number, number], d: [number, number]) => {
    setCalculating(true);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${p[1]},${p[0]};${d[1]},${d[0]}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes[0]) {
        const dist = data.routes[0].distance / 1000;
        setDistance(dist);
        setPrice(Math.max(500, Math.round(dist * 300)));
        const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
        setRouteCoords(coords);
      }
    } catch (e) { console.error(e); } finally { setCalculating(false); }
  }, []);

  useEffect(() => {
    if (pickup && dropoff) calculateRoute(pickup, dropoff);
    else setRouteCoords([]);
  }, [pickup, dropoff, calculateRoute]);

  const handleMapClick = (latlng: any) => {
    if (success) return;
    if (!pickup) {
      setPickup([latlng.lat, latlng.lng]);
      setPickupAddress(`Punto A (${latlng.lat.toFixed(4)})`);
    } else if (!dropoff) {
      setDropoff([latlng.lat, latlng.lng]);
      setDropoffAddress(`Punto B (${latlng.lat.toFixed(4)})`);
    } else {
      setPickup([latlng.lat, latlng.lng]);
      setDropoff(null);
      setRouteCoords([]);
      setPickupAddress(`Punto A (${latlng.lat.toFixed(4)})`);
    }
  };

  const handleConfirm = async () => {
    if (!clientName || !clientPhone) return alert("Completa tus datos");
    setLoading(true);
    const requestData = {
      userId: user?.id || 743356675,
      clientName, clientPhone,
      pickup: pickupAddress, dropoff: dropoffAddress,
      pickupCoords: pickup, dropoffCoords: dropoff,
      fare: price, distance: distance
    };

    try {
      const res = await fetch("/api/rides/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      });
      if ((await res.json()).ok) {
        setSuccess(true);
        setTimeout(() => tg?.close(), 3000);
      }
    } catch (e) { alert("Error de conexión"); } finally { setLoading(false); }
  };

  if (success) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white text-center p-8 animate-in fade-in duration-700">
      <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center text-5xl mb-6 shadow-sm ring-4 ring-green-50">✓</div>
      <h1 className="text-3xl font-black text-gray-900 mb-2">¡PEDIDO LISTO!</h1>
      <p className="text-gray-500 text-sm">Un conductor del equipo irá por ti en minutos.</p>
    </div>
  );

  if (step === 2) return (
    <div className="min-h-screen bg-white p-6 flex flex-col font-sans">
      <header className="flex items-center gap-4 mb-10">
        <button onClick={() => setStep(1)} className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-full text-xl">←</button>
        <h1 className="text-2xl font-black text-gray-900">Tus Datos</h1>
      </header>
      <div className="space-y-6 flex-1">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Completo</label>
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-50 focus:border-yellow-400 rounded-2xl py-4 px-5 text-sm font-bold transition-all outline-none" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Teléfono</label>
          <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="Ej: 5351234567" className="w-full bg-gray-50 border-2 border-gray-50 focus:border-yellow-400 rounded-2xl py-4 px-5 text-sm font-bold transition-all outline-none" />
        </div>
        <div className="bg-yellow-50 p-6 rounded-[32px] border border-yellow-100 flex justify-between items-center">
          <div><p className="text-[10px] text-yellow-600 font-black uppercase">Tarifa Final</p><p className="text-3xl font-black text-yellow-700">{price} <span className="text-sm">CUP</span></p></div>
          <div className="text-right"><p className="text-[10px] text-yellow-600 font-black uppercase">Recorrido</p><p className="text-lg font-bold text-yellow-700">{distance.toFixed(2)} km</p></div>
        </div>
      </div>
      <button onClick={handleConfirm} disabled={!clientName || !clientPhone || loading} className={`w-full mt-6 py-5 rounded-[24px] font-black text-white shadow-2xl transition-all active:scale-95 uppercase tracking-widest ${(!clientName || !clientPhone || loading) ? 'bg-gray-200' : 'bg-gray-900 hover:bg-black'}`}>
        {loading ? "..." : "Confirmar Ahora"}
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-white text-black font-sans overflow-hidden">
      <div className="absolute top-4 left-4 right-4 z-[1000]">
        <div className="bg-white/80 backdrop-blur-xl p-4 rounded-3xl shadow-xl border border-white/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500 w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-200">
              <span className="text-xl">🛵</span>
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-tight">TaxiMotos.CU</h1>
              <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">
                {!pickup ? "Origen" : !dropoff ? "Destino" : "Listo"}
              </p>
            </div>
          </div>
          {calculating && <div className="animate-spin h-4 w-4 border-2 border-yellow-500 border-t-transparent rounded-full"></div>}
        </div>
      </div>

      <div className="flex-1 z-10"><MapContent pickup={pickup} dropoff={dropoff} routeCoords={routeCoords} onMapClick={handleMapClick} /></div>

      <div className="p-6 bg-white rounded-t-[40px] shadow-[0_-20px-60px_rgba(0,0,0,0.1)] z-[1000] border-t border-gray-50">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className={`p-3 rounded-2xl border ${!pickup ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100'}`}>
            <p className="text-[8px] font-black text-gray-400 uppercase">Recogida</p>
            <p className="text-[10px] font-bold truncate">{pickupAddress || "Pendiente"}</p>
          </div>
          <div className={`p-3 rounded-2xl border ${pickup && !dropoff ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100'}`}>
            <p className="text-[8px] font-black text-gray-400 uppercase">Destino</p>
            <p className="text-[10px] font-bold truncate">{dropoffAddress || "Pendiente"}</p>
          </div>
        </div>
        <button onClick={() => setStep(2)} disabled={!pickup || !dropoff || calculating} className={`w-full py-5 rounded-[24px] font-black text-white shadow-2xl transition-all active:scale-95 uppercase tracking-widest ${(!pickup || !dropoff || calculating) ? 'bg-gray-100 text-gray-400' : 'bg-yellow-500 hover:bg-yellow-400 shadow-yellow-200'}`}>
          Continuar
        </button>
      </div>
    </div>
  );
}
