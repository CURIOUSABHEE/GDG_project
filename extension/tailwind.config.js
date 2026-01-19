/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./popup.html",
        "./dashboard.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                camel: '#AA8F66',
                apricot: '#ED9B40',
                cream: '#FFEEDB',
                mint: '#61C9A8',
                cherry: '#BA3B46',
                primary: '#ED9B40', // Golden Apricot
                secondary: '#61C9A8', // Mint Leaf
                dark: '#0f172a', // Slate 900
                light: '#FFEEDB', // Antique White
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
