import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import Login from "../components/(auth)/Login";
import Signup from "../components/(auth)/Signup";
import Home from "../components/Home";
import Transactions from "../components/Transactions";
import Contact from "../components/Contact";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuthStore } from "../store/authStore";

export default function Default() {
    const accessToken = useAuthStore((state) => state.accessToken)

    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/login"
                    element={
                        accessToken ? (
                            <Navigate to="/" />
                        ) : (
                            <Login />
                        )
                    }
                />
                <Route
                    path="/signup"
                    element={
                        accessToken ? (
                            <Navigate to="/" />
                        ) : (
                            <Signup />
                        )
                    }
                />

                <Route
                    element={
                        accessToken ? (
                            <div className="min-h-screen overflow-y-auto bg-[#88afed19]">
                                <div className="pt-6">
                                    <Header />
                                </div>
                                <div className="py-8 pb-32 flex justify-center">
                                    <div className="w-full max-w-2xl px-4">
                                        <Outlet />
                                    </div>
                                </div>
                                <div className="pb-6">
                                    <Footer />
                                </div>
                            </div>
                        ) : (
                            <Navigate to="/login" />
                        )
                    }
                >
                    <Route path="/" element={<Home />} />
                    <Route path="/transactions" element={<Transactions />} />
                    <Route path="/contact" element={<Contact />} />
                </Route>

                <Route
                    path="*"
                    element={<Navigate to={accessToken ? "/" : "/login"} />}
                />
            </Routes>
        </BrowserRouter>
    );
}