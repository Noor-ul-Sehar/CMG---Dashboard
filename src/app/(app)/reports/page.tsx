import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { getReportFilterOptions } from "@/lib/services/report-service";
import { PageHeader } from "@/components/ui/page-header";
import { ReportsDashboard } from "@/components/reports/reports-dashboard";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  const [options] = await Promise.all([getReportFilterOptions()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reporting & Export"
        description="Build, preview and export reports from Market Cases."
      />
      <ReportsDashboard options={options} canExport={can(user, "export")} />
    </div>
  );
}