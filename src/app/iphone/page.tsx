import type { Metadata } from "next";
import { IPhoneDemo } from "@/components/IPhoneDemo";

export const metadata: Metadata = {
  title: "Reknit on iPhone — demo",
  robots: { index: false, follow: false },
};

export default function IPhonePage() {
  return <IPhoneDemo />;
}
