import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/geist";
import "@/components/arc/foundation.css";
import App from "./App";
import "./index.css";

const el = document.getElementById("root");
if (!el) {
  throw new Error("missing #root");
}
createRoot(el).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
