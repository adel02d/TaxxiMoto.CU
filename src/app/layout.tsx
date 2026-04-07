import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaxiMotos.CU - Panel de Administración",
  description: "Dashboard administrativo para TaxiMotos.CU",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-950 text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
