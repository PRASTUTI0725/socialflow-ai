import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (import.meta.env.DEV) {
  const overrides = ['log', 'error', 'warn'] as const;
  overrides.forEach((method) => {
    const original = console[method];
    console[method] = (...args) => {
      original.apply(console, args);
      try {
        const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        fetch('/__terminal_log', {
          method: 'POST',
          body: JSON.stringify({ type: method, message })
        }).catch(() => {});
      } catch(e) {}
    };
  });
}

createRoot(document.getElementById("root")!).render(<App />);
