import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Expert Diagnostic Workbench",
  description: "Private technical expert diagnostic and remediation workbench.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function ExpertAuditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
