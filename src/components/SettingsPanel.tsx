import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, X, Volume2, Mic, Globe, Palette, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { UserSettings } from "@/types/fluent-flow";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

const SettingsPanel = ({ open, onClose }: SettingsPanelProps) => {
  const [settings, setSettings] = useLocalStorage<UserSettings & { speechSpeed: number; voiceIndex: number; difficulty: string }>(
    "fluent-flow-settings",
    {
      responseStyle: "neutral",
      language: "en-US",
      voiceFeedback: false,
      autoStartListening: false,
      showRealTimeGrammar: true,
      speechSpeed: 1,
      voiceIndex: 0,
      difficulty: "medium",
    }
  );

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const loadVoices = () => setVoices(speechSynthesis.getVoices());
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const update = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end"
    >
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25 }}
        className="relative w-full max-w-md bg-card border-l border-border overflow-y-auto"
      >
        <div className="sticky top-0 bg-card/90 backdrop-blur-sm z-10 p-6 pb-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Settings</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Voice Feedback */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Volume2 className="w-4 h-4 text-primary" />
              Voice & Audio
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Voice Feedback</Label>
                <Switch checked={settings.voiceFeedback} onCheckedChange={v => update("voiceFeedback", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Auto-start Listening</Label>
                <Switch checked={settings.autoStartListening} onCheckedChange={v => update("autoStartListening", v)} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Speech Speed: {settings.speechSpeed.toFixed(1)}x</Label>
                <Slider value={[settings.speechSpeed]} min={0.5} max={2} step={0.1} onValueChange={([v]) => update("speechSpeed", v)} />
              </div>
              {voices.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Voice</Label>
                  <Select value={String(settings.voiceIndex)} onValueChange={v => update("voiceIndex", Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {voices.slice(0, 15).map((v, i) => (
                        <SelectItem key={i} value={String(i)}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Language */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Globe className="w-4 h-4 text-primary" />
              Language & Style
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm">Language</Label>
                <Select value={settings.language} onValueChange={v => update("language", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en-US">English (US)</SelectItem>
                    <SelectItem value="en-GB">English (UK)</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Response Style</Label>
                <Select value={settings.responseStyle} onValueChange={(v: any) => update("responseStyle", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="formal">Professional</SelectItem>
                    <SelectItem value="casual">Friendly</SelectItem>
                    <SelectItem value="supportive">Supportive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Difficulty */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <BarChart3 className="w-4 h-4 text-primary" />
              Interview
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm">Question Difficulty</Label>
                <Select value={settings.difficulty} onValueChange={v => update("difficulty", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Real-time Grammar</Label>
                <Switch checked={settings.showRealTimeGrammar} onCheckedChange={v => update("showRealTimeGrammar", v)} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SettingsPanel;
