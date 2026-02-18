import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar } from "recharts";
import { TrendingUp, Calendar, BarChart3 } from "lucide-react";

const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("interview_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(50);
      if (data) setSessions(data);
    };
    fetch();
  }, [user]);

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto" />
        <p className="text-muted-foreground">Complete some sessions to see your analytics</p>
      </div>
    );
  }

  // Progress over time
  const progressData = sessions.map((s, i) => ({
    session: i + 1,
    grammar: s.grammar_score,
    fluency: s.fluency_score,
    confidence: s.confidence_score,
  }));

  // Radar data (averages)
  const avg = (key: string) => Math.round(sessions.reduce((sum, s) => sum + (s[key] || 0), 0) / sessions.length);
  const radarData = [
    { skill: "Grammar", value: avg("grammar_score") },
    { skill: "Fluency", value: avg("fluency_score") },
    { skill: "Confidence", value: avg("confidence_score") },
    { skill: "Pronunciation", value: avg("pronunciation_score") },
    { skill: "Speed", value: Math.min(100, avg("speaking_speed")) },
  ];

  // Weekly sessions
  const weeklyMap: Record<string, number> = {};
  sessions.forEach(s => {
    const week = new Date(s.created_at).toLocaleDateString("en", { month: "short", day: "numeric" });
    weeklyMap[week] = (weeklyMap[week] || 0) + 1;
  });
  const weeklyData = Object.entries(weeklyMap).slice(-7).map(([day, count]) => ({ day, sessions: count }));

  // Improvement
  const recentAvg = sessions.length > 3
    ? Math.round(sessions.slice(-3).reduce((s, d) => s + (d.grammar_score + d.fluency_score + d.confidence_score) / 3, 0) / 3)
    : 0;
  const olderAvg = sessions.length > 6
    ? Math.round(sessions.slice(0, 3).reduce((s, d) => s + (d.grammar_score + d.fluency_score + d.confidence_score) / 3, 0) / 3)
    : 0;
  const improvement = recentAvg - olderAvg;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Progress Analytics</h3>
        {improvement > 0 && (
          <div className="flex items-center gap-1 text-emerald-500 text-sm">
            <TrendingUp className="w-4 h-4" />
            +{improvement}% improvement
          </div>
        )}
      </div>

      {/* Progress Line Chart */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl bg-card border border-border">
        <p className="text-sm font-medium text-foreground mb-4">Score Progress</p>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={progressData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="session" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
            <Line type="monotone" dataKey="grammar" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="fluency" stroke="#f59e0b" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="confidence" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 justify-center text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-primary inline-block" /> Grammar</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-500 inline-block" /> Fluency</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-sky-500 inline-block" /> Confidence</span>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Radar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="p-4 rounded-xl bg-card border border-border">
          <p className="text-sm font-medium text-foreground mb-4">Skill Breakdown</p>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="skill" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} />
              <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Weekly Bar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="p-4 rounded-xl bg-card border border-border">
          <p className="text-sm font-medium text-foreground mb-4">Practice Frequency</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
              <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
