import { Link } from "react-router-dom";
import { Camera, Upload, Brain, Zap, Eye, Scan, Hand } from "lucide-react";
import { useDetectionHistory } from "../hooks/useLocalStorage";

export default function Home() {
  const { stats } = useDetectionHistory();

  return (
    <main className="page-enter">
      {/* Hero */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--primary)]/5 to-transparent" />
        <div className="container relative text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/5 text-[var(--primary)] text-sm font-medium">
            <Zap className="h-4 w-4" />
            Powered by TensorFlow.js + GPT-4o Vision
          </div>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-tight">
            Real-Time{" "}
            <span className="text-[var(--primary)] neon-glow">AI Object</span>
            <br />
            Detection System
          </h1>

          <p className="text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto">
            Detect and identify objects in real-time using your webcam or uploaded images. Powered by COCO-SSD neural
            network with AI-generated scene descriptions and hand gesture recognition.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              to="/detect"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold hover:opacity-90 transition-opacity neon-border"
            >
              <Camera className="h-5 w-5" />
              Start Live Detection
            </Link>
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[var(--border)] text-[var(--foreground)] font-semibold hover:bg-[var(--secondary)] transition-colors"
            >
              <Upload className="h-5 w-5" />
              Upload Image
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-[var(--border)]">
        <div className="container">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { label: "Detections", value: stats.totalDetections, icon: Scan },
              { label: "Objects Found", value: stats.totalObjectsFound, icon: Eye },
              { label: "Webcam Sessions", value: stats.webcamSessions, icon: Camera },
              { label: "Uploads", value: stats.uploadSessions, icon: Upload },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="text-center space-y-2">
                <Icon className="h-6 w-6 text-[var(--primary)] mx-auto" />
                <p className="text-3xl font-bold font-mono text-[var(--primary)]">{value}</p>
                <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">
            Detection <span className="text-[var(--primary)]">Capabilities</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Zap,
                title: "Fast Detection",
                desc: "COCO-SSD detects 80 common objects in real-time with bounding boxes and confidence scores.",
                color: "#00e5ff",
              },
              {
                icon: Brain,
                title: "AI Vision Scan",
                desc: "GPT-4o Vision identifies thousands of objects including glasses, guitars, controllers, and more.",
                color: "#69f0ae",
              },
              {
                icon: Hand,
                title: "Gesture Recognition",
                desc: "Detects hand gestures like thumbs up, peace sign, OK sign, rock on, and many more.",
                color: "#ffeb3b",
              },
              {
                icon: Eye,
                title: "Scene Analysis",
                desc: "AI-powered scene descriptions that understand context and relationships between objects.",
                color: "#ea80fc",
              },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-3 hover:border-[var(--primary)]/30 transition-colors"
              >
                <Icon className="h-8 w-8" style={{ color }} />
                <h3 className="font-semibold text-lg">{title}</h3>
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
