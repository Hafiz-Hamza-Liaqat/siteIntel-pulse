import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Website Owner Report",
  description: "Private website owner health and intelligence report.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function OwnerReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
