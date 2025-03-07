import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeChanger() {
    const [darkMode, setDarkMode] = useState(
        localStorage.getItem("theme") === "dark"
    );

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    }, [darkMode]);

    return (
        <button
            onClick={() => setDarkMode(!darkMode)}
            className="absolute top-2 right-6 flex items-center gap-2   text-black dark:text-white px-4 py-2 rounded-full shadow-md transition-all duration-300 "
        >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}

        </button>
    );
}
