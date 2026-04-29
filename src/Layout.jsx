import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import {
  Gamepad2,
  Home,
  User,
  Settings,
  Menu,
  X,
  LogOut,
  Shield,
  Heart,
  Sun,
  Moon,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import NotificationsPanel from "@/components/NotificationsPanel";
import PremiumUsername from "@/components/ui/PremiumUsername";
import CraftyAssistant from "@/components/CraftyAssistant";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("playcraft-theme");
    return saved ? saved === "dark" : true;
  });

  React.useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
    localStorage.setItem("playcraft-theme", isDark ? "dark" : "light");
  }, [isDark]);

  const navItems = [
    { name: "Inicio",   path: "/",            icon: Home },
    { name: "Juegos",   path: "/games",        icon: Gamepad2 },
    { name: "Torneos",  path: "/tournaments",  icon: Trophy },
  ];

  if (user) {
    if (user.role !== "admin" && user.role !== "empresa") {
      navItems.push({ name: "Favoritos", path: "/favorites", icon: Heart });
      navItems.push({ name: "Amigos", path: "/friends", icon: Users });
    }
    navItems.push({ name: "Perfil", path: "/profile", icon: User });
    if (user.role === "admin") {
      navItems.push({ name: "Admin", path: "/admin", icon: Shield });
    } else if (user.role === "empresa") {
      navItems.push({ name: "Mi Empresa", path: "/company-dashboard", icon: Settings });
    }
  }

  const NavLinks = ({ mobile = false }) => (
    <div className={mobile ? "flex flex-col gap-2" : "hidden md:flex items-center gap-1"}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path ||
          (item.path === '/friends' && location.pathname.startsWith('/profile/'));
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => mobile && setIsOpen(false)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-300 ${
              isActive
                ? "bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-lg shadow-purple-500/25"
                : isDark
                  ? "text-gray-400 hover:text-white hover:bg-white/5"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="font-medium">{item.name}</span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#0a0a0f] text-white" : "bg-[#f0f1f8] text-gray-900"}`}>
      <style>{`
        :root {
          --background: 0 0% 4%;
          --foreground: 0 0% 98%;
          --card: 0 0% 6%;
          --card-foreground: 0 0% 98%;
          --popover: 0 0% 6%;
          --popover-foreground: 0 0% 98%;
          --primary: 270 80% 60%;
          --primary-foreground: 0 0% 98%;
          --secondary: 0 0% 12%;
          --secondary-foreground: 0 0% 98%;
          --muted: 0 0% 15%;
          --muted-foreground: 0 0% 65%;
          --accent: 180 80% 50%;
          --accent-foreground: 0 0% 98%;
          --destructive: 0 62% 50%;
          --destructive-foreground: 0 0% 98%;
          --border: 0 0% 15%;
          --input: 0 0% 15%;
          --ring: 270 80% 60%;
        }

        html.light {
          --background: 220 14% 96%;
          --foreground: 224 71% 4%;
          --card: 0 0% 100%;
          --card-foreground: 224 71% 4%;
          --popover: 0 0% 100%;
          --popover-foreground: 224 71% 4%;
          --primary: 270 80% 55%;
          --primary-foreground: 0 0% 98%;
          --secondary: 220 13% 91%;
          --secondary-foreground: 224 71% 4%;
          --muted: 220 14% 90%;
          --muted-foreground: 220 9% 40%;
          --accent: 180 70% 42%;
          --accent-foreground: 0 0% 98%;
          --destructive: 0 62% 50%;
          --destructive-foreground: 0 0% 98%;
          --border: 220 13% 82%;
          --input: 220 13% 82%;
          --ring: 270 80% 55%;
        }

        html.light body { background: #f0f1f8; color: #111827; }
        html.light .text-white { color: #111827 !important; }
        html.light .text-gray-300 { color: #374151 !important; }
        html.light .text-gray-400 { color: #4b5563 !important; }
        html.light .text-gray-500 { color: #6b7280 !important; }
        html.light .text-gray-600 { color: #9ca3af !important; }
        html.light [class*="bg-white/"] { background-color: rgba(0,0,0,0.05) !important; }
        html.light [class*="border-white/"] { border-color: rgba(0,0,0,0.1) !important; }
        html.light [class*="from-white/"] { --tw-gradient-from: rgba(0,0,0,0.04) !important; }
        html.light [class*="hover:text-white"]:hover { color: #111827 !important; }
        html.light .bg-gradient-to-r .text-white,
        html.light button.bg-gradient-to-r { color: #fff !important; }

        body { background: #0a0a0f; }

        .neon-glow {
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.3), 0 0 40px rgba(6, 182, 212, 0.2);
        }
        .neon-text {
          text-shadow: 0 0 10px rgba(139, 92, 246, 0.5), 0 0 20px rgba(6, 182, 212, 0.3);
        }
        .game-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 40px rgba(139, 92, 246, 0.2);
        }
        @keyframes pulse-neon {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .animate-pulse-neon {
          animation: pulse-neon 2s ease-in-out infinite;
        }
      `}</style>

      {/* Header */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-xl ${isDark ? "border-white/5 bg-[#0a0a0f]/80" : "border-gray-200 bg-white/90"}`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="p-2 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-500 neon-glow group-hover:scale-105 transition-transform">
                <Gamepad2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent neon-text">
                PlayCraft
              </span>
            </Link>
          </div>

          <NavLinks />

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDark(!isDark)}
              className={`${isDark ? "text-gray-400 hover:text-white hover:bg-white/5" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}`}
              title={isDark ? "Modo claro" : "Modo oscuro"}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            {user && <NotificationsPanel isDark={isDark} />}

            {user ? (
              <div className="hidden md:flex items-center gap-3">
                {user.premium_until && new Date(user.premium_until) > new Date()
                  ? <PremiumUsername name={user.full_name || user.email} className="text-sm" />
                  : <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{user.full_name || user.email}</span>}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className={`${isDark ? "text-gray-400 hover:text-white hover:bg-white/5" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}`}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Link to="/login" className="hidden md:flex">
                <Button className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90 border-0">
                  Iniciar Sesión / Registrarse
                </Button>
              </Link>
            )}

            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="text-white">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className={`w-72 ${isDark ? "bg-[#0f0f18] border-white/5" : "bg-white border-gray-200"}`}>
                <div className="flex flex-col h-full pt-8">
                  <NavLinks mobile />
                  <div className="mt-auto pb-8">
                    {user ? (
                      <div className="space-y-4">
                        <div className="px-4 py-3 bg-white/5 rounded-lg">
                          <p className="text-sm text-gray-400">Conectado como</p>
                          {user.premium_until && new Date(user.premium_until) > new Date()
                            ? <PremiumUsername name={user.full_name || user.email} className="font-medium" />
                            : <p className="font-medium truncate">{user.full_name || user.email}</p>}
                        </div>
                        <Button
                          variant="ghost"
                          onClick={logout}
                          className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Cerrar Sesión
                        </Button>
                      </div>
                    ) : (
                      <Link to="/login" onClick={() => setIsOpen(false)}>
                        <Button className="w-full bg-gradient-to-r from-purple-600 to-cyan-500">
                          Iniciar Sesión / Registrarse
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="min-h-[calc(100vh-80px)]">
        {children}
      </main>

      <CraftyAssistant />

      <footer className={`border-t py-8 mt-12 ${isDark ? "border-white/5" : "border-gray-200"}`}>
        <div className={`max-w-7xl mx-auto px-4 text-center text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          <p>© 2026 PlayCraft - Proyecto Universitario</p>
        </div>
      </footer>

    </div>
  );
}
