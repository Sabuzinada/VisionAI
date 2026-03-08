import { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera, CameraOff, Scan, Loader2, Zap, Brain, Sparkles, Save, Pause, Play,
} from "lucide-react";
import { toast } from "sonner";
import { useDetectionHistory } from "../hooks/useLocalStorage";

type DetectedObject = {
  label: string;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
};

type VisionObject = {
  label: string;
  confidence: number;
  category: string;
  description: string;
};

// Gesture emoji mapping
const GESTURE_EMOJIS: Record<string, string> = {
  "thumbs up": "\uD83D\uDC4D", "thumbs down": "\uD83D\uDC4E",
  "peace sign": "\u270C\uFE0F", "v sign": "\u270C\uFE0F",
  "ok sign": "\uD83D\uDC4C", "okay gesture": "\uD83D\uDC4C", "okay sign": "\uD83D\uDC4C",
  "pointing finger": "\uD83D\uDC46", "open palm": "\uD83D\uDD90\uFE0F",
  "wave": "\uD83D\uDC4B", "fist": "\u270A", "closed hand": "\u270A",
  "rock on": "\uD83E\uDD18", "horns": "\uD83E\uDD18",
  "shaka": "\uD83E\uDD19", "hang loose": "\uD83E\uDD19",
  "finger heart": "\uD83E\uDEF6", "crossed fingers": "\uD83E\uDD1E",
  "clapping": "\uD83D\uDC4F", "prayer hands": "\uD83D\uDE4F",
  "finger guns": "\uD83D\uDC49", "stop hand": "\u270B",
  "salute": "\uD83E\uDEE1", "pinching": "\uD83E\uDD0F",
};

