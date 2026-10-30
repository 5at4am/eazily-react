import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import AppErrorBoundary from './components/AppErrorBoundary.jsx';
import "./styles.css";
import "./experience.css";
import "./partner.css";
import "./customer-theme.css";
import './product-polish.css';
import './design-system.css';
import './features/home/marketplace-home.css';
import './responsive.css';
import './app-redesign.css';

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppErrorBoundary><App /></AppErrorBoundary>
  </StrictMode>,
);
