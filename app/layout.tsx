import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Chromavive",
  description: "Ubah foto Anda menjadi karya duotone penuh gaya dengan perpaduan warna Brave Pink dan Hero Green. Chromavive menghadirkan converter yang simpel, responsif, dan modern untuk semua perangkat.",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${poppins.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
