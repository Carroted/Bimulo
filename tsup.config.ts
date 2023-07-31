import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["server/**/*.ts", "shared/**/*.ts", "client/**/*.ts"],
    minify: true,
    platform: "browser",
    target: "esnext",
    bundle: false,
    format: "esm",
    outDir: "dist",
    sourcemap: true,
})