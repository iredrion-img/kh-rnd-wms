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
                'kh-bg-main': '#F3F4F6', // Main Content BG (Light Gray)
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
            fontFamily: {
                sans: ['Pretendard', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
                'slide-up': 'slide-up 0.5s ease-out forwards',
                'fade-in': 'fade-in 0.5s ease-out forwards',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                'pulse-glow': {
                    '0%, 100%': { opacity: 1, filter: 'brightness(1)' },
                    '50%': { opacity: 0.8, filter: 'brightness(1.2)' },
                },
                'slide-up': {
                    '0%': { transform: 'translateY(20px)', opacity: 0 },
                    '100%': { transform: 'translateY(0)', opacity: 1 },
                },
                'fade-in': {
                    '0%': { opacity: 0 },
                    '100%': { opacity: 1 },
                }
            },
        },
    },
    plugins: [],
}
