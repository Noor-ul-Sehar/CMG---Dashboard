import { getCaseFilterOptions, searchAllCases } from "@/lib/services/case-service";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/states";
import { ReferenceNumberList } from "@/components/cases/reference-number-list";

export const dynamic = "force-dynamic";

export default async function CmgReferencesPage() {
  let cases;
  let options;
  try {
    [cases, options] = await Promise.all([
      searchAllCases({}),
      getCaseFilterOptions(),
    ]);
  } catch {
    return <ErrorState message="Unable to load CMG reference numbers." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="CMG Reference Numbers"
        description={`${cases.length} reference number${cases.length === 1 ? "" : "s"} in use across the central database.`}
      />
      <Card>
        <CardBody>
          <ReferenceNumberList
            cases={cases}
            brands={options.brands}
            targetNatures={options.targetNatures}
          />
        </CardBody>
      </Card>
    </div>
  );
}