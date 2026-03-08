import { useState } from "react";
import { Clock, Trash2, Camera, Upload, Eye, Brain, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useDetectionHistory, type DetectionRecord } from "../hooks/useLocalStorage";

const CATEGORY_COLORS: Record<string, string> = {
  gesture: "#ffeb3b", electronics: "#40c4ff", eyewear: "#ea80fc",
  instrument: "#ff6e40", clothing: "#ffd740", furniture: "#69f0ae",
  person: "#00e5ff", other: "#90a4ae",
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
}

export default function History() {
  const { history, deleteRecord, clearAll, stats } = useDetectionHistory();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleDelete = (id: string) => {
    deleteRecord(id);
    toast.success("Detection deleted");
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="page-enter">
      <main className="container py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="h-6 w-6 text-[var(--primary)]" />
              Detection History
            </h1>
            {history.length > 0 && (
              <div className="flex items-center gap-2">
                {showClearConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-red-400">Clear all?</span>
                    <button
                      onClick={() => { clearAll(); setShowClearConfirm(false); toast.success("History cleared"); }}
                      className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600"
                    >
                      Yes, clear
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm font-medium hover:bg-[var(--secondary)]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-400/30 text-red-400 text-sm font-medium hover:bg-red-400/10"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Clear All
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Detections", value: stats.totalDetections, icon: Eye },
              { label: "Objects Found", value: stats.totalObjectsFound, icon: Brain },
              { label: "Webcam", value: stats.webcamSessions, icon: Camera },
              { label: "Uploads", value: stats.uploadSessions, icon: Upload },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-center space-y-1">
                <Icon className="h-5 w-5 text-[var(--primary)] mx-auto" />
                <p className="text-2xl font-bold font-mono text-[var(--primary)]">{value}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
              </div>
            ))}
          </div>

          {/* History List */}
          {history.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
              <Clock className="h-12 w-12 text-[var(--muted-foreground)]/30 mx-auto mb-4" />
              <p className="text-lg text-[var(--muted-foreground)]">No detections saved yet</p>
              <p className="text-sm text-[var(--muted-foreground)]/60 mt-1">
                Use Live Detect or Upload to start analyzing images
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((record: DetectionRecord) => {
                const isExpanded = expandedId === record.id;
                return (
                  <div
                    key={record.id}
                    className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden"
                  >
                    <div
                      className="flex items-center gap-4 p-4 cursor-pointer hover:bg-[var(--secondary)]/50 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : record.id)}
                    >
                      {/* Thumbnail */}
                      <div className="w-16 h-16 rounded-lg bg-[var(--secondary)] overflow-hidden flex-shrink-0">
                        {record.imageDataUrl ? (
                          <img src={record.imageDataUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Camera className="h-6 w-6 text-[var(--muted-foreground)]/30" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {record.sourceType === "webcam" ? (
                            <Camera className="h-4 w-4 text-[var(--primary)]" />
                          ) : (
                            <Upload className="h-4 w-4 text-green-400" />
                          )}
                          <span className="text-sm font-semibold capitalize">{record.sourceType}</span>
                          <span className="badge text-[10px] font-mono border-[var(--primary)]/30 text-[var(--primary)]">
                            {record.objectCount} objects
                          </span>
                        </div>
                        <p className="text-xs text-[var(--muted-foreground)]">{formatDate(record.createdAt)}</p>
                        {record.sceneSummary && (
                          <p className="text-xs text-[var(--muted-foreground)]/70 mt-1 truncate">{record.sceneSummary}</p>
                        )}
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }}
                        className="p-2 rounded-lg hover:bg-red-400/10 hover:text-red-400 transition-colors text-[var(--muted-foreground)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-[var(--border)] p-4 space-y-4">
                        {record.imageDataUrl && (
                          <img src={record.imageDataUrl} alt="" className="w-full max-h-[400px] object-contain rounded-lg" />
                        )}

                        {record.sceneSummary && (
                          <div className="rounded-lg border border-green-400/20 bg-green-400/5 p-3">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-green-400 mb-1">
                              <Sparkles className="h-3 w-3" />Scene Summary
                            </div>
                            <p className="text-xs text-[var(--foreground)]/80">{record.sceneSummary}</p>
                          </div>
                        )}

                        {/* COCO-SSD objects */}
                        {record.objects.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-[var(--primary)] mb-2">Fast Detection (COCO-SSD)</h4>
                            <div className="flex flex-wrap gap-2">
                              {record.objects.map((obj, i) => (
                                <span key={i} className="badge text-[10px] font-mono border-[var(--primary)]/30 text-[var(--primary)]">
                                  {obj.label} {(obj.confidence * 100).toFixed(0)}%
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Vision objects */}
                        {record.visionObjects.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-green-400 mb-2">AI Vision Detection</h4>
                            <div className="flex flex-wrap gap-2">
                              {record.visionObjects.map((obj, i) => (
                                <span
                                  key={i}
                                  className="badge text-[10px] font-mono"
                                  style={{ borderColor: getCategoryColor(obj.category) + "50", color: getCategoryColor(obj.category) }}
                                >
                                  {obj.label} {(obj.confidence * 100).toFixed(0)}%
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {record.processingTimeMs && (
                          <p className="text-[10px] font-mono text-[var(--muted-foreground)]">
                            Processing time: {record.processingTimeMs}ms
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-[var(--muted-foreground)]/50 text-center">
            History is stored locally in your browser. Max 50 records.
          </p>
        </div>
      </main>
    </div>
  );
}
