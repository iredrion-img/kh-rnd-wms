/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#03A63C',
                secondary: '#9DBF21',
                neutral: '#A6A6A6',
                dark: '#0D0D0D',
                background: '#F2F2F2',
                surface: '#FFFFFF',
            },
        },
    },
    plugins: [],
}
