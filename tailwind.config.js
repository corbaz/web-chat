/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            animation: {
                typing: "typing 1s infinite ease-in-out",
            },
            keyframes: {
                typing: {
                    "0%": {
                        transform: "translateY(0px)",
                        opacity: 0.4,
                    },
                    "50%": {
                        transform: "translateY(-5px)",
                        opacity: 0.8,
                    },
                    "100%": {
                        transform: "translateY(0px)",
                        opacity: 0.4,
                    },
                },
            },
            transitionDelay: {
                200: "200ms",
                400: "400ms",
            },
        },
    },
    plugins: [],
};
