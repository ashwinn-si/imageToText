import ThemeChanger from "./Components/ThemeChanger";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import HomePage from "./Page/HomePage";

function App() {
    return (
        <div className="overflow-x-hidden">
            <ThemeChanger />    
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                </Routes>
            </BrowserRouter>
        </div>
    );
}

export default App;
