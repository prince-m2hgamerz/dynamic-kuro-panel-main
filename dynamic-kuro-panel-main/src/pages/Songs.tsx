import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GTACard } from "@/components/ui/GTACard";
import { GTATitle } from "@/components/ui/GTATitle";
import { GTAButton } from "@/components/ui/GTAButton";
import { Music, Upload, Play, Pause, Trash2, Power, PowerOff, ShieldAlert, Globe } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface Song {
  id: string;
  name: string;
  file_url: string;
  is_active: boolean;
  is_owner_song: boolean;
  created_by: string;
  created_at: string;
}

export default function Songs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [songName, setSongName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [songType, setSongType] = useState<"website" | "blocked">("website");

  // Fetch songs
  const { data: songs = [], isLoading } = useQuery({
    queryKey: ['songs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Song[];
    },
  });

  // Split songs by type
  const websiteSongs = songs.filter(s => !s.is_owner_song);
  const blockedSongs = songs.filter(s => s.is_owner_song);

  // Upload song mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, name, isBlockedSong }: { file: File; name: string; isBlockedSong: boolean }) => {
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('songs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('songs')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('songs')
        .insert({
          name,
          file_url: urlData.publicUrl,
          is_owner_song: isBlockedSong,
          is_active: true,
          created_by: user.id,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      toast.success("Song uploaded successfully!");
      setSongName("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Toggle song active status
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'toggle_song', song_id: id, is_active: isActive },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      toast.success("Song status updated!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete song
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'delete_song', song_id: id },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      toast.success("Song deleted!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('audio')) {
      toast.error("Please upload an audio file (MP3, WAV, etc.)");
      return;
    }

    if (!songName.trim()) {
      toast.error("Please enter a song name first");
      return;
    }

    setUploading(true);
    try {
      await uploadMutation.mutateAsync({ file, name: songName, isBlockedSong: songType === "blocked" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const playPreview = (song: Song) => {
    if (audioRef) {
      audioRef.pause();
    }

    if (playingId === song.id) {
      setPlayingId(null);
      return;
    }

    const audio = new Audio(song.file_url);
    audio.play();
    audio.onended = () => setPlayingId(null);
    setAudioRef(audio);
    setPlayingId(song.id);
  };

  const renderSongList = (songList: Song[], emptyText: string) => {
    if (isLoading) {
      return <div className="text-center text-muted-foreground py-6">Loading songs...</div>;
    }
    if (songList.length === 0) {
      return <div className="text-center text-muted-foreground py-6">{emptyText}</div>;
    }
    return (
      <div className="space-y-3">
        {songList.map((song) => (
          <div
            key={song.id}
            className={`flex items-center justify-between p-4 rounded-xl transition-all ${
              song.is_active 
                ? 'bg-primary/10 border border-primary/30' 
                : 'bg-muted/30 border border-border/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => playPreview(song)}
                className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors"
              >
                {playingId === song.id ? (
                  <Pause className="w-5 h-5 text-primary" />
                ) : (
                  <Play className="w-5 h-5 text-primary" />
                )}
              </button>
              <div>
                <p className="font-medium">{song.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(song.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleMutation.mutate({ id: song.id, isActive: !song.is_active })}
                className={`p-2 rounded-lg transition-colors ${
                  song.is_active 
                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
                title={song.is_active ? "Disable song" : "Enable song"}
              >
                {song.is_active ? (
                  <Power className="w-5 h-5" />
                ) : (
                  <PowerOff className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => deleteMutation.mutate(song.id)}
                className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                title="Delete song"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <GTATitle text="Background Music" size="md" />
        <p className="text-muted-foreground text-center">
          Upload songs for the website or the blocked page. Active songs will auto-play and loop.
        </p>

        {/* Upload Section */}
        <GTACard className="p-6">
          <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload New Song
          </h3>

          {/* Song Type Selector */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setSongType("website")}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                songType === "website"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/50 bg-muted/20 text-muted-foreground hover:border-primary/30"
              }`}
            >
              <Globe className="w-5 h-5" />
              <div className="text-left">
                <p className="font-semibold text-sm">Website Song</p>
                <p className="text-xs opacity-70">Plays on all pages</p>
              </div>
            </button>
            <button
              onClick={() => setSongType("blocked")}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                songType === "blocked"
                  ? "border-red-500 bg-red-500/10 text-red-400"
                  : "border-border/50 bg-muted/20 text-muted-foreground hover:border-red-500/30"
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
              <div className="text-left">
                <p className="font-semibold text-sm">Blocked Page Song</p>
                <p className="text-xs opacity-70">Plays on /blocked-message</p>
              </div>
            </button>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Music className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Enter song name..."
                value={songName}
                onChange={(e) => setSongName(e.target.value)}
                className="pl-10 bg-background/50 border-primary/20"
              />
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <GTAButton
              type="button"
              disabled={uploading || !songName.trim()}
              className="w-full md:w-auto"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? "Uploading..." : "Choose MP3 File"}
            </GTAButton>
          </div>
        </GTACard>

        {/* Website Songs List */}
        <GTACard className="p-6">
          <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Website Songs
          </h3>
          <p className="text-xs text-muted-foreground mb-3">These songs play across the entire website.</p>
          {renderSongList(websiteSongs, "No website songs uploaded yet.")}
        </GTACard>

        {/* Blocked Page Songs List */}
        <GTACard className="p-6">
          <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            Blocked Page Songs
          </h3>
          <p className="text-xs text-muted-foreground mb-3">These songs play only on the /blocked-message page.</p>
          {renderSongList(blockedSongs, "No blocked page songs uploaded yet.")}
        </GTACard>
      </div>
    </DashboardLayout>
  );
}
