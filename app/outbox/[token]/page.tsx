import type { Metadata } from "next";
import OutboxView from "@/components/OutboxView";

export const metadata: Metadata = {
  title: "寄件箱",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function OutboxPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <OutboxView key={token} token={token} />;
}
