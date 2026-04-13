import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Shield, Plus, Copy, Trash2, Check } from "lucide-react";
import { format } from "date-fns";

interface PanelLicense {
  id: string;
  license_key: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

const License = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newLicenseKey, setNewLicenseKey] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newIsActive, setNewIsActive] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch licenses
  const { data: licenses, isLoading } = useQuery({
    queryKey: ["panel-licenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("panel_licenses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PanelLicense[];
    },
  });

  // Add license mutation
  const addLicense = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: {
          action: 'add_license',
          license_key: newLicenseKey.trim(),
          description: newDescription.trim() || null,
          is_active: newIsActive,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["panel-licenses"] });
      toast({ title: "License Added", description: "New panel license has been added successfully." });
      setIsAddOpen(false);
      setNewLicenseKey("");
      setNewDescription("");
      setNewIsActive(true);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message.includes("duplicate") ? "This license key already exists." : error.message, variant: "destructive" });
    },
  });

  // Toggle license status mutation
  const toggleLicense = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'toggle_license', license_id: id, is_active },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["panel-licenses"] });
      toast({ title: "Status Updated", description: "License status has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete license mutation
  const deleteLicense = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'delete_license', license_id: id },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["panel-licenses"] });
      toast({ title: "License Deleted", description: "Panel license has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Mask license key for display
  const maskLicenseKey = (key: string) => {
    if (key.length <= 12) return key;
    return `${key.slice(0, 8)}...${key.slice(-4)}`;
  };

  // Copy license key to clipboard
  const copyToClipboard = async (id: string, key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({
        title: "Copied!",
        description: "License key copied to clipboard.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleAddLicense = () => {
    if (newLicenseKey.trim().length < 16) {
      toast({
        title: "Invalid License Key",
        description: "License key must be at least 16 characters.",
        variant: "destructive",
      });
      return;
    }
    addLicense.mutate();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Panel Licenses</h1>
              <p className="text-sm text-muted-foreground">
                Manage panel activation licenses. Each license works independently.
              </p>
            </div>
          </div>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 duration-short">
                <Plus className="h-4 w-4" />
                Add License
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-border/50 sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-foreground">Add New License</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Add a new panel activation license. This will not affect existing licenses.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="license-key" className="text-muted-foreground">License Key *</Label>
                  <Input
                    id="license-key"
                    placeholder="Enter license key (min 16 characters)"
                    value={newLicenseKey}
                    onChange={(e) => setNewLicenseKey(e.target.value)}
                    className="input-dark"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-muted-foreground">Description (optional)</Label>
                  <Input
                    id="description"
                    placeholder="e.g., Client name, purpose"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    maxLength={100}
                    className="input-dark"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="is-active" className="text-muted-foreground">Start as Active</Label>
                  <Switch
                    id="is-active"
                    checked={newIsActive}
                    onCheckedChange={setNewIsActive}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)} className="duration-short">
                  Cancel
                </Button>
                <Button
                  onClick={handleAddLicense}
                  disabled={addLicense.isPending}
                  className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 duration-short"
                >
                  {addLicense.isPending ? "Adding..." : "Add License"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Licenses Table */}
        <div className="glass-card rounded-xl overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : licenses && licenses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border/30 bg-secondary/30">
                  <TableHead className="text-muted-foreground">License Key</TableHead>
                  <TableHead className="text-muted-foreground">Description</TableHead>
                  <TableHead className="text-muted-foreground">Created</TableHead>
                  <TableHead className="text-center text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {licenses.map((license) => (
                  <TableRow key={license.id} className="border-border/30 table-row-hover">
                    <TableCell className="font-mono text-sm text-foreground">
                      <div className="flex items-center gap-2">
                        <span>{maskLicenseKey(license.license_key)}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 duration-short"
                          onClick={() => copyToClipboard(license.id, license.license_key)}
                        >
                          {copiedId === license.id ? (
                            <Check className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {license.description || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(license.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={license.is_active}
                          onCheckedChange={(checked) =>
                            toggleLicense.mutate({ id: license.id, is_active: checked })
                          }
                          disabled={toggleLicense.isPending}
                        />
                        <span className={license.is_active ? "pill pill-success" : "pill pill-muted"}>
                          {license.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive duration-short">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="glass-card border-border/50">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-foreground">Delete License?</AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
                              This will permanently remove this license key. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="duration-short">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 duration-short"
                              onClick={() => deleteLicense.mutate(license.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mb-4 opacity-50" />
              <p>No licenses found</p>
              <p className="text-sm">Add your first panel license to get started.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default License;
