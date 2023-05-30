/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        fuseBlue: {
          light: "#1b3a54",
          lighter: "#4e667a",
          DEFAULT: "#022441",
          dark: "#021d34",
        },
        fuseYellow: {
          light: "#c7af6a",
          DEFAULT: "#af8c2a",
          dark: "#695419",
          lightest: "#f7f4ea",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
