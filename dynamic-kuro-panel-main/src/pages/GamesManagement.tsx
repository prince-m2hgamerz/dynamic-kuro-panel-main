import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Gamepad2, Plus, Pencil, Trash2, Loader2, ImagePlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Game {
  id: string;
  name: string;
  mod_name: string | null;
  icon_url: string | null;
  status: "active" | "inactive";
  created_at: string;
  created_by: string | null;
  keyCount?: number;
}

const GamesManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Add form state
  const [gameName, setGameName] = useState("");
  const [modName, setModName] = useState("");
  const [gameStatus, setGameStatus] = useState<"active" | "inactive">("active");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [editName, setEditName] = useState("");
  const [editModName, setEditModName] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");
  const [editIconFile, setEditIconFile] = useState<File | null>(null);
  const [editIconPreview, setEditIconPreview] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    setLoading(true);
    try {
      // Fetch games
      const { data: gamesData, error: gamesError } = await supabase
        .from("games")
        .select("*")
        .order("created_at", { ascending: false });

      if (gamesError) throw gamesError;

      // Fetch key counts for each game
      const { data: keysData, error: keysError } = await supabase
        .from("license_keys_safe")
        .select("game_id");

      if (keysError) throw keysError;

      // Count keys per game
      const keyCounts: Record<string, number> = {};
      keysData?.forEach((key) => {
        keyCounts[key.game_id] = (keyCounts[key.game_id] || 0) + 1;
      });

      // Merge counts with games
      const gamesWithCounts = gamesData?.map((game) => ({
        ...game,
        keyCount: keyCounts[game.id] || 0,
      })) as Game[];

      setGames(gamesWithCounts || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch games",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file (PNG, JPG, WebP)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 2MB",
        variant: "destructive",
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      if (isEdit) {
        setEditIconFile(file);
        setEditIconPreview(reader.result as string);
      } else {
        setIconFile(file);
        setIconPreview(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const uploadIcon = async (file: File, gameId: string): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${gameId}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("game-icons")
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("game-icons").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const addGame = async () => {
    if (!gameName.trim()) {
      toast({
        title: "Error",
        description: "Game name is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Server-side game creation
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: {
          action: 'add_game',
          name: gameName.trim(),
          mod_name: modName.trim() || null,
          status: gameStatus,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Failed to add game");

      const newGame = data?.game;

      // Upload icon if selected (storage upload stays client-side, RLS protects it)
      if (iconFile && newGame) {
        const iconUrl = await uploadIcon(iconFile, newGame.id);
        if (iconUrl) {
          await supabase.functions.invoke('admin-actions', {
            body: { action: 'update_game', game_id: newGame.id, name: newGame.name, mod_name: newGame.mod_name, status: newGame.status, icon_url: iconUrl },
          });
        }
      }

      toast({
        title: "Success",
        description: "Game added successfully",
      });

      setGameName("");
      setModName("");
      setGameStatus("active");
      setIconFile(null);
      setIconPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchGames();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add game",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (game: Game) => {
    setEditingGame(game);
    setEditName(game.name);
    setEditModName(game.mod_name || "");
    setEditStatus(game.status);
    setEditIconFile(null);
    setEditIconPreview(game.icon_url);
    setEditDialogOpen(true);
  };

  const updateGame = async () => {
    if (!editingGame || !editName.trim()) {
      toast({
        title: "Error",
        description: "Game name is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      let iconUrl = editingGame.icon_url;

      // Upload new icon if selected (storage stays client-side, RLS protected)
      if (editIconFile) {
        iconUrl = await uploadIcon(editIconFile, editingGame.id);
      }

      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: {
          action: 'update_game',
          game_id: editingGame.id,
          name: editName.trim(),
          mod_name: editModName.trim() || null,
          status: editStatus,
          icon_url: iconUrl,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Failed to update game");

      toast({
        title: "Success",
        description: "Game updated successfully",
      });

      setEditDialogOpen(false);
      setEditingGame(null);
      setEditIconFile(null);
      setEditIconPreview(null);
      fetchGames();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update game",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const removeIcon = async (gameId: string) => {
    try {
      const game = games.find(g => g.id === gameId);
      const iconFileName = game?.icon_url ? game.icon_url.split("/").pop() : null;

      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'remove_game_icon', game_id: gameId, icon_file_name: iconFileName },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);

      toast({
        title: "Success",
        description: "Icon removed successfully",
      });
      fetchGames();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove icon",
        variant: "destructive",
      });
    }
  };

  const deleteGame = async (gameId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'delete_game', game_id: gameId },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);

      toast({
        title: "Success",
        description: "Game and related data deleted successfully",
      });

      fetchGames();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete game",
        variant: "destructive",
      });
    }
  };

  const toggleStatus = async (game: Game) => {
    const newStatus = game.status === "active" ? "inactive" : "active";
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'toggle_game_status', game_id: game.id, new_status: newStatus },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);

      toast({
        title: "Success",
        description: `Game status changed to ${newStatus}`,
      });

      fetchGames();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Gamepad2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Games Management</h1>
            <p className="text-muted-foreground text-sm">
              Add, edit, and manage games for license keys
            </p>
          </div>
        </div>

        {/* Add New Game */}
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Game
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Icon Upload */}
              <div className="space-y-2">
                <Label>Game Icon</Label>
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14 border-2 border-dashed border-muted-foreground/30">
                    <AvatarImage src={iconPreview || undefined} />
                    <AvatarFallback className="bg-muted">
                      <Gamepad2 className="h-6 w-6 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus className="h-4 w-4 mr-1" />
                      Upload
                    </Button>
                    {iconPreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive h-7 px-2"
                        onClick={() => {
                          setIconFile(null);
                          setIconPreview(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, false)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gameName">Game Name *</Label>
                <Input
                  id="gameName"
                  placeholder="e.g., PUBG Mobile"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modName">Mod Name (Optional)</Label>
                <Input
                  id="modName"
                  placeholder="e.g., PUBG Mobile Mod"
                  value={modName}
                  onChange={(e) => setModName(e.target.value)}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch
                    checked={gameStatus === "active"}
                    onCheckedChange={(checked) =>
                      setGameStatus(checked ? "active" : "inactive")
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    {gameStatus === "active" ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={addGame}
                  disabled={saving || !gameName.trim()}
                  className="w-full"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Add Game
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Games List */}
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-lg">
              Existing Games ({games.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : games.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No games found. Add your first game above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Icon</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Mod Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Keys</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {games.map((game) => (
                      <TableRow key={game.id}>
                        <TableCell>
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={game.icon_url || undefined} />
                            <AvatarFallback className="bg-primary/10">
                              <Gamepad2 className="h-4 w-4 text-primary" />
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">
                          {game.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {game.mod_name || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              game.status === "active" ? "default" : "secondary"
                            }
                            className={
                              game.status === "active"
                                ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                : "bg-gray-500/20 text-gray-400 hover:bg-gray-500/30"
                            }
                          >
                            {game.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{game.keyCount} keys</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(game.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleStatus(game)}
                              title={
                                game.status === "active"
                                  ? "Deactivate"
                                  : "Activate"
                              }
                            >
                              <Switch
                                checked={game.status === "active"}
                                className="pointer-events-none"
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(game)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete "{game.name}"?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="space-y-2">
                                    <p>
                                      This action cannot be undone. Deleting
                                      this game will also permanently delete:
                                    </p>
                                    <ul className="list-disc list-inside text-destructive">
                                      <li>
                                        {game.keyCount} license keys associated
                                        with this game
                                      </li>
                                      <li>
                                        All price settings for this game
                                      </li>
                                      <li>
                                        The game icon (if uploaded)
                                      </li>
                                    </ul>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteGame(game.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete Game
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Game</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Icon Upload in Edit */}
              <div className="space-y-2">
                <Label>Game Icon</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-dashed border-muted-foreground/30">
                    <AvatarImage src={editIconPreview || undefined} />
                    <AvatarFallback className="bg-muted">
                      <Gamepad2 className="h-8 w-8 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => editFileInputRef.current?.click()}
                    >
                      <ImagePlus className="h-4 w-4 mr-2" />
                      {editIconPreview ? "Change Icon" : "Upload Icon"}
                    </Button>
                    {editIconPreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => {
                          setEditIconFile(null);
                          setEditIconPreview(null);
                          if (editingGame) {
                            removeIcon(editingGame.id);
                          }
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove Icon
                      </Button>
                    )}
                  </div>
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, true)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editName">Game Name *</Label>
                <Input
                  id="editName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editModName">Mod Name (Optional)</Label>
                <Input
                  id="editModName"
                  value={editModName}
                  onChange={(e) => setEditModName(e.target.value)}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editStatus === "active"}
                    onCheckedChange={(checked) =>
                      setEditStatus(checked ? "active" : "inactive")
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    {editStatus === "active" ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={updateGame} disabled={saving || !editName.trim()}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default GamesManagement;
