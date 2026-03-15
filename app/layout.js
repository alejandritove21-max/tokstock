import "@/styles/globals.css";

export const metadata = {
  title: "Cimmaron",
  description: "Cuentas TikTok monetizadas",
  manifest: "/manifest.json",
  themeColor: "#25F4EE",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cimmaron",
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
        <meta name="apple-mobile-web-app-title" content="Cimmaron" />
        <link rel="apple-touch-icon" href="/logo-icon.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
