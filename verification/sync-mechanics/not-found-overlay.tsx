// Test-only composition: mount the real Not Found page behind the isolated
// credential-sync fixture. Never imports App or a live route tree.
import React from "react";
import { createRoot } from "react-dom/client";
import NotFound from "@/pages/not-found";
import "../credential-sync/fixture";

createRoot(document.getElementById("not-found")!).render(<NotFound />);
