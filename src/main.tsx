import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./assets/styles.css";
import { disposeThemeLifecycle, initializeThemeLifecycle } from "./theme/themeLifecycle.ts";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

initializeThemeLifecycle();

if (import.meta.hot) {
  import.meta.hot.dispose(() => disposeThemeLifecycle());
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
