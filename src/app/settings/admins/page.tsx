import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { PasswordInput } from "@/components/password-input";
import { Badge, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/server/auth/session";
import { changeOwnPasswordAction, createAdminAction, resetAdminPasswordAction, setAdminStatusAction } from "./actions";

export default async function AdminSettingsPage() {
  const current = await requireAdmin();
  const admins = await db.query.adminUsers.findMany({
    where: eq(adminUsers.workspaceId, current.workspaceId),
    orderBy: (table, { asc }) => [asc(table.email)]
  });

  return (
    <>
      <PageHeader title="Administrators" action={<Link href="/settings" className="text-sm text-muted hover:text-ink">Back to settings</Link>} />
      <div className="overflow-hidden rounded border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel text-muted">
            <tr><th className="p-3">Email</th><th>Name</th><th>Status</th><th>Last login</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id} className="border-t border-line align-top">
                <td className="p-3 font-medium">{admin.email}</td>
                <td>{admin.displayName}</td>
                <td>{admin.isActive ? <Badge tone="good">active</Badge> : <Badge tone="warn">inactive</Badge>}</td>
                <td>{admin.lastLoginAt?.toISOString() ?? "never"}</td>
                <td className="p-3">
                  <div className="space-y-3">
                    <form action={setAdminStatusAction}>
                      <input type="hidden" name="adminUserId" value={admin.id} />
                      <input type="hidden" name="isActive" value={admin.isActive ? "false" : "true"} />
                      <button disabled={admin.id === current.id && admin.isActive} className="text-sm text-muted hover:text-ink disabled:opacity-40">
                        {admin.isActive ? "Deactivate" : "Reactivate"}
                      </button>
                    </form>
                    <form action={resetAdminPasswordAction} className="flex max-w-md gap-2">
                      <input type="hidden" name="adminUserId" value={admin.id} />
                      <PasswordInput name="password" minLength={12} required placeholder="New password" autoComplete="new-password" className="w-48 rounded border-line text-sm" />
                      <button className="rounded border border-line px-2 py-1 text-sm hover:bg-panel">Reset</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <form action={createAdminAction} className="grid gap-3 rounded border border-line bg-white p-5">
          <h2 className="font-semibold">Add Administrator</h2>
          <label className="text-sm font-medium">Email<input name="email" type="email" required className="mt-1 w-full rounded border-line" /></label>
          <label className="text-sm font-medium">Display name<input name="displayName" required className="mt-1 w-full rounded border-line" /></label>
          <label className="text-sm font-medium">Temporary password<PasswordInput name="password" minLength={12} required autoComplete="new-password" /></label>
          <button className="w-fit rounded bg-accent px-3 py-2 text-sm font-medium text-white">Create administrator</button>
        </form>

        <form action={changeOwnPasswordAction} className="grid gap-3 rounded border border-line bg-white p-5">
          <h2 className="font-semibold">Change My Password</h2>
          <label className="text-sm font-medium">Current password<PasswordInput name="currentPassword" required autoComplete="current-password" /></label>
          <label className="text-sm font-medium">New password<PasswordInput name="newPassword" minLength={12} required autoComplete="new-password" /></label>
          <p className="text-sm text-muted">Changing your password revokes existing sessions. Sign in again with the new password.</p>
          <button className="w-fit rounded bg-accent px-3 py-2 text-sm font-medium text-white">Change password</button>
        </form>
      </div>
    </>
  );
}
