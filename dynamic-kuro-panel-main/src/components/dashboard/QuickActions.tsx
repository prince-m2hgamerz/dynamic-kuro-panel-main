import { Key, Plus, Users, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export const QuickActions = () => {
  const navigate = useNavigate();
  const { role } = useAuth();

  const actions = [
    {
      label: "Generate Key",
      icon: Plus,
      path: "/keys/generate",
      color: "from-success to-success/80",
    },
    {
      label: "View Keys",
      icon: Key,
      path: "/keys",
      color: "from-primary to-primary/80",
    },
    ...(role === "owner"
      ? [
          {
            label: "Manage Users",
            icon: Users,
            path: "/users",
            color: "from-accent to-accent/80",
          },
        ]
      : []),
    ...(role === "owner"
      ? [
          {
            label: "Server Settings",
            icon: Settings,
            path: "/settings/server",
            color: "from-warning to-warning/80",
          },
        ]
      : []),
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map((action) => (
        <Button
          key={action.path}
          onClick={() => navigate(action.path)}
          className={`bg-gradient-to-r ${action.color} hover:opacity-90 text-white h-auto py-4 flex flex-col items-center gap-2 duration-short hover:scale-105`}
        >
          <action.icon className="h-5 w-5" />
          <span className="text-xs font-medium">{action.label}</span>
        </Button>
      ))}
    </div>
  );
};
