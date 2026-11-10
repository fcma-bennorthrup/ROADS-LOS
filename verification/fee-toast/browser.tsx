import React from "react";
import { createRoot } from "react-dom/client";
import { FeesContent } from "../../client/src/components/loan/FeesContent";
import { Toaster } from "../../client/src/components/ui/toaster";

createRoot(document.getElementById("root")!).render(
  <><FeesContent /><Toaster /></>,
);
