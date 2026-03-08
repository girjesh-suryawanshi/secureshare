import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

// Register the PWA service worker for offline caching and installation
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(<App />);
