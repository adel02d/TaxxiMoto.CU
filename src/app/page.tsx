"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from 'next/dynamic';

const MapContent = dynamic(() => import('./MapComponent'), { 
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-50 text-gray-400 italic">Cargando mapa interactivo...</div>
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
  const [step, setStep] = useState(1); // 1: Mapa, 2: Datos del Cliente

  useEffect(() => {
    if (typeof window !== "undefined") {
      const telegram = (window as any).Telegram?.WebApp;
      if (telegram) {
        telegram.ready();
        telegram.expand();
        setTg(telegram);
        const tgUser = telegram.initDataUnsafe?.user;
        setUser(tgUser);
        if (tgUser) {
          setClientName(tgUser.first_name + (tgUser.last_name ? " " + tgUser.last_name : ""));
        }
      }

      navigator.geolocation.getCurrentPosition((pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setPickup(coords);
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
    } catch (e) {
      console.error("Error ruta:", e);
    } finally {
      setCalculating(false);
    }
  }, []);

  useEffect(() => {
    if (pickup && dropoff) {
      calculateRoute(pickup, dropoff);
    } else {
      setRouteCoords([]);
    }
  }, [pickup, dropoff, calculateRoute]);

  const handleMapClick = (latlng: any) => {
    if (success) return;
    if (!pickup) {
      setPickup([latlng.lat, latlng.lng]);
      setPickupAddress(`${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`);
    } else if (!dropoff) {
      setDropoff([latlng.lat, latlng.lng]);
      setDropoffAddress(`${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`);
    } else {
      setPickup([latlng.lat, latlng.lng]);
      setDropoff(null);
      setRouteCoords([]);
      setDropoffAddress("");
      setPickupAddress(`${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`);
    }
  };

  const handleConfirm = async () => {
    if (!clientName || !clientPhone) {
      alert("Por favor completa tu nombre y teléfono");
      return;
    }
    setLoading(true);

    const requestData = {
      userId: user?.id || 743356675,
      clientName: clientName,
      clientPhone: clientPhone,
      pickup: pickupAddress,
      dropoff: dropoffAddress,
      pickupCoords: pickup,
      dropoffCoords: dropoff,
      fare: price,
      distance: distance
    };

    try {
      const res = await fetch("/api/rides/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      });
      const resData = await res.json();
      if (resData.ok) {
        setSuccess(true);
        if (tg) {
          setTimeout(() => tg.close(), 2500);
        }
      } else {
        alert("Error: " + (resData.error || "Desconocido"));
      }
    } catch (e: any) {
      console.error(e);
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white text-center p-6 animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center text-5xl mb-6 shadow-sm">✓</div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">¡VIAJE SOLICITADO!</h1>
        <p className="text-gray-500 mt-2 text-sm">Estamos buscando al conductor<br/>más cercano para ti.</p>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col font-sans">
        <header className="flex items-center gap-2 mb-8">
          <button onClick={() => setStep(1)} className="text-2xl">←</button>
          <h1 className="text-xl font-bold">Datos de contacto</h1>
        </header>

        <div className="bg-white rounded-3xl p-6 shadow-xl space-y-6 flex-1">
          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Tu Nombre</label>
            <input 
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ej: Juan Pérez"
              className="w-full bg-gray-100 border-none rounded-2xl py-4 px-4 mt-2 text-sm font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Teléfono de contacto</label>
            <input 
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="Ej: 5351234567"
              className="w-full bg-gray-100 border-none rounded-2xl py-4 px-4 mt-2 text-sm font-bold"
            />
          </div>

          <div className="pt-6 border-t border-gray-100">
            <div className="flex justify-between mb-2">
              <span className="text-gray-400 text-sm">Distancia:</span>
              <span className="font-bold">{distance.toFixed(2)} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Precio Total:</span>
              <span className="text-2xl font-black text-yellow-600">{price} CUP</span>
            </div>
          </div>
        </div>

        <button 
          onClick={handleConfirm}
          disabled={!clientName || !clientPhone || loading}
          className={`w-full mt-6 py-5 rounded-3xl font-black text-white shadow-2xl transition-all active:scale-95 ${(!clientName || !clientPhone || loading) ? 'bg-gray-200' : 'bg-yellow-500'}`}
        >
          {loading ? "Confirmando..." : "Confirmar Viaje"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white text-black font-sans overflow-hidden">
      <div className="absolute top-4 left-4 right-4 z-[1000] pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-gray-100 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛵</span>
            <div>
              <h1 className="text-sm font-black uppercase tracking-tight">TaxiMotos.CU</h1>
              <p className="text-[10px] text-gray-500 font-bold uppercase">
                {!pickup ? "Marca el Origen" : !dropoff ? "Marca el Destino" : "Ruta Lista"}
              </p>
            </div>
          </div>
          {calculating && <div className="animate-spin h-4 w-4 border-2 border-yellow-500 border-t-transparent rounded-full"></div>}
        </div>
      </div>

      <div className="flex-1 z-10">
        <MapContent 
          pickup={pickup} 
          dropoff={dropoff} 
          routeCoords={routeCoords}
          onMapClick={handleMapClick} 
        />
      </div>

      <div className="p-6 bg-white rounded-t-[40px] shadow-[0_-20px_40px_rgba(0,0,0,0.1)] z-[1000] border-t border-gray-50">
        <div className="space-y-4">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-500"></div>
            <input readOnly placeholder="Toca el mapa para origen..." value={pickupAddress} className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-10 pr-4 text-sm font-medium" />
          </div>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-500"></div>
            <input readOnly placeholder="Toca el mapa para destino..." value={dropoffAddress} className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-10 pr-4 text-sm font-medium" />
          </div>
        </div>

        <button 
          onClick={() => setStep(2)}
          disabled={!pickup || !dropoff || calculating}
          className={`w-full mt-6 py-5 rounded-[24px] font-black text-white shadow-2xl transition-all active:scale-95 uppercase tracking-widest ${(!pickup || !dropoff || calculating) ? 'bg-gray-200 text-gray-400' : 'bg-yellow-500 hover:bg-yellow-400'}`}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
