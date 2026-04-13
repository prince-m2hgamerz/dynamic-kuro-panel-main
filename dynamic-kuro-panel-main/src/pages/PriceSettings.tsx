import { useState, useEffect } from "react";
import { Save, Plus, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TelegramBot {
  id: string;
  name: string;
}

interface Game {
  id: string;
  name: string;
}

interface PriceSetting {
  id: string;
  bot_id: string | null;
  game_id: string;
  duration_hours: number;
  price: number;
}

const DURATION_OPTIONS = [
  { value: "1", label: "1 hour", hours: 1 },
  { value: "24", label: "1 day", hours: 24 },
  { value: "168", label: "7 days", hours: 168 },
  { value: "720", label: "30 days", hours: 720 },
  { value: "8760", label: "365 days", hours: 8760 },
];

const PriceSettings = () => {
  const [bots, setBots] = useState<TelegramBot[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [prices, setPrices] = useState<PriceSetting[]>([]);
  const [selectedBot, setSelectedBot] = useState<string>("");
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [newDuration, setNewDuration] = useState<string>("");
  const [newPrice, setNewPrice] = useState<string>("0");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Filter to only show prices for selected bot AND game
  const filteredPrices = selectedBot && selectedGame
    ? prices.filter((p) => p.bot_id === selectedBot && p.game_id === selectedGame)
    : [];

  const availableDurations = DURATION_OPTIONS.filter(
    (d) => !filteredPrices.some((p) => p.duration_hours === d.hours)
  );

  useEffect(() => {
    fetchBots();
    fetchGames();
    fetchPrices();
  }, []);

  useEffect(() => {
    if (availableDurations.length > 0) {
      setNewDuration(availableDurations[0].value);
    } else {
      setNewDuration("");
    }
  }, [selectedBot, selectedGame, prices]);

  const fetchBots = async () => {
    // Bots are fetched via telegram_bots_safe view (no token exposed)
    const { data } = await supabase
      .from("telegram_bots_safe")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    setBots((data || []).map(b => ({ id: b.id!, name: b.name! })));
    if (data && data.length > 0 && data[0].id) {
      setSelectedBot(data[0].id);
    }
  };

  const fetchGames = async () => {
    const { data } = await supabase.from("games").select("id, name");
    setGames(data || []);
    if (data && data.length > 0) {
      setSelectedGame(data[0].id);
    }
  };

  const fetchPrices = async () => {
    // Fetch via server-side admin-actions
    const { data, error } = await supabase.functions.invoke('admin-actions', {
      body: { action: 'get_prices' },
    });
    if (error || data?.error) {
      console.error("Failed to fetch prices:", data?.error || error);
      setPrices([]);
    } else {
      setPrices(data?.prices || []);
    }
    setLoading(false);
  };

  const addPrice = async () => {
    if (!selectedBot || !selectedGame || !newDuration) {
      toast({ title: "Error", description: "Please select a bot, game, and duration", variant: "destructive" });
      return;
    }

    const durationHours = parseInt(newDuration);
    const exists = prices.some(
      (p) => p.bot_id === selectedBot && p.game_id === selectedGame && p.duration_hours === durationHours
    );
    if (exists) {
      toast({ title: "Duplicate Entry", description: "This duration already has a price configured.", variant: "destructive" });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: {
          action: 'add_price',
          bot_id: selectedBot,
          game_id: selectedGame,
          duration_hours: durationHours,
          price: parseFloat(newPrice),
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: "Success", description: "Price added successfully" });
      fetchPrices();
      setNewPrice("0");
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add price", variant: "destructive" });
    }
  };

  const updatePrice = async (id: string, price: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'update_price', price_id: id, price },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: "Success", description: "Price updated" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update price", variant: "destructive" });
    }
  };

  const deletePrice = async (id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'delete_price', price_id: id },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: "Success", description: "Price deleted" });
      fetchPrices();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete price", variant: "destructive" });
    }
  };

  const formatDuration = (hours: number) => {
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""}`;
    const days = hours / 24;
    if (days < 7) return `${days} day${days > 1 ? "s" : ""}`;
    if (days < 30) return `${Math.floor(days / 7)} week${days >= 14 ? "s" : ""}`;
    if (days < 365) return `${Math.floor(days / 30)} month${days >= 60 ? "s" : ""}`;
    return `${Math.floor(days / 365)} year${days >= 730 ? "s" : ""}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Price Settings</h1>
          <p className="text-muted-foreground">
            Configure key prices for each game and duration
          </p>
        </div>

        <GlassCard className="p-6">
          {/* Bot & Game Selectors */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="space-y-2">
              <Label>Select Bot</Label>
              <Select value={selectedBot} onValueChange={setSelectedBot}>
                <SelectTrigger className="w-48 bg-secondary/50">
                  <SelectValue placeholder="Select a bot" />
                </SelectTrigger>
                <SelectContent>
                  {bots.map((bot) => (
                    <SelectItem key={bot.id} value={bot.id}>
                      {bot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Select Game</Label>
              <Select value={selectedGame} onValueChange={setSelectedGame}>
                <SelectTrigger className="w-48 bg-secondary/50">
                  <SelectValue placeholder="Select a game" />
                </SelectTrigger>
                <SelectContent>
                  {games.map((game) => (
                    <SelectItem key={game.id} value={game.id}>
                      {game.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Add New Price */}
          <div className="flex gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
            <div className="space-y-2">
              <Label>Duration</Label>
              {availableDurations.length === 0 ? (
                <div className="w-40 h-10 flex items-center px-3 bg-secondary/50 rounded-md border border-border/50 text-sm text-muted-foreground">
                  All configured
                </div>
              ) : (
                <Select value={newDuration} onValueChange={setNewDuration}>
                  <SelectTrigger className="w-40 bg-secondary/50">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDurations.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="w-32 bg-secondary/50"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={addPrice} 
                disabled={availableDurations.length === 0 || !newDuration}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Price
              </Button>
            </div>
          </div>

          {availableDurations.length === 0 && selectedGame && (
            <p className="text-sm text-muted-foreground mb-4">
              ✓ All durations are configured for this game. Edit prices in the table below.
            </p>
          )}

          {/* Prices Table */}
          <div className="rounded-lg border border-border/50 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Duration</TableHead>
                  <TableHead>Price ($)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredPrices.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No prices configured for this game
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPrices.map((price) => (
                    <TableRow key={price.id}>
                      <TableCell>{formatDuration(price.duration_hours)}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          defaultValue={price.price}
                          onBlur={(e) =>
                            updatePrice(price.id, parseFloat(e.target.value))
                          }
                          className="w-24 bg-secondary/50"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => deletePrice(price.id)}
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
        </GlassCard>
      </div>
    </DashboardLayout>
  );
};

export default PriceSettings;
