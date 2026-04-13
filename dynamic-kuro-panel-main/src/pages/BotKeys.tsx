import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StarryBackground } from "@/components/StarryBackground";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Copy, Search, RefreshCw, User, CreditCard, Clock, CheckCircle, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
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

interface BotKey {
  id: string;
  key_code: string;
  telegram_id: number | null;
  telegram_username: string | null;
  transaction_id: string | null;
  duration_hours: number;
  status: string;
  created_at: string;
  bot_name: string;
  bot_id: string;
}

interface TelegramBot {
  id: string;
  name: string;
}

const BotKeys = () => {
  const { profile } = useAuth();
  const [keys, setKeys] = useState<BotKey[]>([]);
  const [bots, setBots] = useState<TelegramBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBot, setSelectedBot] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchBots = async () => {
    // Use safe view to avoid direct bot_token access
    const { data, error } = await supabase
      .from("telegram_bots_safe")
      .select("id, name")
      .order("name");

    if (!error && data) {
      setBots(data.map(b => ({ id: b.id!, name: b.name! })));
    }
  };

  const fetchKeys = async () => {
    setLoading(true);
    let query = supabase
      .from("license_keys_safe")
      .select(`
        id,
        key_code,
        telegram_id,
        telegram_username,
        transaction_id,
        duration_hours,
        status,
        created_at,
        bot_id,
        telegram_bots!inner(name)
      `)
      .not("bot_id", "is", null)
      .order("created_at", { ascending: false });

    if (selectedBot !== "all") {
      query = query.eq("bot_id", selectedBot);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching bot keys:", error);
      toast.error("Failed to fetch bot keys");
    } else if (data) {
      const formattedKeys: BotKey[] = data.map((key: any) => ({
        id: key.id,
        key_code: key.key_code,
        telegram_id: key.telegram_id,
        telegram_username: key.telegram_username,
        transaction_id: key.transaction_id,
        duration_hours: key.duration_hours,
        status: key.status,
        created_at: key.created_at,
        bot_name: key.telegram_bots?.name || "Unknown",
        bot_id: key.bot_id,
      }));
      setKeys(formattedKeys);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBots();
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [selectedBot]);

  const filteredKeys = keys.filter((key) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      key.telegram_username?.toLowerCase().includes(query) ||
      key.telegram_id?.toString().includes(query) ||
      key.transaction_id?.toLowerCase().includes(query) ||
      key.key_code.toLowerCase().includes(query)
    );
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const formatDuration = (hours: number) => {
    if (hours < 24) return `${hours}h`;
    if (hours < 168) return `${Math.floor(hours / 24)}d`;
    if (hours < 720) return `${Math.floor(hours / 168)}w`;
    return `${Math.floor(hours / 720)}mo`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "expired":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "paused":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "revoked":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Key Code",
      "Bot Name",
      "Telegram Username",
      "Chat ID",
      "Transaction ID",
      "Duration",
      "Status",
      "Created At",
    ];

    const csvData = filteredKeys.map((key) => [
      key.key_code,
      key.bot_name,
      key.telegram_username || "-",
      key.telegram_id?.toString() || "-",
      key.transaction_id || "-",
      formatDuration(key.duration_hours),
      key.status,
      format(new Date(key.created_at), "dd MMM yyyy HH:mm"),
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bot-keys-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("CSV exported successfully!");
  };

  const handleDeleteKey = async () => {
    if (!deleteKeyId) return;
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke('admin-actions', {
      body: { action: 'delete_key', key_id: deleteKeyId },
    });
    if (error || data?.error) {
      console.error("Error deleting key:", error);
      toast.error("Failed to delete key");
    } else {
      toast.success("Key deleted successfully!");
      setKeys(keys.filter((k) => k.id !== deleteKeyId));
    }
    setDeleting(false);
    setDeleteKeyId(null);
  };

  return (
    <DashboardLayout>
      <StarryBackground />
      <div className="space-y-6 relative z-10">
        {/* Welcome Banner */}
        <div className="glass-card rounded-xl p-6 border border-primary/20">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/20">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                👋 Welcome back,{" "}
                <span className="text-primary">{profile?.username || "Owner"}</span>!
              </h1>
              <p className="text-muted-foreground">
                View all keys generated by Telegram bots
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select value={selectedBot} onValueChange={setSelectedBot}>
            <SelectTrigger className="glass-card border-primary/20">
              <SelectValue placeholder="Filter by Bot" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bots</SelectItem>
              {bots.map((bot) => (
                <SelectItem key={bot.id} value={bot.id}>
                  {bot.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by username, chat ID, transaction ID, or key..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 glass-card border-primary/20"
            />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Bot Keys</p>
                <p className="text-xl font-bold text-primary">{keys.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-green-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Keys</p>
                <p className="text-xl font-bold text-green-400">
                  {keys.filter((k) => k.status === "active").length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-cyan-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <User className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Unique Buyers</p>
                <p className="text-xl font-bold text-cyan-400">
                  {new Set(keys.map((k) => k.telegram_id)).size}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-orange-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <CreditCard className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Transactions</p>
                <p className="text-xl font-bold text-orange-400">
                  {keys.filter((k) => k.transaction_id).length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Keys Table */}
        <Card className="glass-card border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Bot Generated Keys
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={exportToCSV}
                disabled={filteredKeys.length === 0}
                className="text-green-400 hover:bg-green-500/10"
              >
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchKeys}
                disabled={loading}
                className="text-primary hover:bg-primary/10"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30 hover:bg-transparent">
                    <TableHead className="text-primary">Key Code</TableHead>
                    <TableHead className="text-primary">Bot</TableHead>
                    <TableHead className="text-primary">Username</TableHead>
                    <TableHead className="text-primary">Chat ID</TableHead>
                    <TableHead className="text-primary">Transaction ID</TableHead>
                    <TableHead className="text-primary">Duration</TableHead>
                    <TableHead className="text-primary">Status</TableHead>
                    <TableHead className="text-primary">Created</TableHead>
                    <TableHead className="text-primary">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                        Loading bot keys...
                      </TableCell>
                    </TableRow>
                  ) : filteredKeys.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No bot-generated keys found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredKeys.map((key) => (
                      <TableRow
                        key={key.id}
                        className="border-border/30 hover:bg-primary/5 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-primary/10 px-2 py-1 rounded font-mono text-primary">
                              {key.key_code.substring(0, 9)}...
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(key.key_code)}
                            >
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                            {key.bot_name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {key.telegram_username ? (
                            <span className="text-foreground">@{key.telegram_username.replace("@", "")}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {key.telegram_id ? (
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-secondary/50 px-2 py-1 rounded">
                                {key.telegram_id}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(key.telegram_id!.toString())}
                              >
                                <Copy className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {key.transaction_id ? (
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-orange-500/10 text-orange-400 px-2 py-1 rounded">
                                {key.transaction_id.length > 12
                                  ? `${key.transaction_id.substring(0, 12)}...`
                                  : key.transaction_id}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(key.transaction_id!)}
                              >
                                <Copy className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDuration(key.duration_hours)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusColor(key.status)}>
                            {key.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {format(new Date(key.created_at), "dd MMM yyyy, HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                            onClick={() => setDeleteKeyId(key.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteKeyId} onOpenChange={(open) => !open && setDeleteKeyId(null)}>
        <AlertDialogContent className="glass-card border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">Delete Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this key? This action cannot be undone.
              The key will be permanently removed from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteKey}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default BotKeys;
