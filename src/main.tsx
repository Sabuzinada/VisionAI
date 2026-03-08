import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { Toaster } from "sonner";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: "#0a1628",
          border: "1px solid rgba(0, 229, 255, 0.2)",
          color: "#e0e0e0",
        },
      }}
    />
    <App />
  </React.StrictMode>
);
