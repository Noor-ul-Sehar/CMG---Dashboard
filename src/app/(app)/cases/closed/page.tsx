import { CasesView } from "@/components/cases/cases-view";

export const dynamic = "force-dynamic";

export default async function ClosedCasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <CasesView
      title="Closed Cases"
      description="Cases that have been closed."
      statusMode="closed"
      searchParams={params}
    />
  );
}