function getGestureEmoji(label: string): string {
  const lower = label.toLowerCase();
  for (const [key, emoji] of Object.entries(GESTURE_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  if (lower.includes("thumb") && lower.includes("up")) return "\uD83D\uDC4D";
  if (lower.includes("thumb") && lower.includes("down")) return "\uD83D\uDC4E";
  if (lower.includes("peace") || lower.includes("v sign")) return "\u270C\uFE0F";
  if (lower.includes("ok") || lower.includes("okay")) return "\uD83D\uDC4C";
  if (lower.includes("point")) return "\uD83D\uDC46";
  if (lower.includes("wave") || lower.includes("palm")) return "\uD83D\uDC4B";
  if (lower.includes("fist")) return "\u270A";
  if (lower.includes("rock") || lower.includes("horn")) return "\uD83E\uDD18";
  if (lower.includes("shaka") || lower.includes("hang")) return "\uD83E\uDD19";
  return "\uD83D\uDC4B";
}

const CATEGORY_COLORS: Record<string, string> = {
  gesture: "#ffeb3b", electronics: "#40c4ff", eyewear: "#ea80fc",
  instrument: "#ff6e40", clothing: "#ffd740", furniture: "#69f0ae",
  kitchen: "#84ffff", office: "#b388ff", toy: "#ff80ab",
  sports: "#ccff90", decoration: "#ffab40", food: "#e6ee9c",
  animal: "#80cbc4", vehicle: "#ef9a9a", person: "#00e5ff", other: "#90a4ae",
};

const LABEL_COLORS: Record<string, string> = {
  person: "#00e5ff", car: "#ff6e40", dog: "#69f0ae", cat: "#ea80fc",
  chair: "#ffd740", bottle: "#84ffff", "cell phone": "#ff80ab",
  laptop: "#b388ff", book: "#ccff90", cup: "#ffab40",
};

function getColor(label: string): string {
  return LABEL_COLORS[label] || `hsl(${(label.charCodeAt(0) * 37) % 360}, 70%, 60%)`;
}

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
}

export default function Detect() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const modelRef = useRef<any>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isVisionScanning, setIsVisionScanning] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [visionObjects, setVisionObjects] = useState<VisionObject[]>([]);
  const [sceneSummary, setSceneSummary] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [activeTab, setActiveTab] = useState<"fast" | "ai">("fast");

  const { addRecord } = useDetectionHistory();

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err) {
      toast.error("Camera access denied. Please allow camera permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    cancelAnimationFrame(animFrameRef.current);
    setIsStreaming(false);
    setIsDetecting(false);
    setIsPaused(false);
    setDetectedObjects([]);
    setVisionObjects([]);
    setSceneSummary(null);
  }, []);

  const loadModel = useCallback(async () => {
    if (modelRef.current) return modelRef.current;
    setIsModelLoading(true);
    try {
      const cocoSsd = await import("@tensorflow-models/coco-ssd");
      await import("@tensorflow/tfjs");
      const model = await cocoSsd.load();
      modelRef.current = model;
      return model;
    } catch (err) {
      toast.error("Failed to load detection model");
      return null;
    } finally {
      setIsModelLoading(false);
    }
  }, []);

  const drawBoxes = useCallback((objects: DetectedObject[]) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    objects.forEach((obj) => {
      const color = getColor(obj.label);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(obj.bbox.x, obj.bbox.y, obj.bbox.width, obj.bbox.height);

      const label = `${obj.label} ${(obj.confidence * 100).toFixed(0)}%`;
      ctx.font = "bold 14px JetBrains Mono, monospace";
      const textWidth = ctx.measureText(label).width;

      ctx.fillStyle = color;
      ctx.fillRect(obj.bbox.x, obj.bbox.y - 22, textWidth + 10, 22);
      ctx.fillStyle = "#000";
      ctx.fillText(label, obj.bbox.x + 5, obj.bbox.y - 6);
    });
  }, []);

  const startDetection = useCallback(async () => {
    const model = await loadModel();
    if (!model || !videoRef.current) return;
    setIsDetecting(true);

    let lastTime = performance.now();
    let frameCount = 0;

    const detect = async () => {
      if (!videoRef.current || !isStreaming) return;
      if (isPaused) {
        animFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      try {
        const predictions = await model.detect(videoRef.current);
        const objects: DetectedObject[] = predictions.map((p: any) => ({
          label: p.class,
          confidence: p.score,
          bbox: { x: p.bbox[0], y: p.bbox[1], width: p.bbox[2], height: p.bbox[3] },
        }));

        setDetectedObjects(objects);
        drawBoxes(objects);

        frameCount++;
        const now = performance.now();
        if (now - lastTime >= 1000) {
          setFps(frameCount);
          frameCount = 0;
          lastTime = now;
        }
      } catch {}

      animFrameRef.current = requestAnimationFrame(detect);
    };

    detect();
  }, [loadModel, isStreaming, isPaused, drawBoxes]);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.8);
  }, []);

  const runVisionScan = useCallback(async () => {
    const frameDataUrl = captureFrame();
    if (!frameDataUrl) {
      toast.error("Failed to capture frame");
      return;
    }

    setIsVisionScanning(true);
    setActiveTab("ai");

    try {
      const base64 = frameDataUrl.split(",")[1];
      const response = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, cocoResults: detectedObjects }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Vision scan failed");
      }

      const data = await response.json();
      setVisionObjects(data.objects || []);
      setSceneSummary(data.sceneSummary || null);
      toast.success(`AI Vision detected ${data.objects?.length || 0} objects`);
    } catch (err: any) {
      toast.error(err.message || "AI Vision scan failed");
    } finally {
      setIsVisionScanning(false);
    }
  }, [captureFrame, detectedObjects]);

  const handleSave = useCallback(() => {
    const imageDataUrl = captureFrame();
    const allObjects = [
      ...detectedObjects.map((o) => ({ ...o, category: "coco-ssd" })),
      ...visionObjects,
    ];

    addRecord({
      sourceType: "webcam",
      imageDataUrl,
      objects: detectedObjects,
      visionObjects,
      objectCount: allObjects.length,
      sceneDescription: null,
      sceneSummary,
      processingTimeMs: null,
    });

    toast.success("Detection saved to history!");
  }, [detectedObjects, visionObjects, sceneSummary, captureFrame, addRecord]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const objectSummary = detectedObjects.reduce(
    (acc, obj) => {
      acc[obj.label] = (acc[obj.label] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const visionByCategory = visionObjects.reduce(
    (acc, obj) => {
      const cat = obj.category || "other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(obj);
      return acc;
    },
    {} as Record<string, VisionObject[]>
  );

  const totalDetected = detectedObjects.length + visionObjects.length;

  return (
    <div className="page-enter">
      <main className="container py-8">
        <div className="grid lg:grid-cols-[1fr_380px] gap-6">
          {/* Video Panel */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Camera className="h-6 w-6 text-[var(--primary)]" />
                Live Detection
              </h1>
              {totalDetected > 0 && (
                <span className="badge border-green-400/50 text-green-400 font-mono text-xs">
                  {totalDetected} objects found
                </span>
              )}
            </div>

            <div className="webcam-container aspect-video bg-[var(--card)] relative">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />

              {!isStreaming && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--card)]">
                  <Camera className="h-16 w-16 text-[var(--primary)]/30 mb-4" />
                  <p className="text-[var(--muted-foreground)]">Camera not started</p>
                </div>
              )}

              {isDetecting && !isPaused && <div className="scan-line" />}

              {isVisionScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--background)]/70 backdrop-blur-sm">
                  <div className="relative">
                    <Brain className="h-12 w-12 text-green-400" />
                    <Sparkles className="h-5 w-5 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
                  </div>
                  <p className="text-sm text-green-400 mt-3 font-semibold">AI Vision Scanning...</p>
                </div>
              )}

              {isStreaming && (
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <div className="px-2 py-1 rounded bg-[var(--background)]/80 backdrop-blur-sm border border-[var(--border)] text-xs font-mono">
                    <span className="text-[var(--primary)]">{fps}</span> FPS
                  </div>
                  {detectedObjects.length > 0 && (
                    <div className="px-2 py-1 rounded bg-[var(--background)]/80 backdrop-blur-sm border border-[var(--primary)]/30 text-xs font-mono">
                      <span className="text-[var(--primary)] font-bold">{detectedObjects.length}</span> fast
                      {visionObjects.length > 0 && (
                        <>
                          {" + "}
                          <span className="text-green-400 font-bold">{visionObjects.length}</span> AI
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {!isStreaming ? (
                <button
                  onClick={startCamera}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-medium hover:opacity-90"
                >
                  <Camera className="h-4 w-4" />
                  Start Camera
                </button>
              ) : (
                <>
                  <button
                    onClick={stopCamera}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-400/50 text-red-400 font-medium hover:bg-red-400/10"
                  >
                    <CameraOff className="h-4 w-4" />
                    Stop
                  </button>

                  {!isDetecting ? (
                    <button
                      onClick={startDetection}
                      disabled={isModelLoading}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-medium hover:opacity-90 disabled:opacity-50"
                    >
                      {isModelLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Scan className="h-4 w-4" />
                      )}
                      {isModelLoading ? "Loading Model..." : "Start Detection"}
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsPaused(!isPaused)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground)] font-medium hover:bg-[var(--secondary)]"
                    >
                      {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      {isPaused ? "Resume" : "Pause"}
                    </button>
                  )}

                  <button
                    onClick={runVisionScan}
                    disabled={isVisionScanning}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-green-400/50 text-green-400 font-medium hover:bg-green-400/10 disabled:opacity-50"
                  >
                    {isVisionScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                    AI Vision Scan
                  </button>

                  {totalDetected > 0 && (
                    <button
                      onClick={handleSave}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--primary)]/30 text-[var(--foreground)] font-medium hover:bg-[var(--secondary)]"
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Results Panel */}
          <div className="space-y-4">
            {/* Tab switcher */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--card)]/50 border border-[var(--border)]">
              <button
                onClick={() => setActiveTab("fast")}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === "fast"
                    ? "bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/30"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                Fast ({detectedObjects.length})
              </button>
              <button
                onClick={() => setActiveTab("ai")}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === "ai"
                    ? "bg-green-400/20 text-green-400 border border-green-400/30"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                <Brain className="h-3.5 w-3.5" />
                AI Vision ({visionObjects.length})
              </button>
            </div>

            {/* Scene summary */}
            {sceneSummary && activeTab === "ai" && (
              <div className="rounded-xl border border-green-400/20 bg-green-400/5 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-green-400">
                  <Sparkles className="h-3 w-3" />
                  Scene Summary
                </div>
                <p className="text-xs text-[var(--foreground)]/80 leading-relaxed">{sceneSummary}</p>
              </div>
            )}

            {/* Fast Detection Tab */}
            {activeTab === "fast" && (
              <>
                {detectedObjects.length === 0 ? (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]/50 p-8 text-center">
                    <Scan className="h-10 w-10 text-[var(--muted-foreground)]/30 mx-auto mb-3" />
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {isStreaming ? "Start detection to analyze" : "Start camera to begin"}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]/50 mt-2">COCO-SSD detects 80 common object types</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(objectSummary).map(([label, count]) => (
                        <span
                          key={label}
                          className="badge text-xs font-mono"
                          style={{ borderColor: getColor(label) + "80", color: getColor(label) }}
                        >
                          {label} x{count}
                        </span>
                      ))}
                    </div>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                      {detectedObjects.map((obj, i) => (
                        <div key={`${obj.label}-${i}`} className="rounded-lg border border-[var(--border)] bg-[var(--card)]/50 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm capitalize" style={{ color: getColor(obj.label) }}>
                              {obj.label}
                            </span>
                            <span className="text-xs font-mono text-[var(--muted-foreground)]">
                              {(obj.confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[var(--secondary)] overflow-hidden">
                            <div
                              className="h-full rounded-full confidence-bar"
                              style={{ width: `${obj.confidence * 100}%`, backgroundColor: getColor(obj.label) }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isStreaming && visionObjects.length === 0 && (
                  <div className="rounded-xl border border-green-400/20 bg-green-400/5 p-3 text-center">
                    <p className="text-xs text-green-400/80">
                      <Brain className="h-3 w-3 inline mr-1" />
                      Want to detect more? Click <strong>AI Vision Scan</strong> to identify thousands of object types
                    </p>
                  </div>
                )}
              </>
            )}

            {/* AI Vision Tab */}
            {activeTab === "ai" && (
              <>
                {visionObjects.length === 0 ? (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]/50 p-8 text-center">
                    <Brain className="h-10 w-10 text-[var(--muted-foreground)]/30 mx-auto mb-3" />
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {isVisionScanning ? "AI is analyzing..." : 'Click "AI Vision Scan" to identify all objects'}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]/50 mt-2">Identifies thousands of object categories</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {/* Gesture banner */}
                    {visionByCategory["gesture"] && (
                      <div className="rounded-xl border-2 border-yellow-400/40 bg-yellow-400/5 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{"\uD83D\uDC4B"}</span>
                          <span className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Hand Gestures Detected</span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {visionByCategory["gesture"].map((obj, i) => (
                            <div key={`gesture-${i}`} className="flex items-center gap-2 rounded-lg border border-yellow-400/30 bg-yellow-400/10 px-3 py-2">
                              <span className="text-2xl">{getGestureEmoji(obj.label)}</span>
                              <div>
                                <p className="text-sm font-semibold text-yellow-300">{obj.label}</p>
                                <p className="text-[10px] text-yellow-400/60">{(obj.confidence * 100).toFixed(0)}% confidence</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {Object.entries(visionByCategory)
                      .filter(([cat]) => cat !== "gesture")
                      .map(([category, objects]) => (
                        <div key={category} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(category) }} />
                            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: getCategoryColor(category) }}>
                              {category}
                            </span>
                            <span className="text-[10px] text-[var(--muted-foreground)] font-mono">({objects.length})</span>
                          </div>
                          {objects.map((obj, i) => (
                            <div key={`${obj.label}-${i}`} className="rounded-lg border border-[var(--border)] bg-[var(--card)]/50 p-3 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm" style={{ color: getCategoryColor(category) }}>
                                  {obj.label}
                                </span>
                                <span className="text-xs font-mono text-[var(--muted-foreground)]">
                                  {(obj.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full bg-[var(--secondary)] overflow-hidden">
                                <div
                                  className="h-full rounded-full confidence-bar"
                                  style={{ width: `${obj.confidence * 100}%`, backgroundColor: getCategoryColor(category) }}
                                />
                              </div>
                              {obj.description && (
                                <p className="text-[10px] text-[var(--muted-foreground)]/70 leading-relaxed">{obj.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}

            {/* Detection Engines info */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]/30 p-4 space-y-2">
              <h3 className="text-sm font-semibold text-[var(--muted-foreground)]">Detection Engines</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[var(--muted-foreground)]">Fast:</span>
                  <p className="font-mono">COCO-SSD</p>
                </div>
                <div>
                  <span className="text-[var(--muted-foreground)]">AI Vision:</span>
                  <p className="font-mono">GPT-4o</p>
                </div>
                <div>
                  <span className="text-[var(--muted-foreground)]">Fast Classes:</span>
                  <p className="font-mono">80 objects</p>
                </div>
                <div>
                  <span className="text-[var(--muted-foreground)]">AI Classes:</span>
                  <p className="font-mono text-green-400">Unlimited</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
