import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";

interface Transaction {
  id: string;
  key_code: string;
  game_name: string;
  username: string;
  duration_hours: number;
  max_devices: number;
  created_at: string;
}

export const TransactionHistory = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from("license_keys_safe")
        .select(`
          id,
          key_code,
          duration_hours,
          max_devices,
          created_at,
          games!inner(name),
          profiles!inner(username)
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error && data) {
        const formatted = data.map((item: any) => ({
          id: item.id,
          key_code: item.key_code,
          game_name: item.games?.name || "Unknown",
          username: item.profiles?.username || "Unknown",
          duration_hours: item.duration_hours,
          max_devices: item.max_devices,
          created_at: item.created_at,
        }));
        setTransactions(formatted);
      }
      setLoading(false);
    };

    fetchTransactions();
  }, []);

  const formatDuration = (hours: number) => {
    if (hours >= 720) return `${Math.floor(hours / 720)} Month${hours >= 1440 ? 's' : ''}`;
    if (hours >= 24) return `${Math.floor(hours / 24)} Day${hours >= 48 ? 's' : ''}`;
    return `${hours} Hour${hours > 1 ? 's' : ''}`;
  };

  const maskUsername = (username: string) => {
    if (username.length <= 4) return username;
    return username.slice(0, -3) + "***";
  };

  const getShortId = (id: string) => {
    return "#" + id.slice(0, 8).toUpperCase();
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading transactions...
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No transactions found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border/30 hover:bg-transparent">
            <TableHead className="text-muted-foreground font-medium">ID</TableHead>
            <TableHead className="text-muted-foreground font-medium">Game</TableHead>
            <TableHead className="text-muted-foreground font-medium">Username</TableHead>
            <TableHead className="text-muted-foreground font-medium">Duration</TableHead>
            <TableHead className="text-muted-foreground font-medium">Devices</TableHead>
            <TableHead className="text-muted-foreground font-medium text-right">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.id} className="border-border/30 table-row-hover">
              <TableCell className="text-primary font-mono text-sm">
                {getShortId(tx.id)}
              </TableCell>
              <TableCell>
                <span className="pill pill-primary">
                  {tx.game_name}
                </span>
              </TableCell>
              <TableCell className="text-foreground">
                {maskUsername(tx.username)}
              </TableCell>
              <TableCell>
                <span className="pill pill-info">
                  {formatDuration(tx.duration_hours)}
                </span>
              </TableCell>
              <TableCell>
                <span className="pill pill-success">
                  {tx.max_devices} Device{tx.max_devices > 1 ? 's' : ''}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground text-right text-sm">
                {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
