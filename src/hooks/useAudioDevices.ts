import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "@/hooks/use-toast";

export interface AudioDevice {
  deviceId: string;
  label: string;
  groupId: string;
}

interface UseAudioDevicesReturn {
  devices: AudioDevice[];
  selectedDeviceId: string | null;
  setSelectedDeviceId: (id: string) => void;
  isPermissionGranted: boolean;
  requestPermission: () => Promise<boolean>;
  refreshDevices: () => Promise<void>;
  micStatus: "disconnected" | "connected" | "active";
  setMicActive: (active: boolean) => void;
}

const STORAGE_KEY = "fluentflow_mic";

export const useAudioDevices = (): UseAudioDevicesReturn => {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceIdState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [micActive, setMicActive] = useState(false);

  const setSelectedDeviceId = useCallback((id: string) => {
    setSelectedDeviceIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const enumerateDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices
        .filter((d) => d.kind === "audioinput")
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.slice(0, 6)}`,
          groupId: d.groupId,
        }));
      setDevices(audioInputs);

      // If selected device no longer exists, reset
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && !audioInputs.find((d) => d.deviceId === saved)) {
        if (audioInputs.length > 0) {
          setSelectedDeviceId(audioInputs[0].deviceId);
          toast({
            title: "⚠️ Selected microphone unavailable",
            description: "Switching to system default.",
          });
        }
      } else if (!saved && audioInputs.length > 0) {
        setSelectedDeviceIdState(audioInputs[0].deviceId);
      }

      if (audioInputs.length > 0 && audioInputs[0].label) {
        setIsPermissionGranted(true);
      }
    } catch (e) {
      console.error("Failed to enumerate devices:", e);
    }
  }, [setSelectedDeviceId]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setIsPermissionGranted(true);
      await enumerateDevices();
      return true;
    } catch {
      setIsPermissionGranted(false);
      return false;
    }
  }, [enumerateDevices]);

  const refreshDevices = useCallback(async () => {
    await enumerateDevices();
    toast({ title: "🔄 Devices refreshed" });
  }, [enumerateDevices]);

  // Listen for device changes
  useEffect(() => {
    const handler = async () => {
      const prevCount = devices.length;
      await enumerateDevices();
      // We'll check new count inside enumerate, but also show toast for new device
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices.filter((d) => d.kind === "audioinput");
      if (audioInputs.length > prevCount) {
        const newest = audioInputs[audioInputs.length - 1];
        toast({
          title: "🎧 New microphone detected",
          description: `${newest.label || "Unknown device"} — switch in settings.`,
        });
      }
    };
    navigator.mediaDevices.addEventListener("devicechange", handler);
    return () => navigator.mediaDevices.removeEventListener("devicechange", handler);
  }, [devices.length, enumerateDevices]);

  // Initial enumerate
  useEffect(() => {
    enumerateDevices();
  }, [enumerateDevices]);

  const micStatus = micActive ? "active" : devices.length > 0 ? "connected" : "disconnected";

  return {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    isPermissionGranted,
    requestPermission,
    refreshDevices,
    micStatus,
    setMicActive: setMicActive,
  };
};
