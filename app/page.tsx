"use client";

import dynamic from "next/dynamic";

const EcoPlanMap = dynamic(() => import("./components/EcoPlanMap"), {
  ssr: false,
  loading: () => (
    <div style={{
      height: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#020c14", color: "#22c55e",
      fontFamily: "monospace"
    }}>
      Loading EcoPlan AI…
    </div>
  ),
});

export default function Home() {
  return (
    <main style={{ margin: 0, padding: 0, overflow: "hidden" }}>
      <EcoPlanMap />
    </main>
  );
}