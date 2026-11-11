import { AreaPicker } from "@/components/start/AreaPicker";

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ add?: string }>;
}) {
  const { add } = await searchParams;
  return <AreaPicker adding={add === "1"} />;
}
