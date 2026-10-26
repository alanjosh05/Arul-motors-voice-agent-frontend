"use client";

import { Ellipsis, Pencil, Plus, Tags, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ShowroomStaffDialog, StaffCategoriesDialog } from "@/components/forms/lazy";
import { PageHeader } from "@/components/page-header";
import { ToneBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMobile } from "@/lib/format";
import { useDeleteShowroomStaff, useShowroomStaff, useStaffCategories } from "@/lib/queries";
import type { ShowroomStaff, StaffCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

// A colour per category, in the categories' order.
const TONES = ["blue", "amber", "violet", "green", "red", "gray"] as const;

/** The showroom's people: sales, spares and mechanics (admins manage them).
 * Not CRM logins (Settings → Team). Admins also manage the categories; staff
 * in a "job card mechanics" category fill the job card's mechanic. */
export default function OurStaffPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data, isLoading } = useShowroomStaff();
  const { data: categoryRows } = useStaffCategories();
  const categories = (categoryRows ?? []).map((c) => c.name);
  const tone = (category: string) => TONES[Math.max(0, categories.indexOf(category)) % TONES.length];
  const [managing, setManaging] = useState(false);
  const [tab, setTab] = useState<"all" | StaffCategory>("all");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ShowroomStaff | null>(null);
  const [deleting, setDeleting] = useState<ShowroomStaff | null>(null);
  const people = data ?? [];
  const count = (c: string) => (c === "all" ? people.length : people.filter((p) => p.category === c).length);
  // A tab whose category was just deleted or renamed: back to All.
  const current = tab === "all" || categories.includes(tab) ? tab : "all";
  const shown = current === "all" ? people : people.filter((p) => p.category === current);

  return (
    <>
      <PageHeader
        title="Our staff"
        description={
          data
            ? categories.map((c) => `${count(c)} ${c.toLowerCase()}`).join(" · ")
            : "The showroom’s sales, spares and workshop people."
        }
        actions={
          isAdmin && (
            <>
              <Button variant="outline" onClick={() => setManaging(true)}>
                <Tags /> Categories
              </Button>
              <Button onClick={() => setAdding(true)}>
                <Plus /> Add staff
              </Button>
            </>
          )
        }
      />

      <Tabs value={current} onValueChange={(v) => setTab(v)}>
        <TabsList className="h-auto flex-wrap">
          {["all", ...categories].map((c) => (
            <TabsTrigger key={c} value={c} className="gap-1.5">
              {c === "all" ? "All" : c}
              <span className="tabular rounded-full bg-muted px-1.5 text-xs text-muted-foreground group-data-[state=active]:bg-primary/10">
                {count(c)}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="py-0">
        {isLoading ? (
          <div className="space-y-3 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : shown.length ? (
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((p) => (
                <TableRow key={p.id} className={cn(!p.active && "text-muted-foreground")}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold uppercase">
                        {p.name.slice(0, 2)}
                      </span>
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <ToneBadge tone={tone(p.category)}>{p.category}</ToneBadge>
                  </TableCell>
                  <TableCell className="tabular text-sm">{p.mobile_number ? formatMobile(p.mobile_number) : "—"}</TableCell>
                  <TableCell>
                    {p.active ? <ToneBadge tone="green">Working</ToneBadge> : <ToneBadge tone="gray">Left</ToneBadge>}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${p.name}`}>
                            <Ellipsis />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditing(p)}>
                            <Pencil /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleting(p)}>
                            <Trash2 /> Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UserRound />
              </EmptyMedia>
              <EmptyTitle>{current === "all" ? "No staff yet" : `No ${current.toLowerCase()} staff yet`}</EmptyTitle>
              <EmptyDescription>
                {isAdmin
                  ? "Add the showroom’s sales, spares and mechanic staff. Mechanics then appear on job cards."
                  : "An admin adds the showroom’s staff here."}
              </EmptyDescription>
            </EmptyHeader>
            {isAdmin && (
              <EmptyContent>
                <Button onClick={() => setAdding(true)}>
                  <Plus /> Add staff
                </Button>
              </EmptyContent>
            )}
          </Empty>
        )}
      </Card>

      {adding && (
        <ShowroomStaffDialog open={adding} onOpenChange={setAdding} category={current === "all" ? undefined : current} />
      )}
      {editing && <ShowroomStaffDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} person={editing} />}
      {managing && <StaffCategoriesDialog open={managing} onOpenChange={setManaging} />}
      {deleting && (
        <DeleteStaff person={deleting} onDone={() => setDeleting(null)} />
      )}
    </>
  );
}

function DeleteStaff({ person, onDone }: { person: ShowroomStaff; onDone: () => void }) {
  const { mutate } = useDeleteShowroomStaff();
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onDone()}
      title={`Remove ${person.name}?`}
      description="They’re taken off the list. Job cards keep the names written on them. (To keep them on the list but off job cards, edit them and switch off “Working here”.)"
      confirmLabel="Remove"
      destructive
      onConfirm={() => mutate(person.id)}
    />
  );
}
