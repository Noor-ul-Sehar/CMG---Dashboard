import { CasesView } from "@/components/cases/cases-view";

export const dynamic = "force-dynamic";

export default async function CloseOneCasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <CasesView
      title="Close 1 Cases"
      description="Cases with a Close 1 status."
      statusMode="close1"
      searchParams={params}
    />
  );
}