"use client";

import {
  AudioLines,
  CloudUpload,
  DatabaseBackup,
  ExternalLink,
  FileSpreadsheet,
  KeyRound,
  Server,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormDialog } from "@/components/forms/form-dialog";
import { PageHeader } from "@/components/page-header";
import { RoleBadge, ToneBadge } from "@/components/status-badges";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { API_URL, downloadFile, errorMessage } from "@/lib/api";
import { formatTimestamp, initials } from "@/lib/format";
import {
  useChangePassword,
  useCreateStaff,
  useDeleteStaff,
  useSetVoiceEnabled,
  useSettings,
  useStaff,
  useVoiceStatus,
} from "@/lib/queries";
import type { StaffUser } from "@/lib/types";

function PasswordCard() {
  const change = useChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>Use at least 8 characters.</CardDescription>
      </CardHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (next.length < 8) return setError("New password must be at least 8 characters.");
          if (next !== confirm) return setError("Passwords don't match.");
          setError("");
          change.mutate(
            { current_password: current, new_password: next },
            { onSuccess: () => { setCurrent(""); setNext(""); setConfirm(""); } },
          );
        }}
      >
        <CardContent>
          <FieldGroup className="max-w-md">
            <Field>
              <FieldLabel htmlFor="p-current">Current password</FieldLabel>
              <Input id="p-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="p-new">New password</FieldLabel>
              <Input id="p-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
            </Field>
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor="p-confirm">Confirm new password</FieldLabel>
              <Input id="p-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required aria-invalid={!!error} />
              <FieldError>{error}</FieldError>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-6 border-t pt-6">
          <Button type="submit" disabled={change.isPending}>
            {change.isPending ? <Spinner /> : <KeyRound />} Update password
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function AddMemberDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateStaff();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [error, setError] = useState("");
  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) { setFullName(""); setUsername(""); setPassword(""); setRole("staff"); setError(""); }
      }}
      title="Add team member"
      description="They sign in with this username and password."
      submitLabel="Add member"
      pending={create.isPending}
      onSubmit={() => {
        if (password.length < 8) return setError("Password must be at least 8 characters.");
        setError("");
        create.mutate({ full_name: fullName.trim() || undefined, username: username.trim(), password, role }, { onSuccess: () => onOpenChange(false) });
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="s-name">Full name</FieldLabel>
          <Input id="s-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ravi Kumar" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="s-user">Username</FieldLabel>
            <Input id="s-user" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="ravi" required />
          </Field>
          <Field>
            <FieldLabel>Role</FieldLabel>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field data-invalid={!!error}>
          <FieldLabel htmlFor="s-pass">Temporary password</FieldLabel>
          <Input id="s-pass" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required aria-invalid={!!error} />
          <FieldDescription>Ask them to change it from Settings after signing in.</FieldDescription>
          <FieldError>{error}</FieldError>
        </Field>
      </FieldGroup>
    </FormDialog>
  );
}

