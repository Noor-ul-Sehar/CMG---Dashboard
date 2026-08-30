import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { CustomRecordalsManager } from "@/components/custom-recordals/custom-recordals-manager";

export const dynamic = "force-dynamic";

export default async function CustomRecordalsPage() {
  const user = await getSessionUser();
  const canManage = user ? can(user, "customRecordals.manage") : false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Custom Recordals"
        description="Independent recordal register — a Recordal Date, a Client Reference #, a CMG Reference # and a Brand. Not linked to Market Cases."
      />
      <CustomRecordalsManager canManage={canManage} />
    </div>
  );
}
