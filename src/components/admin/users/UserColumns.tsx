import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { TableActionsDropdown } from "@/components/ui/table-actions-dropdown";
import { Eye, Edit, Trash2, Shield, KeyRound, Ban, CheckCircle } from "lucide-react";
import { User } from "@/hooks/useUsers";

interface UserColumnHandlers {
  onView: (user: User) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onEditRole?: (user: User) => void;
  onResetPassword?: (user: User) => void;
  onToggleSuspend?: (user: User) => void;
}

function RoleBadge({ user }: { user: User }) {
  const orgs = (user as any).organization_members as any[] | undefined;
  if (!orgs || orgs.length === 0) {
    return <span className="text-muted-foreground text-xs">No role</span>;
  }
  const primary = orgs[0];
  const role: string = primary?.role || "member";
  const orgType: string | undefined = primary?.organization?.organization_type;

  let classes = "h-5 text-[10px] px-1.5 capitalize";
  if (role === "admin") {
    classes += " bg-primary/10 text-primary";
  } else if (role === "employee") {
    classes += " bg-secondary/20 text-secondary-foreground";
  } else if (orgType === "partner") {
    classes += " bg-accent/10 text-accent-foreground";
  } else if (orgType === "subcontractor") {
    classes += " bg-muted";
  } else {
    classes += " bg-secondary/10";
  }

  return <Badge className={classes}>{role}</Badge>;
}

export function createUserColumns(handlers: UserColumnHandlers): ColumnDef<User>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "name",
      accessorKey: "first_name",
      header: "Name",
      cell: ({ row }) => {
        const user = row.original as any;
        const initials = `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase();
        return (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
              {initials || "?"}
            </div>
            <div className="flex flex-col">
              <span className="font-medium">{user.first_name} {user.last_name}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => {
        const email = row.getValue("email") as string;
        return <span className="text-sm text-muted-foreground">{email}</span>;
      },
    },
    {
      accessorKey: "user_role",
      header: "Role",
      cell: ({ row }) => <RoleBadge user={row.original} />,
    },
    {
      accessorKey: "user_organization",
      header: "Organization",
      cell: ({ row }) => {
        const orgs = (row.original as any).organization_members as any[] | undefined;
        if (!orgs || orgs.length === 0) {
          return <span className="text-muted-foreground">No organization</span>;
        }
        return (
          <div className="flex flex-col gap-1">
            {orgs.map((org) => (
              <Badge key={org.id} variant="outline" className="h-5 text-[10px] px-1.5">
                {org.organization?.name}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const u = row.original as any;
        const suspended = u?.status === "suspended" || u?.is_suspended === true;
        const isActive = suspended ? false : (row.getValue("is_active") as boolean);
        if (suspended) {
          return (
            <Badge variant="destructive" className="h-5 text-[10px] px-1.5">Suspended</Badge>
          );
        }
        return (
          <Badge variant={isActive ? "default" : "secondary"} className="h-5 text-[10px] px-1.5">
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "last_login",
      header: "Last Login",
      cell: ({ row }) => {
        const value = row.getValue("last_login") as string | null;
        return value ? new Date(value).toLocaleString() : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => {
        const value = row.getValue("created_at") as string | null;
        return value ? new Date(value).toLocaleDateString() : "";
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const user = row.original as User;
        const suspended = (user as any)?.status === "suspended" || (user as any)?.is_suspended === true;
        const actions = [
          { label: "View", icon: Eye, onClick: () => handlers.onView(user) },
          { label: "Edit", icon: Edit, onClick: () => handlers.onEdit(user) },
          { label: "Edit Role", icon: Shield, onClick: () => handlers.onEditRole ? handlers.onEditRole(user) : handlers.onEdit(user) },
          { label: "Reset Password", icon: KeyRound, onClick: () => handlers.onResetPassword?.(user), show: !!handlers.onResetPassword },
          { label: suspended ? "Activate" : "Suspend", icon: suspended ? CheckCircle : Ban, onClick: () => handlers.onToggleSuspend?.(user), show: !!handlers.onToggleSuspend },
          { label: "Delete", icon: Trash2, onClick: () => handlers.onDelete(user), variant: "destructive" as const },
        ];
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <TableActionsDropdown actions={actions} itemName={`${(user as any).first_name} ${(user as any).last_name}`} />
          </div>
        );
      },
      enableHiding: false,
    },
  ];
}
