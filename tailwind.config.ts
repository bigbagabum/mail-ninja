import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202a",
        muted: "#627084",
        line: "#d9e0e8",
        panel: "#f7f9fb",
        accent: "#0f766e",
        warn: "#b45309",
        danger: "#b91c1c",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};

export default config;
