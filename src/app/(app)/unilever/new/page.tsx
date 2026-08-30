import { redirect } from "next/navigation";
import { listUnileverBrands } from "@/lib/services/unilever-service";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { UnileverForm } from "@/components/unilever/unilever-form";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/states";

export const dynamic = "force-dynamic";

export default async function NewUnileverCasePage() {
  const user = await getSessionUser();
  if (!user || !can(user, "cases.create")) {
    redirect("/dashboard");
  }

  let brands: { id: number; name: string }[];
  try {
    brands = await listUnileverBrands();
  } catch {
    return <ErrorState message="Unable to load Unilever brand data from the database." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Unilever Case"
        description="Create a new case in the Unilever module."
      />
      <UnileverForm mode="new" brands={brands} />
    </div>
  );
}