import { CasesView } from "@/components/cases/cases-view";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <CasesView
      title="Search Cases"
      description="Find cases by reference, target, brand, or status."
      statusMode="all"
      searchParams={params}
    />
  );
}