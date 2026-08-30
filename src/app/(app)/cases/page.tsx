import { CasesView } from "@/components/cases/cases-view";

export const dynamic = "force-dynamic";

export default async function AllCasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <CasesView
      title="All Cases"
      description="Every case in the central database."
      statusMode="all"
      searchParams={params}
      showNewButton
    />
  );
}