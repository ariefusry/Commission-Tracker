"use client"; // Cadangan terakhir jika root layout gagal; wajib punya <html> dan <body> sendiri.

export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="id">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <p style={{ fontWeight: 600 }}>Terjadi kesalahan</p>
          <p style={{ color: "#737373", fontSize: 14 }}>Muat ulang halaman atau coba lagi beberapa saat lagi.</p>
          <button onClick={() => retry()} style={{ marginTop: 12, padding: "8px 16px", borderRadius: 8, border: "1px solid #e5e5e5", background: "#171717", color: "#fafafa" }}>
            Coba lagi
          </button>
        </div>
      </body>
    </html>
  );
}
