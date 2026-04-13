import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package, Plus, Trash2 } from "lucide-react";

interface ApprovedPackage {
  id: string;
  package_name: string;
  is_active: boolean;
  created_at: string;
}

const PACKAGE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/;

const ApprovedPackages = () => {
  const [packages, setPackages] = useState<ApprovedPackage[]>([]);
  const [packageName, setPackageName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApprovedPackage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const normalizedPackageName = useMemo(
    () => packageName.trim().toLowerCase(),
    [packageName]
  );

  const fetchPackages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("approved_packages")
      .select("id, package_name, is_active, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load approved packages",
        variant: "destructive",
      });
    } else {
      setPackages((data as ApprovedPackage[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleCreatePackage = async () => {
    if (!normalizedPackageName || !PACKAGE_NAME_PATTERN.test(normalizedPackageName)) {
      toast({
        title: "Invalid package name",
        description: "Use a valid Java package like com.example.app",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("admin-actions", {
      body: {
        action: "create_package",
        package_name: normalizedPackageName,
      },
    });

    if (error || data?.error) {
      toast({
        title: "Error",
        description: data?.error || error?.message || "Failed to create package",
        variant: "destructive",
      });
    } else {
      setPackageName("");
      toast({
        title: "Package added",
        description: `${normalizedPackageName} is now available for SDK validation`,
      });
      await fetchPackages();
    }
    setSubmitting(false);
  };

  const handleTogglePackage = async (pkg: ApprovedPackage, isActive: boolean) => {
    setTogglingId(pkg.id);
    const { data, error } = await supabase.functions.invoke("admin-actions", {
      body: {
        action: "toggle_package_status",
        package_id: pkg.id,
        is_active: isActive,
      },
    });

    if (error || data?.error) {
      toast({
        title: "Error",
        description: data?.error || error?.message || "Failed to update package",
        variant: "destructive",
      });
    } else {
      setPackages((current) =>
        current.map((item) =>
          item.id === pkg.id ? { ...item, is_active: isActive } : item
        )
      );
    }
    setTogglingId(null);
  };

  const handleDeletePackage = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    const { data, error } = await supabase.functions.invoke("admin-actions", {
      body: {
        action: "delete_package",
        package_id: deleteTarget.id,
      },
    });

    if (error || data?.error) {
      toast({
        title: "Error",
        description: data?.error || error?.message || "Failed to delete package",
        variant: "destructive",
      });
    } else {
      setPackages((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast({
        title: "Package removed",
        description: "The package will no longer pass SDK validation",
      });
    }
    setDeleting(false);
  };

  const activeCount = packages.filter((pkg) => pkg.is_active).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="glass-card-glow rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/15 p-3">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Approved Packages</h1>
              <p className="text-sm text-muted-foreground">
                Manage the Java package names that can pass SDK-panel validation.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="glass-card rounded-xl p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="package-name" className="text-muted-foreground">
                Java Package Name
              </Label>
              <Input
                id="package-name"
                value={packageName}
                onChange={(event) => setPackageName(event.target.value)}
                placeholder="com.example.app"
                className="input-dark"
              />
              <p className="text-xs text-muted-foreground">
                SDK keys only pass package validation when the incoming package exists here and is active.
              </p>
            </div>

            <Button
              onClick={handleCreatePackage}
              disabled={submitting || !normalizedPackageName}
              className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding Package
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Approved Package
                </>
              )}
            </Button>
          </div>

          <div className="glass-card rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border/40 bg-card/40 px-4 py-3">
              <span className="text-sm text-muted-foreground">Total packages</span>
              <span className="text-2xl font-bold text-foreground">{packages.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/40 bg-card/40 px-4 py-3">
              <span className="text-sm text-muted-foreground">Active packages</span>
              <span className="text-2xl font-bold text-primary">{activeCount}</span>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-4 text-sm text-muted-foreground">
              SDK URL:
              <div className="mt-2 break-all rounded-lg bg-background/60 p-3 font-mono text-xs text-foreground">
                https://etzchciutckbwreroahg.supabase.co/functions/v1/sarkar-api/sdk/panel/connect
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : packages.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No package names added yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30 hover:bg-transparent">
                    <TableHead>Package</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Allow SDK Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map((pkg) => (
                    <TableRow key={pkg.id} className="border-border/30">
                      <TableCell className="font-mono text-sm text-foreground">
                        {pkg.package_name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            pkg.is_active
                              ? "border-green-500/30 bg-green-500/10 text-green-400"
                              : "border-muted bg-muted/10 text-muted-foreground"
                          }
                        >
                          {pkg.is_active ? "Active" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={pkg.is_active}
                            disabled={togglingId === pkg.id}
                            onCheckedChange={(checked) =>
                              handleTogglePackage(pkg, checked)
                            }
                          />
                          {togglingId === pkg.id && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(pkg)}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open && !deleting) {
              setDeleteTarget(null);
            }
          }}
        >
          <AlertDialogContent className="glass-card border-destructive/30">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Package</AlertDialogTitle>
              <AlertDialogDescription>
                Remove <span className="font-mono text-foreground">{deleteTarget?.package_name}</span> from the approved SDK package list.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeletePackage}
                disabled={deleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {deleting ? "Deleting..." : "Delete Package"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default ApprovedPackages;
