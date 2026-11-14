import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel de organizador",
  robots: { index: false, follow: false },
};

export default function OrganizerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" /><link href="https://fonts.googleapis.com/css2?family=Material+Icons+Outlined&display=block" rel="stylesheet" />{children}</>;
}
