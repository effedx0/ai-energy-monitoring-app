import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import "./index.css";
import App from "./App";

// Initialize Capacitor for mobile
if (Capacitor.isNativePlatform()) {
  console.log("Running on native platform:", Capacitor.getPlatform());
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
