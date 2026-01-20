/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Brand Identity Colors
                'kh-green': '#009245', // Primary (BIM)
                'kh-lime': '#8CC63F',  // Accent (AI, Active)
                'kh-dark-sidebar': '#1E2225', // Sidebar BG
                'kh-bg-main': '#FFFFFF', // Main Content BG
                'kh-text-main': '#25282B', // Main Text
                'kh-table-header': '#25282B',
                // Legacy mappings for compatibility (can be refactored later)
                primary: '#009245',
                secondary: '#8CC63F',
                neutral: '#9E9E9E',
                dark: '#25282B',
                background: '#FFFFFF',
                surface: '#FFFFFF',
            },
        },
    },
    plugins: [],
}
