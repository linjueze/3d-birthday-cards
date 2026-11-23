import type { Metadata } from "next";
import OutboxView from "@/components/OutboxView";

export const metadata: Metadata = {
  title: "寄件箱",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function OutboxPage() {
  return <OutboxView />;
}
