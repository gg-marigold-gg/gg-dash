import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // If you deploy to a subpath (e.g. GitHub Pages at /repo-name/),
  // set base: "/repo-name/" here. Leave as "/" for Vercel, Netlify, Cloudflare.
  base: "/",
});
