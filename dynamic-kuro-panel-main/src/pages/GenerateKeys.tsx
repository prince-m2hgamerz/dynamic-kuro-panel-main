import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Key, Copy, Download, Loader2, Gamepad2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Game {
  id: string;
  name: string;
  icon_url: string | null;
}

interface PriceSetting {
  duration_hours: number;
  price: number;
}

const GenerateKeys = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [duration, setDuration] = useState<string>("24");
  const [maxDevices, setMaxDevices] = useState<string>("1");
  const [customDeviceCount, setCustomDeviceCount] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [prices, setPrices] = useState<PriceSetting[]>([]);
  const [generatedKeys, setGeneratedKeys] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingPrices, setLoadingPrices] = useState(false);
  
  // New state for custom key and single device mode
  const [useCustomKey, setUseCustomKey] = useState(false);
  const [customKeyCode, setCustomKeyCode] = useState("");
  const [singleDeviceMode, setSingleDeviceMode] = useState(false);
  
  const { user, profile, role, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchGames();
  }, []);

  useEffect(() => {
    if (selectedGame) {
      fetchPrices(selectedGame);
    }
  }, [selectedGame]);

  // When single device mode is toggled, update max devices
  useEffect(() => {
    if (singleDeviceMode) {
      setMaxDevices("1");
    }
  }, [singleDeviceMode]);

  const fetchGames = async () => {
    const { data } = await supabase
      .from("games")
      .select("id, name, icon_url")
      .eq("status", "active");
    
    if (data && data.length > 0) {
      setGames(data);
      
      // Auto-select PUBG if available (legacy client compatibility)
      const pubgGame = data.find(g => g.name.toUpperCase() === "PUBG");
      if (pubgGame) {
        setSelectedGame(pubgGame.id);
      } else {
        // Fallback to first game if PUBG not found
        setSelectedGame(data[0].id);
      }
    } else {
      setGames([]);
    }
  };

  const fetchPrices = async (gameId: string) => {
    setLoadingPrices(true);
    const { data, error } = await supabase.rpc('get_game_prices', { p_game_id: gameId });
    const pricesArray = (data as any[]) || [];
    setPrices(pricesArray);
    // Auto-select first available duration
    if (pricesArray.length > 0) {
      setDuration(pricesArray[0].duration_hours.toString());
    }
    setLoadingPrices(false);
  };

  const formatDuration = (hours: number) => {
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''}`;
    const days = hours / 24;
    if (days < 30) return `${days} day${days > 1 ? 's' : ''}`;
    const months = Math.round(days / 30);
    if (months < 12) return `${months} month${months > 1 ? 's' : ''}`;
    const years = Math.round(days / 365);
    return `${years} year${years > 1 ? 's' : ''}`;
  };

  const generateKeyCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const segments = 4;
    const segmentLength = 4;
    const keyParts = [];
    
    for (let i = 0; i < segments; i++) {
      let segment = "";
      for (let j = 0; j < segmentLength; j++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      keyParts.push(segment);
    }
    
    return keyParts.join("-");
  };

  const validateCustomKey = (key: string): boolean => {
    // Allow any key format with minimum 3 characters
    // Only alphanumeric characters, underscores, and hyphens allowed
    const trimmed = key.trim();
    if (trimmed.length < 3) return false;
    const pattern = /^[A-Za-z0-9_-]+$/;
    return pattern.test(trimmed);
  };

  const calculatePrice = () => {
    const priceSetting = prices.find((p) => p.duration_hours === parseInt(duration));
    const pricePerKey = priceSetting?.price || 0;
    return pricePerKey * parseInt(quantity);
  };

  const handleGenerate = async () => {
    if (!selectedGame || !user) {
      toast({
        title: "Error",
        description: "Please select a game",
        variant: "destructive",
      });
      return;
    }

    // Validate custom key if using custom mode
    if (useCustomKey) {
      if (!validateCustomKey(customKeyCode)) {
        toast({
          title: "Invalid Key Format",
          description: "Key must be at least 3 characters (letters, numbers, - and _ allowed)",
          variant: "destructive",
        });
        return;
      }

      // Check if custom key already exists and is not expired
      const { data: existingKey } = await supabase
        .from("license_keys_safe")
        .select("id, status, expires_at")
        .eq("key_code", customKeyCode.toUpperCase())
        .maybeSingle();

      if (existingKey) {
        // Allow if the existing key is expired or revoked
        const isExpired = existingKey.expires_at && new Date(existingKey.expires_at) < new Date();
        const isRevoked = existingKey.status === 'revoked' || existingKey.status === 'expired';
        
        if (!isExpired && !isRevoked) {
          toast({
            title: "Key Already Exists",
            description: "This key code is already in use and not expired. Please wait for it to expire or use a different key.",
            variant: "destructive",
          });
          return;
        }
      }
    }

    const totalPrice = calculatePrice();
    if (profile && profile.balance < totalPrice && role !== "owner" && role !== "co_owner") {
      toast({
        title: "Insufficient Balance",
        description: `You need ₹${totalPrice.toFixed(2)} to generate these keys`,
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    const newKeys: string[] = [];

    try {
      const keysToGenerate = useCustomKey ? 1 : parseInt(quantity);
      
      for (let i = 0; i < keysToGenerate; i++) {
        const keyCode = useCustomKey ? customKeyCode.toUpperCase() : generateKeyCode();
        newKeys.push(keyCode);
      }

      // Server-side key generation with server-validated pricing
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: {
          action: 'generate_keys',
          game_id: selectedGame,
          duration_hours: parseInt(duration),
          keys: newKeys,
          max_devices: singleDeviceMode ? 1 : (maxDevices === "custom" ? parseInt(customDeviceCount) : parseInt(maxDevices)),
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Failed to generate keys");
      }

      setGeneratedKeys(newKeys);
      setCustomKeyCode("");
      // Refresh profile to get updated balance
      await refreshProfile();
      toast({
        title: "Keys Generated!",
        description: `Successfully generated ${newKeys.length} keys`,
      });
    } catch (error: any) {
      console.error("Key generation error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to generate keys",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyAllKeys = () => {
    navigator.clipboard.writeText(generatedKeys.join("\n"));
    toast({ title: "Copied!", description: "All keys copied to clipboard" });
  };

  const downloadKeys = () => {
    const content = generatedKeys.join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keys-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Key className="h-8 w-8 text-primary" />
            Generate Keys
          </h1>
          <p className="text-muted-foreground">Create new license keys</p>
        </div>

        <div className="glass-card-glow p-6 rounded-xl space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Game</Label>
              <Select value={selectedGame} onValueChange={setSelectedGame}>
                <SelectTrigger className="input-dark">
                  <SelectValue placeholder="Select a game">
                    {selectedGame && (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={games.find(g => g.id === selectedGame)?.icon_url || undefined} />
                          <AvatarFallback className="bg-primary/10">
                            <Gamepad2 className="h-3 w-3 text-primary" />
                          </AvatarFallback>
                        </Avatar>
                        <span>{games.find(g => g.id === selectedGame)?.name}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="glass-card border-border/50">
                  {games.map((game) => (
                    <SelectItem key={game.id} value={game.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={game.icon_url || undefined} />
                          <AvatarFallback className="bg-primary/10">
                            <Gamepad2 className="h-3 w-3 text-primary" />
                          </AvatarFallback>
                        </Avatar>
                        <span>{game.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Key Toggle */}
            <div className="flex flex-col gap-3 p-4 glass-card rounded-lg sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <Label className="text-foreground">Use Custom Key</Label>
                <p className="text-xs text-muted-foreground">
                  Enter your own key code instead of random
                </p>
              </div>
              <Switch
                checked={useCustomKey}
                onCheckedChange={(checked) => {
                  setUseCustomKey(checked);
                  if (checked) {
                    setQuantity("1");
                  }
                }}
              />
            </div>

            {/* Custom Key Input */}
            {useCustomKey && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Custom Key Code</Label>
                <Input
                  placeholder="Enter any key name (e.g. DYNAMIC-1HR-KEY)"
                  value={customKeyCode}
                  onChange={(e) => setCustomKeyCode(e.target.value.toUpperCase())}
                  className="input-dark font-mono tracking-wider"
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground">
                  Min 3 characters. Letters, numbers, - and _ allowed. Same key can't be created until expired.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Duration</Label>
                <Select 
                  value={duration} 
                  onValueChange={setDuration}
                  disabled={loadingPrices || prices.length === 0}
                >
                  <SelectTrigger className="input-dark">
                    <SelectValue placeholder={loadingPrices ? "Loading..." : "Select duration"} />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-border/50">
                    {prices.map((p) => (
                      <SelectItem key={p.duration_hours} value={p.duration_hours.toString()}>
                        {formatDuration(p.duration_hours)} - ₹{p.price.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedGame && prices.length === 0 && !loadingPrices && (
                  <p className="text-xs text-destructive">No prices configured for this game</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Max Devices</Label>
                <Select 
                  value={maxDevices} 
                  onValueChange={(val) => {
                    setMaxDevices(val);
                    if (val !== "custom") {
                      setCustomDeviceCount("");
                    }
                  }}
                  disabled={singleDeviceMode}
                >
                  <SelectTrigger className="input-dark">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-border/50">
                    <SelectItem value="1">1 device</SelectItem>
                    <SelectItem value="2">2 devices</SelectItem>
                    <SelectItem value="3">3 devices</SelectItem>
                    <SelectItem value="5">5 devices</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                {maxDevices === "custom" && !singleDeviceMode && (
                  <Input
                    type="number"
                    min="1"
                    max="1000"
                    placeholder="Enter device count"
                    value={customDeviceCount}
                    onChange={(e) => setCustomDeviceCount(e.target.value)}
                    className="input-dark mt-2"
                  />
                )}
              </div>
            </div>

            {/* Single Device Mode Toggle */}
            <div className="flex flex-col gap-3 p-4 glass-card rounded-lg sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <Label className="text-foreground">Single Device Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Restrict key to only 1 device login
                </p>
              </div>
              <Switch
                checked={singleDeviceMode}
                onCheckedChange={setSingleDeviceMode}
              />
            </div>

            {/* Quantity - disabled when using custom key */}
            {!useCustomKey && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="input-dark"
                />
              </div>
            )}

            <div className="p-4 glass-card rounded-lg">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-muted-foreground">Total Price:</span>
                <span className="text-2xl font-bold gradient-text stats-value">
                  ₹{calculatePrice().toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Your balance: {(role === "owner" || role === "co_owner") 
                  ? <span className="text-success font-bold">∞ UNLIMITED</span> 
                  : `₹${profile?.balance?.toFixed(2) || "0.00"}`}
              </p>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedGame || (useCustomKey && !customKeyCode) || (maxDevices === "custom" && !singleDeviceMode && (!customDeviceCount || parseInt(customDeviceCount) < 1))}
              className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold glow-primary duration-short"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  Generate {useCustomKey ? "Custom Key" : "Keys"}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Generated Keys */}
        {generatedKeys.length > 0 && (
          <div className="glass-card p-6 rounded-xl space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold text-foreground">Generated Keys</h2>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Button variant="outline" size="sm" onClick={copyAllKeys} className="w-full duration-short text-xs sm:w-auto">
                  <Copy className="mr-1 h-3 w-3" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={downloadKeys} className="w-full duration-short text-xs sm:w-auto">
                  <Download className="mr-1 h-3 w-3" />
                  Download
                </Button>
              </div>
            </div>
            <div className="glass-card rounded-lg p-4 max-h-64 overflow-auto">
              {generatedKeys.map((key, index) => (
                <div
                  key={index}
                  className="break-all font-mono text-sm py-1 border-b border-border/30 last:border-0 text-primary"
                >
                  {key}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default GenerateKeys;
