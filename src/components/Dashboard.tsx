import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Play, TrendingUp, Target, Clock, Zap, Award } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardProps {
  onStartInterview: () => void;
  displayName: string | null;
}

interface SessionStats {
  totalSessions: number;
  avgGrammar: number;
  avgFluency: number;
  avgConfidence: number;
  recentSessions: any[];
}

const Dashboard = ({ onStartInterview, displayName }: DashboardProps) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<SessionStats>({
    totalSessions: 0,
    avgGrammar: 0,
    avgFluency: 0,
    avgConfidence: 0,
    recentSessions: [],
  });

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const { data } = await supabase
        .from("interview_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (data && data.length > 0) {
        const avgGrammar = Math.round(data.reduce((s, d) => s + (d.grammar_score || 0), 0) / data.length);
        const avgFluency = Math.round(data.reduce((s, d) => s + (d.fluency_score || 0), 0) / data.length);
        const avgConfidence = Math.round(data.reduce((s, d) => s + (d.confidence_score || 0), 0) / data.length);
        setStats({
          totalSessions: data.length,
          avgGrammar,
          avgFluency,
          avgConfidence,
          recentSessions: data.slice(0, 5),
        });
      }
    };
    fetchStats();
  }, [user]);

  const cards = [
    { label: "Sessions", value: stats.totalSessions, icon: Target, color: "text-primary" },
    { label: "Grammar", value: `${stats.avgGrammar}%`, icon: Award, color: "text-emerald-500" },
    { label: "Fluency", value: `${stats.avgFluency}%`, icon: Zap, color: "text-amber-500" },
    { label: "Confidence", value: `${stats.avgConfidence}%`, icon: TrendingUp, color: "text-sky-500" },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          Welcome back, {displayName || "there"} 👋
        </h2>
        <p className="text-muted-foreground">Ready to level up your speaking skills?</p>
      </motion.div>

      {/* Start Interview CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-6 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 border border-primary/20"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">Start Interview Practice</h3>
            <p className="text-sm text-muted-foreground">Choose a role and begin AI-powered mock interviews</p>
          </div>
          <Button onClick={onStartInterview} size="lg" className="gap-2">
            <Play className="w-5 h-5" />
            Start Now
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
            className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
          >
            <card.icon className={`w-5 h-5 ${card.color} mb-2`} />
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent Sessions */}
      {stats.recentSessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <h3 className="text-sm font-medium text-foreground">Recent Sessions</h3>
          <div className="space-y-2">
            {stats.recentSessions.map(session => (
              <div key={session.id} className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground capitalize">{session.mode} - {session.category || session.role || "General"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(session.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>G: {session.grammar_score}%</span>
                  <span>F: {session.fluency_score}%</span>
                  <span>C: {session.confidence_score}%</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* AI Tip */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-4 rounded-xl bg-accent/10 border border-accent/20"
      >
        <p className="text-sm text-foreground font-medium mb-1">💡 AI Tip</p>
        <p className="text-sm text-muted-foreground">
          {stats.avgGrammar > 0 && stats.avgGrammar < 70
            ? "Focus on grammar fundamentals — practice using complete sentences."
            : stats.avgFluency > 0 && stats.avgFluency < 70
            ? "Try to reduce filler words and practice with the Fluency mode daily."
            : "Keep practicing consistently! Try the Interview mode with different roles."}
        </p>
      </motion.div>
    </div>
  );
};

export default Dashboard;
