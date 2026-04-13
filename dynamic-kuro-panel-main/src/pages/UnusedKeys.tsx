import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Key, Copy, Eye, EyeOff, MoreHorizontal, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PurpleCard } from "@/components/dashboard/PurpleCard";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface UnusedKey {
  id: string;
  key_code: string;
  game_id: string;
  duration_hours: number;
  created_at: string;
  game_name?: string;
}

const UnusedKeys = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [keys, setKeys] = useState<UnusedKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKeys, setShowKeys] = useState(false);

  const fetchUnusedKeys = async () => {
    setLoading(true);
    const { data: keysData, error } = await supabase
      .from("license_keys_safe")
      .select("id, key_code, game_id, duration_hours, created_at")
      .is("activated_at", null)
      .eq("status", "active");

    if (error) {
      toast({ title: "Error fetching keys", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Fetch game names
    const gameIds = [...new Set(keysData?.map((k) => k.game_id) || [])];
    const { data: gamesData } = await supabase
      .from("games")
      .select("id, name")
      .in("id", gameIds);

    const gamesMap = new Map(gamesData?.map((g) => [g.id, g.name]) || []);

    setKeys(
      keysData?.map((k) => ({
        ...k,
        game_name: gamesMap.get(k.game_id) || "Unknown",
      })) || []
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchUnusedKeys();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard!" });
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return "****";
    return key.substring(0, 4) + "****" + key.substring(key.length - 4);
  };

  const handleDelete = async (keyId: string) => {
    const { data, error } = await supabase.functions.invoke('admin-actions', {
      body: { action: 'delete_key', key_id: keyId },
    });
    if (error || data?.error) {
      toast({ title: "Failed to delete key", variant: "destructive" });
    } else {
      toast({ title: "Key deleted successfully" });
      fetchUnusedKeys();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Key className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Unused Keys</h1>
              <p className="text-gray-400 text-sm">
                Keys that haven't been activated yet
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowKeys(!showKeys)}
            className="w-full border-purple-700/50 text-purple-300 sm:w-auto"
          >
            {showKeys ? (
              <EyeOff className="h-4 w-4 mr-2" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            {showKeys ? "Hide Keys" : "Show Keys"}
          </Button>
        </div>

        <PurpleCard title={`🔒 Unused Keys (${keys.length})`}>
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : keys.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No unused keys found
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {keys.map((key) => (
                  <div key={key.id} className="rounded-xl border border-border/30 bg-card/50 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => copyToClipboard(key.key_code)}
                        className="min-w-0 flex-1 truncate text-left font-mono text-xs text-primary"
                      >
                        {showKeys ? key.key_code : maskKey(key.key_code)}
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => copyToClipboard(key.key_code)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(key.id)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{key.game_name}</span>
                      <span className="pill pill-primary text-[10px]">{key.duration_hours}h</span>
                      <span>{format(new Date(key.created_at), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-purple-700/30">
                      <TableHead className="text-purple-300">Key Code</TableHead>
                      <TableHead className="text-purple-300">Game</TableHead>
                      <TableHead className="text-purple-300">Duration</TableHead>
                      <TableHead className="text-purple-300">Created</TableHead>
                      <TableHead className="text-purple-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keys.map((key) => (
                      <TableRow key={key.id} className="border-purple-700/30">
                        <TableCell className="font-mono text-white">
                          <div className="flex items-center gap-2">
                            <span>
                              {showKeys ? key.key_code : maskKey(key.key_code)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(key.key_code)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {key.game_name}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {key.duration_hours}h
                        </TableCell>
                        <TableCell className="text-gray-400">
                          {format(new Date(key.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleDelete(key.id)}
                                className="text-red-400"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </PurpleCard>
      </div>
    </DashboardLayout>
  );
};

export default UnusedKeys;
