import { CasesView } from "@/components/cases/cases-view";

export const dynamic = "force-dynamic";

export default async function OpenCasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <CasesView
      title="Open Cases"
      description="Cases currently being worked on."
      statusMode="open"
      searchParams={params}
    />
  );
}