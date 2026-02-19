import { Mic, RefreshCw, PlayCircle, Loader2, Volume2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AudioDevice } from "@/hooks/useAudioDevices";
import { useMicTest } from "@/hooks/useMicTest";

interface MicrophoneSelectorProps {
  devices: AudioDevice[];
  selectedDeviceId: string | null;
  onSelect: (id: string) => void;
  onRefresh: () => void;
  micStatus: "disconnected" | "connected" | "active";
  compact?: boolean;
}

const MicrophoneSelector = ({
  devices,
  selectedDeviceId,
  onSelect,
  onRefresh,
  micStatus,
  compact = false,
}: MicrophoneSelectorProps) => {
  const { isRecording, isPlaying, startTest } = useMicTest();

  const statusDot = {
    disconnected: "bg-destructive",
    connected: "bg-emerald-500",
    active: "bg-primary animate-pulse",
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Mic className="w-4 h-4 text-muted-foreground" />
        <Select value={selectedDeviceId || ""} onValueChange={onSelect}>
          <SelectTrigger className="w-48 h-8 text-xs">
            <SelectValue placeholder="Select mic" />
          </SelectTrigger>
          <SelectContent>
            {devices.map((d) => (
              <SelectItem key={d.deviceId} value={d.deviceId}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className={`w-2 h-2 rounded-full ${statusDot[micStatus]}`} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-sm">Input Device</Label>
        <Select value={selectedDeviceId || ""} onValueChange={onSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Select microphone" />
          </SelectTrigger>
          <SelectContent>
            {devices.map((d) => (
              <SelectItem key={d.deviceId} value={d.deviceId}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Status:</span>
          <div className={`w-2 h-2 rounded-full ${statusDot[micStatus]}`} />
          <span className="capitalize text-foreground">{micStatus}</span>
        </div>
        <span className="text-xs text-muted-foreground">Noise Reduction: Enabled</span>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => startTest(selectedDeviceId)}
          disabled={isRecording || isPlaying}
        >
          {isRecording ? (
            <><Loader2 className="w-3 h-3 animate-spin" />Recording...</>
          ) : isPlaying ? (
            <><Volume2 className="w-3 h-3" />Playing...</>
          ) : (
            <><PlayCircle className="w-3 h-3" />Test Microphone</>
          )}
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onRefresh}>
          <RefreshCw className="w-3 h-3" />
          Refresh
        </Button>
      </div>
    </div>
  );
};

export default MicrophoneSelector;
