import { useState, useCallback } from "react";

export interface DetectionRecord {
  id: string;
  sourceType: "webcam" | "upload";
  imageDataUrl: string | null;
  objects: Array<{
    label: string;
    confidence: number;
    bbox?: { x: number; y: number; width: number; height: number };
    category?: string;
    description?: string;
  }>;
  visionObjects: Array<{
    label: string;
    confidence: number;
    category: string;
    description: string;
  }>;
  objectCount: number;
  sceneDescription: string | null;
  sceneSummary: string | null;
  processingTimeMs: number | null;
  createdAt: string;
}

const STORAGE_KEY = "visionai_history";

function loadHistory(): DetectionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(records: DetectionRecord[]) {
  // Keep max 50 records to avoid localStorage limits
  const trimmed = records.slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function useDetectionHistory() {
  const [history, setHistory] = useState<DetectionRecord[]>(loadHistory);

  const addRecord = useCallback((record: Omit<DetectionRecord, "id" | "createdAt">) => {
    const newRecord: DetectionRecord = {
      ...record,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setHistory((prev) => {
      const updated = [newRecord, ...prev];
      saveHistory(updated);
      return updated;
    });
    return newRecord.id;
  }, []);

  const deleteRecord = useCallback((id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      saveHistory(updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const stats = {
    totalDetections: history.length,
    totalObjectsFound: history.reduce((sum, r) => sum + r.objectCount, 0),
    webcamSessions: history.filter((r) => r.sourceType === "webcam").length,
    uploadSessions: history.filter((r) => r.sourceType === "upload").length,
  };

  return { history, addRecord, deleteRecord, clearAll, stats };
}
