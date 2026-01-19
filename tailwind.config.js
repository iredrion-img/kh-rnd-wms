/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#009540',
                secondary: '#8CC63F',
                neutral: '#808285',
                dark: '#1A1A1A',
                background: '#F3F4F6',
                surface: '#FFFFFF',
            },
        },
    },
    plugins: [],
}
