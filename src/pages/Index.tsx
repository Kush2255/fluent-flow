import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ModeSwitcher from "@/components/ModeSwitcher";
import AssistantMode from "@/components/AssistantMode";
import InterviewMode from "@/components/InterviewMode";
import LearningMode from "@/components/LearningMode";
import QAMode from "@/components/QAMode";
import Dashboard from "@/components/Dashboard";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import SessionHistory from "@/components/SessionHistory";
import SettingsPanel from "@/components/SettingsPanel";
import ThemeToggle from "@/components/ThemeToggle";
import { AppMode, DEFAULT_USER_SETTINGS } from "@/types/fluent-flow";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Settings, Sparkles, LogOut, BarChart3, LayoutDashboard, History } from "lucide-react";
import { Button } from "@/components/ui/button";

type PageView = "dashboard" | "practice" | "analytics" | "history";

const Index = () => {
  const { user, signOut } = useAuth();
  const [activeMode, setActiveMode] = useState<AppMode>("assistant");
  const [settings] = useLocalStorage("fluent-flow-settings", DEFAULT_USER_SETTINGS);
  const [pageView, setPageView] = useState<PageView>("dashboard");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single();
      if (data) setDisplayName(data.display_name);
    };
    fetchProfile();
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-foreground">Fluent Flow</h1>
                <p className="text-xs text-muted-foreground">AI Interview Coach</p>
              </div>
            </div>

            {/* Nav */}
            <div className="flex items-center gap-1">
              <Button
                variant={pageView === "dashboard" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPageView("dashboard")}
                className="gap-1.5"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
              <Button
                variant={pageView === "practice" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPageView("practice")}
                className="gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Practice</span>
              </Button>
              <Button
                variant={pageView === "analytics" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPageView("analytics")}
                className="gap-1.5"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Analytics</span>
              </Button>
              <Button
                variant={pageView === "history" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPageView("history")}
                className="gap-1.5"
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">History</span>
              </Button>
            </div>

            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
                <Settings className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={signOut}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <AnimatePresence mode="wait">
          {pageView === "dashboard" && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Dashboard
                displayName={displayName}
                onStartInterview={() => {
                  setActiveMode("interview");
                  setPageView("practice");
                }}
              />
            </motion.div>
          )}

          {pageView === "practice" && (
            <motion.div key="practice" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-6">
                <ModeSwitcher activeMode={activeMode} onModeChange={setActiveMode} />
              </div>
              <motion.div key={activeMode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                {activeMode === "assistant" && <AssistantMode settings={settings} />}
                {activeMode === "interview" && <InterviewMode />}
                {activeMode === "learning" && <LearningMode />}
                {activeMode === "qa" && <QAMode />}
              </motion.div>
            </motion.div>
          )}

          {pageView === "analytics" && (
            <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <AnalyticsDashboard />
            </motion.div>
          )}

          {pageView === "history" && (
            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <SessionHistory />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Settings Drawer */}
      <AnimatePresence>
        {settingsOpen && <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />}
      </AnimatePresence>
    </div>
  );
};

export default Index;
