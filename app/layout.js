import "@/styles/globals.css";

export const metadata = {
  title: "TokStock",
  description: "Inventario de cuentas TikTok",
  manifest: "/manifest.json",
  themeColor: "#e84545",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TokStock",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="TokStock" />
      </head>
      <body>{children}</body>
    </html>
  );
}
