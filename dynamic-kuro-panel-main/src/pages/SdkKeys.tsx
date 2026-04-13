import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppWindow, Copy, Download, Gamepad2, KeyRound, Loader2, ShieldCheck } from "lucide-react";

interface Game {
  id: string;
  name: string;
  icon_url: string | null;
}

interface PriceSetting {
  duration_hours: number;
  price: number;
}

const generateKeyCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("")
  ).join("-");
};

const validateCustomKey = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length >= 3 && /^[A-Za-z0-9_-]+$/.test(trimmed);
};

const formatDuration = (hours: number) => {
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""}`;
  const days = hours / 24;
  if (days < 30) return `${days} day${days > 1 ? "s" : ""}`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""}`;
  const years = Math.round(days / 365);
  return `${years} year${years > 1 ? "s" : ""}`;
};

const SdkKeys = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [prices, setPrices] = useState<PriceSetting[]>([]);
  const [selectedGame, setSelectedGame] = useState("");
  const [duration, setDuration] = useState("24");
  const [maxDevices, setMaxDevices] = useState("1");
  const [customDeviceCount, setCustomDeviceCount] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [generatedKeys, setGeneratedKeys] = useState<string[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [useCustomKey, setUseCustomKey] = useState(false);
  const [customKeyCode, setCustomKeyCode] = useState("");
  const [singleDeviceMode, setSingleDeviceMode] = useState(false);
  const [packageRestricted, setPackageRestricted] = useState(true);
  const [approvedPackageCount, setApprovedPackageCount] = useState(0);
  const { user, profile, role, refreshProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchGames();
    fetchApprovedPackages();
  }, []);

  useEffect(() => {
    if (selectedGame) {
      fetchPrices(selectedGame);
    }
  }, [selectedGame]);

  useEffect(() => {
    if (singleDeviceMode) {
      setMaxDevices("1");
    }
  }, [singleDeviceMode]);

  const totalPrice = useMemo(() => {
    const pricePerKey = prices.find((item) => item.duration_hours === Number(duration))?.price || 0;
    return pricePerKey * Number(quantity || 0);
  }, [duration, prices, quantity]);

  const fetchGames = async () => {
    const { data } = await supabase
      .from("games")
      .select("id, name, icon_url")
      .eq("status", "active");

    if (data?.length) {
      setGames(data as Game[]);
      const pubgGame = data.find((game) => game.name.toUpperCase() === "PUBG");
      setSelectedGame(pubgGame?.id || data[0].id);
    }
  };

  const fetchPrices = async (gameId: string) => {
    setLoadingPrices(true);
    const { data } = await supabase.rpc("get_game_prices", { p_game_id: gameId });
    const priceRows = (data as PriceSetting[]) || [];
    setPrices(priceRows);
    if (priceRows.length > 0) {
      setDuration(String(priceRows[0].duration_hours));
    }
    setLoadingPrices(false);
  };

  const fetchApprovedPackages = async () => {
    const { count } = await supabase
      .from("approved_packages")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    setApprovedPackageCount(count || 0);
  };

  const handleGenerate = async () => {
    if (!selectedGame || !user) {
      toast({
        title: "Error",
        description: "Select a game before generating keys",
        variant: "destructive",
      });
      return;
    }

    if (useCustomKey && !validateCustomKey(customKeyCode)) {
      toast({
        title: "Invalid custom key",
        description: "Use at least 3 characters with letters, numbers, - or _",
        variant: "destructive",
      });
      return;
    }

    if (packageRestricted && approvedPackageCount === 0) {
      toast({
        title: "No approved packages",
        description: "Add at least one package name before generating restricted SDK keys",
        variant: "destructive",
      });
      return;
    }

    if (profile && profile.balance < totalPrice && role !== "owner" && role !== "co_owner") {
      toast({
        title: "Insufficient balance",
        description: `You need Rs ${totalPrice.toFixed(2)} to generate these keys`,
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const keysToGenerate = useCustomKey ? 1 : Number(quantity);
      const keys = Array.from({ length: keysToGenerate }, (_, index) =>
        useCustomKey && index === 0 ? customKeyCode.trim().toUpperCase() : generateKeyCode()
      );

      const { data, error } = await supabase.functions.invoke("admin-actions", {
        body: {
          action: "generate_keys",
          game_id: selectedGame,
          duration_hours: Number(duration),
          keys,
          max_devices: singleDeviceMode
            ? 1
            : maxDevices === "custom"
              ? Number(customDeviceCount)
              : Number(maxDevices),
          package_restricted: packageRestricted,
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Failed to generate SDK keys");
      }

      setGeneratedKeys(keys);
      setCustomKeyCode("");
      await refreshProfile();
      toast({
        title: "SDK keys generated",
        description: `${keys.length} key${keys.length > 1 ? "s" : ""} created successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to generate SDK keys",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyAllKeys = async () => {
    await navigator.clipboard.writeText(generatedKeys.join("\n"));
    toast({
      title: "Copied",
      description: "All generated SDK keys are in your clipboard",
    });
  };

  const downloadKeys = () => {
    const blob = new Blob([generatedKeys.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `sdk-keys-${Date.now()}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="glass-card-glow rounded-xl p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/15 p-3">
                <AppWindow className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">SDK Keys</h1>
                <p className="text-sm text-muted-foreground">
                  Generate Java SDK panel keys with optional approved-package validation.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-muted-foreground lg:max-w-lg">
              <div className="mb-1 flex items-center gap-2 text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                SDK connect endpoint
              </div>
              <div className="break-all font-mono text-xs">
                https://etzchciutckbwreroahg.supabase.co/functions/v1/sarkar-api/sdk/panel/connect
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="glass-card rounded-xl p-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Game</Label>
              <Select value={selectedGame} onValueChange={setSelectedGame}>
                <SelectTrigger className="input-dark">
                  <SelectValue placeholder="Select a game">
                    {selectedGame && (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage
                            src={games.find((game) => game.id === selectedGame)?.icon_url || undefined}
                          />
                          <AvatarFallback className="bg-primary/10">
                            <Gamepad2 className="h-3 w-3 text-primary" />
                          </AvatarFallback>
                        </Avatar>
                        <span>{games.find((game) => game.id === selectedGame)?.name}</span>
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

            <div className="grid gap-4 md:grid-cols-2">
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
                    {prices.map((price) => (
                      <SelectItem key={price.duration_hours} value={String(price.duration_hours)}>
                        {formatDuration(price.duration_hours)} - Rs {price.price.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Max Devices</Label>
                <Select
                  value={maxDevices}
                  onValueChange={(value) => {
                    setMaxDevices(value);
                    if (value !== "custom") {
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
                    <SelectItem value="10">10 devices</SelectItem>
                    <SelectItem value="100">100 devices</SelectItem>
                    <SelectItem value="500">500 devices</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                {maxDevices === "custom" && !singleDeviceMode && (
                  <Input
                    type="number"
                    min="1"
                    max="5000"
                    value={customDeviceCount}
                    onChange={(event) => setCustomDeviceCount(event.target.value)}
                    placeholder="Enter device count"
                    className="input-dark"
                  />
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border/40 bg-card/40 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label className="text-foreground">Approved Package Required</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      When enabled, only package names from the Packages page can use this key through the SDK URL.
                    </p>
                  </div>
                  <Switch checked={packageRestricted} onCheckedChange={setPackageRestricted} />
                </div>
              </div>

              <div className="rounded-xl border border-border/40 bg-card/40 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label className="text-foreground">Single Device Mode</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Force the key to a single activation slot.
                    </p>
                  </div>
                  <Switch checked={singleDeviceMode} onCheckedChange={setSingleDeviceMode} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/40 bg-card/40 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-foreground">Use Custom Key</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Set your own SDK key code instead of a random one.
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
            </div>

            {useCustomKey && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Custom Key</Label>
                <Input
                  value={customKeyCode}
                  onChange={(event) => setCustomKeyCode(event.target.value.toUpperCase())}
                  placeholder="SDK-PANEL-7DAY-500"
                  className="input-dark font-mono tracking-wider"
                  maxLength={50}
                />
              </div>
            )}

            {!useCustomKey && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="input-dark"
                />
              </div>
            )}

            <div className="rounded-xl border border-border/40 bg-card/40 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Total Price</span>
                <span className="text-2xl font-bold gradient-text">Rs {totalPrice.toFixed(2)}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Balance:{" "}
                {role === "owner" || role === "co_owner"
                  ? "Unlimited"
                  : `Rs ${profile?.balance?.toFixed(2) || "0.00"}`}
              </p>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={
                isGenerating ||
                !selectedGame ||
                (useCustomKey && !customKeyCode) ||
                (maxDevices === "custom" &&
                  !singleDeviceMode &&
                  (!customDeviceCount || Number(customDeviceCount) < 1))
              }
              className="h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating SDK Keys
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Generate SDK Keys
                </>
              )}
            </Button>
          </div>

          <div className="space-y-6">
            <div className="glass-card rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">SDK Behavior</h2>
              <div className="rounded-xl border border-border/40 bg-card/40 p-4 text-sm text-muted-foreground">
                {packageRestricted ? (
                  <p>
                    This key will only pass through the SDK endpoint when the incoming <span className="font-mono text-foreground">package_name</span> is active on the Packages page.
                  </p>
                ) : (
                  <p>
                    Package validation is off, so the generated key can still work on the normal connect endpoint without package enforcement.
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-border/40 bg-card/40 p-4 text-sm text-muted-foreground">
                Active approved packages: <span className="font-semibold text-foreground">{approvedPackageCount}</span>
              </div>
              <div className="rounded-xl border border-border/40 bg-card/40 p-4 text-sm text-muted-foreground">
                Normal C++ endpoint:
                <div className="mt-2 break-all font-mono text-xs text-foreground">
                  https://etzchciutckbwreroahg.supabase.co/functions/v1/sarkar-api/connect
                </div>
              </div>
            </div>

            {generatedKeys.length > 0 && (
              <div className="glass-card rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-foreground">Generated SDK Keys</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyAllKeys}>
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadKeys}>
                      <Download className="mr-1 h-3.5 w-3.5" />
                      Download
                    </Button>
                  </div>
                </div>

                <div className="max-h-72 space-y-2 overflow-auto rounded-xl border border-border/40 bg-card/40 p-4">
                  {generatedKeys.map((key) => (
                    <div
                      key={key}
                      className="break-all rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 font-mono text-sm text-primary"
                    >
                      {key}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SdkKeys;
