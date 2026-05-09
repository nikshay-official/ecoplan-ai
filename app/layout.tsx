import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EcoPlan AI — Environmental Simulation Platform',
  description: 'Real-time 3D pollution visualization and environmental planning tool',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#000d1a] text-white antialiased overflow-hidden">{children}</body>
    </html>
  );
}
