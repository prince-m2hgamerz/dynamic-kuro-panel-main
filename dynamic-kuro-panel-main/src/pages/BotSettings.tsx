import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Bot, Plus, Trash2, Edit, Webhook, Eye, EyeOff, Loader2, AlertTriangle } from "lucide-react";

interface TelegramBot {
  id: string;
  name: string;
  display_name: string | null;
  admin_chat_id: number;
  upi_id: string;
  upi_name: string;
  contact_url: string | null;
  webhook_url: string | null;
  is_active: boolean;
  created_at: string;
}

const BotSettings = () => {
  const [bots, setBots] = useState<TelegramBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBot, setEditingBot] = useState<TelegramBot | null>(null);
  const [showToken, setShowToken] = useState<Record<string, boolean>>({});
  const [settingWebhook, setSettingWebhook] = useState<string | null>(null);
  const [deleteBot, setDeleteBot] = useState<TelegramBot | null>(null);
  const [deletingBot, setDeletingBot] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceDisableBots, setMaintenanceDisableBots] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    display_name: "",
    bot_token: "",
    admin_chat_id: "",
    upi_id: "",
    upi_name: "",
    contact_url: "",
  });

  const fetchBots = async () => {
    try {
      const { data, error } = await supabase
        .from("telegram_bots_safe" as any)
        .select("*")
        .order("created_at", { ascending: false });

      setBots((data as any) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMaintenanceSettings = async () => {
    try {
      const { data: settingsData } = await supabase.rpc('get_maintenance_settings');
      const settings = settingsData as any;

      const mode = settings?.maintenance_mode === true;
      const disableBots = settings?.maintenance_disable_bots === true;
      
      setMaintenanceMode(mode);
      setMaintenanceDisableBots(disableBots);
    } catch (error) {
      console.error("Error fetching maintenance settings:", error);
    }
  };

  useEffect(() => {
    fetchBots();
    fetchMaintenanceSettings();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      display_name: "",
      bot_token: "",
      admin_chat_id: "",
      upi_id: "",
      upi_name: "",
      contact_url: "",
    });
    setEditingBot(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: editingBot ? {
          action: 'update_bot',
          bot_id: editingBot.id,
          name: formData.name,
          display_name: formData.display_name || null,
          bot_token: formData.bot_token,
          admin_chat_id: formData.admin_chat_id,
          upi_id: formData.upi_id,
          upi_name: formData.upi_name,
          contact_url: formData.contact_url || null,
        } : {
          action: 'create_bot',
          name: formData.name,
          display_name: formData.display_name || null,
          bot_token: formData.bot_token,
          admin_chat_id: formData.admin_chat_id,
          upi_id: formData.upi_id,
          upi_name: formData.upi_name,
          contact_url: formData.contact_url || null,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: "Success", description: editingBot ? "Bot updated successfully" : "Bot added successfully" });
      setDialogOpen(false);
      resetForm();
      fetchBots();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (bot: TelegramBot) => {
    setEditingBot(bot);
    setFormData({
      name: bot.name,
      display_name: bot.display_name || "",
      bot_token: "",
      admin_chat_id: bot.admin_chat_id.toString(),
      upi_id: bot.upi_id,
      upi_name: bot.upi_name,
      contact_url: bot.contact_url || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteBot) return;
    setDeletingBot(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'delete_bot', bot_id: deleteBot.id },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: "Success", description: "Bot deleted successfully" });
      setDeleteBot(null);
      fetchBots();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDeletingBot(false);
    }
  };

  const handleSetWebhook = async (bot: TelegramBot) => {
    setSettingWebhook(bot.id);

    try {
      const { data, error } = await supabase.functions.invoke("set-telegram-webhook", {
        body: { bot_id: bot.id },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Webhook Set Successfully!",
          description: `Bot "${bot.name}" is now active`,
        });
        fetchBots();
      } else {
        throw new Error(data.error || "Failed to set webhook");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSettingWebhook(null);
    }
  };

  const maskToken = (token: string) => {
    if (token.length < 10) return "••••••••••";
    return token.substring(0, 6) + "••••••••••" + token.slice(-4);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Maintenance Warning Banner */}
        {maintenanceMode && maintenanceDisableBots && (
          <div className="bg-warning/20 border border-warning/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <div>
                <p className="font-medium text-warning">Maintenance Mode Active</p>
                <p className="text-sm text-warning/80">
                  All bots are currently disabled due to maintenance mode. 
                  Only Owner/Co-Owner can enable individual bots.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="h-8 w-8 text-purple-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Telegram Bot Settings</h1>
              <p className="text-gray-400">Manage your Telegram bots and payment configurations</p>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Add New Bot
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1a1a2e] border-purple-700/30">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingBot ? "Edit Bot" : "Add New Bot"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-300">Bot Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Main Sales Bot"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-[#16162a] border-purple-700/30 text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display_name" className="text-gray-300">Display Name</Label>
                  <Input
                    id="display_name"
                    placeholder="e.g., Lala Bhai PVT Key Selling Bot"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    className="bg-[#16162a] border-purple-700/30 text-white"
                  />
                  <p className="text-xs text-gray-500">Shown in /start, /buy and help responses</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bot_token" className="text-gray-300">Bot Token</Label>
                  <Input
                    id="bot_token"
                    type="password"
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                    value={formData.bot_token}
                    onChange={(e) => setFormData({ ...formData, bot_token: e.target.value })}
                    className="bg-[#16162a] border-purple-700/30 text-white"
                    required
                  />
                  <p className="text-xs text-gray-500">Get this from @BotFather on Telegram</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin_chat_id" className="text-gray-300">Admin Chat ID</Label>
                  <Input
                    id="admin_chat_id"
                    type="number"
                    placeholder="8027087942"
                    value={formData.admin_chat_id}
                    onChange={(e) => setFormData({ ...formData, admin_chat_id: e.target.value })}
                    className="bg-[#16162a] border-purple-700/30 text-white"
                    required
                  />
                  <p className="text-xs text-gray-500">Your Telegram Chat ID for notifications</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="upi_id" className="text-gray-300">UPI ID</Label>
                  <Input
                    id="upi_id"
                    placeholder="yourname@upi"
                    value={formData.upi_id}
                    onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                    className="bg-[#16162a] border-purple-700/30 text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="upi_name" className="text-gray-300">UPI Name</Label>
                  <Input
                    id="upi_name"
                    placeholder="Your Name"
                    value={formData.upi_name}
                    onChange={(e) => setFormData({ ...formData, upi_name: e.target.value })}
                    className="bg-[#16162a] border-purple-700/30 text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_url" className="text-gray-300">Contact URL (Optional)</Label>
                  <Input
                    id="contact_url"
                    placeholder="https://t.me/yourusername"
                    value={formData.contact_url}
                    onChange={(e) => setFormData({ ...formData, contact_url: e.target.value })}
                    className="bg-[#16162a] border-purple-700/30 text-white"
                  />
                  <p className="text-xs text-gray-500">Telegram profile/group link for Contact Us button</p>
                </div>

                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">
                  {editingBot ? "Update Bot" : "Add Bot"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Bots Table */}
        <div className="bg-[#1a1a2e] rounded-xl border border-purple-700/30 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            </div>
          ) : bots.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No bots configured yet</p>
              <p className="text-sm">Click "Add New Bot" to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-purple-700/30 hover:bg-transparent">
                  <TableHead className="text-purple-300">Bot Name</TableHead>
                  <TableHead className="text-purple-300">Token</TableHead>
                  <TableHead className="text-purple-300">Admin ID</TableHead>
                  <TableHead className="text-purple-300">UPI Details</TableHead>
                  <TableHead className="text-purple-300">Status</TableHead>
                  <TableHead className="text-purple-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bots.map((bot) => (
                  <TableRow key={bot.id} className="border-purple-700/30 hover:bg-purple-900/20">
                    <TableCell className="font-medium text-white">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-purple-400" />
                        <div>
                          <div>{bot.name}</div>
                          {bot.display_name && (
                            <div className="text-xs text-gray-500">{bot.display_name}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-400">
                      <code className="text-xs bg-[#16162a] px-2 py-1 rounded">
                        ••••••••••••
                      </code>
                      <span className="text-xs text-muted-foreground ml-2">(hidden for security)</span>
                    </TableCell>
                    <TableCell className="text-gray-400">{bot.admin_chat_id}</TableCell>
                    <TableCell className="text-gray-400">
                      <div className="text-sm">
                        <div>{bot.upi_id}</div>
                        <div className="text-xs text-gray-500">{bot.upi_name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {bot.is_active ? (
                        <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-600/20 text-gray-400 border-gray-600/30">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetWebhook(bot)}
                          disabled={settingWebhook === bot.id}
                          className="border-purple-700/30 text-purple-300 hover:bg-purple-900/30"
                        >
                          {settingWebhook === bot.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Webhook className="h-4 w-4" />
                          )}
                          <span className="ml-1 hidden sm:inline">Set Webhook</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(bot)}
                          className="border-purple-700/30 text-purple-300 hover:bg-purple-900/30"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteBot(bot)}
                          className="border-red-700/30 text-red-400 hover:bg-red-900/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Info Card */}
        <div className="bg-[#1a1a2e] rounded-xl border border-purple-700/30 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">How to Setup</h3>
          <ol className="space-y-3 text-gray-400 text-sm">
            <li className="flex items-start gap-2">
              <span className="bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0">1</span>
              <span>Create a bot on Telegram using <code className="text-purple-300">@BotFather</code></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0">2</span>
              <span>Copy the Bot Token and add it here</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0">3</span>
              <span>Get your Chat ID from <code className="text-purple-300">@userinfobot</code> on Telegram</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0">4</span>
              <span>Enter your UPI details for payment QR codes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0">5</span>
              <span>Click <strong className="text-purple-300">"Set Webhook"</strong> to activate the bot</span>
            </li>
          </ol>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteBot} onOpenChange={() => !deletingBot && setDeleteBot(null)}>
          <AlertDialogContent className="bg-[#1a1a2e] border-red-500/30">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-400">Delete Bot</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Are you sure you want to delete <strong className="text-white">{deleteBot?.name}</strong>?
                <br /><br />
                This will unlink the bot from all existing payment records and license keys.
                Historical data will be preserved but the bot reference will be removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingBot} className="border-purple-700/30">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                disabled={deletingBot}
                className="bg-red-500 hover:bg-red-600"
              >
                {deletingBot ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Bot"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default BotSettings;
