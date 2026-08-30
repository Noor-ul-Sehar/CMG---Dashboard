import { UnileverView } from "@/components/unilever/unilever-view";

export const dynamic = "force-dynamic";

export default async function UnileverCasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return <UnileverView searchParams={params} />;
}