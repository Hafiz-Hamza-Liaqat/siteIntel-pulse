import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Secure account access for SiteIntel Pulse.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