function TeamCard({ me }: { me: StaffUser }) {
  const { data, isLoading } = useStaff();
  const remove = useDeleteStaff();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<StaffUser | null>(null);
  return (
    <Card className="pb-0">
      <CardHeader>
        <CardTitle>Team</CardTitle>
        <CardDescription>People who can sign in to the CRM. Admins can manage the team.</CardDescription>
        <CardAction>
          <Button onClick={() => setAdding(true)}>
            <UserPlus /> Add member
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="pr-6" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 2 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4} className="px-6"><Skeleton className="h-8" /></TableCell>
                  </TableRow>
                ))
              : data?.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials(u.full_name || u.username)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {u.full_name || u.username} {u.id === me.id && <span className="text-xs font-normal text-muted-foreground">(you)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">@{u.username}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><RoleBadge role={u.role} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.created_at ? formatTimestamp(u.created_at) : "—"}</TableCell>
                    <TableCell className="pr-6 text-right">
                      {u.id !== me.id && (
                        <Button variant="ghost" size="icon-sm" onClick={() => setRemoving(u)} aria-label={`Remove ${u.username}`}>
                          <Trash2 className="text-muted-foreground" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </CardContent>
      <AddMemberDialog open={adding} onOpenChange={setAdding} />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove ${removing?.full_name || removing?.username}?`}
        description="They will no longer be able to sign in."
        confirmLabel="Remove"
        destructive
        onConfirm={() => removing && remove.mutate(removing.id)}
      />
    </Card>
  );
}

function VoiceAgentCard({ isAdmin }: { isAdmin: boolean }) {
  const { data, isLoading, refetch, isFetching } = useVoiceStatus();
  const settings = useSettings();
  const setEnabled = useSetVoiceEnabled();
  const enabled = settings.data?.voice_agent_enabled === true;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AudioLines className="size-4 text-primary" /> Voice agent
        </CardTitle>
        <CardDescription>Gemini Live on Google Cloud, speaking Tanglish as Arul Motors Yamaha, Nazareth.</CardDescription>
        <CardAction>
          {settings.isLoading || (enabled && isLoading) ? (
            <Skeleton className="h-5 w-16" />
          ) : !enabled ? (
            <ToneBadge tone="gray">Turned off</ToneBadge>
          ) : data?.online ? (
            <ToneBadge tone="green">Online</ToneBadge>
          ) : (
            <ToneBadge tone="red">Offline</ToneBadge>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <Field orientation="horizontal" className="rounded-lg border p-3">
          <FieldContent>
            <FieldTitle>Voice agent connection</FieldTitle>
            <FieldDescription>
              {enabled
                ? "On: staff can start calls with the agent."
                : "Off: no calls can start (from the CRM or the voice page) and every call button is hidden for all staff."}
              {!isAdmin && " Only an admin can change this."}
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={enabled}
            disabled={!isAdmin || settings.isLoading || setEnabled.isPending}
            onCheckedChange={(on) => setEnabled.mutate(on)}
            aria-label="Voice agent connection"
          />
        </Field>
        <ul className="grid gap-3 sm:grid-cols-2">
          {[
            ["Calls from", "Follow-ups, Customers and each customer's profile (Call with agent)."],
            ["What it does", "Confirms the service date, books it, can reschedule or cancel, and logs the outcome."],
            ["Phone calls", "Calls run in the browser for now. Real phone calls switch on once telephony (Plivo) is set up."],
            ["Privacy", "Only signed-in staff can start calls; the agent only discusses the customer on the call."],
          ].map(([k, v]) => (
            <li key={k} className="rounded-lg border bg-muted/30 p-3">
              <p className="font-medium">{k}</p>
              <p className="text-muted-foreground">{v}</p>
            </li>
          ))}
        </ul>
      </CardContent>
      {enabled && (
        <CardFooter className="border-t pt-6">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching && <Spinner />} Check again
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

function DownloadButton({
  path,
  fallbackName,
  icon: Icon,
  children,
  variant = "outline",
}: {
  path: string;
  fallbackName: string;
  icon: React.ComponentType;
  children: React.ReactNode;
  variant?: "default" | "outline";
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant={variant}
      disabled={busy}
      onClick={() => {
        setBusy(true);
        downloadFile(path, fallbackName)
          .then(() => toast.success("Download started"))
          .catch((e) => toast.error(errorMessage(e)))
          .finally(() => setBusy(false));
      }}
    >
      {busy ? <Spinner /> : <Icon />} {children}
    </Button>
  );
}

/** Admins: Excel export to work on, a copy of the database, and the nightly backups. */
function DataCard() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-4 text-primary" /> Export to Excel
          </CardTitle>
          <CardDescription>
            Everything in the CRM as an Excel workbook to filter, sort and work on: Customers &amp; Bikes, Bookings, Calls and Service Types.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Changes made in Excel don&rsquo;t come back into the CRM; edit records here.
        </CardContent>
        <CardFooter className="border-t pt-6">
          <DownloadButton path="/api/admin/export.xlsx" fallbackName="arul-motors-crm.xlsx" icon={FileSpreadsheet} variant="default">
            Download Excel
          </DownloadButton>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseBackup className="size-4 text-primary" /> Database backup
          </CardTitle>
          <CardDescription>A complete copy of the CRM database, e.g. before a big change or to keep a monthly copy.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-2 rounded-lg border bg-muted/30 p-3">
            <CloudUpload className="mt-0.5 size-4 shrink-0 text-success" />
            <p>
              <span className="font-medium">Automatic:</span> a copy goes to Google Cloud Storage (Delhi) every night at 8:50 PM
              and is kept for 90 days, plus a daily disk snapshot kept for 14 days.
            </p>
          </div>
          <p className="text-muted-foreground">
            The file holds every customer&rsquo;s name and phone number. Keep it private and don&rsquo;t share it in groups.
          </p>
        </CardContent>
        <CardFooter className="border-t pt-6">
          <DownloadButton path="/api/admin/backup.db" fallbackName="arul-motors-backup.db" icon={DatabaseBackup}>
            Download backup
          </DownloadButton>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  if (!user) return null;
  const isAdmin = user.role === "admin";
  return (
    <>
      <PageHeader title="Settings" description="Your account, the team and the voice agent." />
      <Tabs defaultValue="account" className="gap-6">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          {isAdmin && <TabsTrigger value="team">Team</TabsTrigger>}
          <TabsTrigger value="agent">Voice agent</TabsTrigger>
          {isAdmin && <TabsTrigger value="data">Data &amp; backups</TabsTrigger>}
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Ask an admin to change your name or role.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <Avatar className="size-14">
                <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">{initials(user.full_name || user.username)}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="text-lg font-semibold">{user.full_name || user.username}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  @{user.username} <RoleBadge role={user.role} />
                </div>
              </div>
            </CardContent>
          </Card>
          <PasswordCard />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="team">
            <TeamCard me={user} />
          </TabsContent>
        )}
        <TabsContent value="agent">
          <VoiceAgentCard isAdmin={isAdmin} />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="data">
            <DataCard />
          </TabsContent>
        )}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Server className="size-4" /> System</CardTitle>
              <CardDescription>Where this CRM gets its data.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground">API</p>
                <a href={`${API_URL}/api/health`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs font-medium hover:underline">
                  {API_URL} <ExternalLink className="size-3" />
                </a>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground">Security</p>
                <p className="inline-flex items-center gap-1.5 font-medium"><ShieldCheck className="size-4 text-success" /> Staff sign-in · sessions expire after 12 hours</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
