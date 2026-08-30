import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import {
  listMaster,
  MASTER_LIST_KEYS,
} from "@/lib/services/master-service";
import { MasterListManager } from "@/components/reference/master-list-manager";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/states";

export const dynamic = "force-dynamic";

const LIST_META: Record<
  string,
  { title: string; description: string; endpoint: string; singular: string; emptyText: string }
> = {
  target_by: {
    title: "Target By",
    description: "Who each case is targeted by. Kept separate from investigators.",
    endpoint: "/api/master/target_by",
    singular: "Entry",
    emptyText: "No Target By entries yet.",
  },
  targets: {
    title: "Targets",
    description: "Named targets used on cases.",
    endpoint: "/api/master/targets",
    singular: "Target",
    emptyText: "No targets yet. Targets are referenced by cases.",
  },
  target_natures: {
    title: "Target Natures",
    description: "What each target deals in (e.g. Garments, Electronics).",
    endpoint: "/api/master/target_natures",
    singular: "Nature",
    emptyText: "No target natures yet.",
  },
  brands: {
    title: "Brands",
    description: "Brands maintained separately from targets. A case can have multiple brands.",
    endpoint: "/api/master/brands",
    singular: "Brand",
    emptyText: "No brands yet. Add brands to select them on cases.",
  },
  clients: {
    title: "Clients",
    description: "Client companies referenced by cases.",
    endpoint: "/api/master/clients",
    singular: "Client",
    emptyText: "No clients yet.",
  },
};

export default async function ReferenceDataPage() {
  let lists: Awaited<ReturnType<typeof listMaster>>[];
  try {
    lists = await Promise.all(MASTER_LIST_KEYS.map((key) => listMaster(key)));
  } catch {
    return (
      <ErrorState message="Unable to load reference data from the database." />
    );
  }

  const user = await getSessionUser();
  const canManage = user ? can(user, "teams.manage") : false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Data"
        description="Reference lists used across the dashboard. Records are never deleted — deactivation is safe for historical cases."
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {MASTER_LIST_KEYS.map((key, i) => {
          const meta = LIST_META[key];
          return (
            <MasterListManager
              key={key}
              title={meta.title}
              description={meta.description}
              rows={lists[i]}
              endpoint={meta.endpoint}
              canManage={canManage}
              singular={meta.singular}
              emptyText={meta.emptyText}
            />
          );
        })}
      </div>
    </div>
  );
}
