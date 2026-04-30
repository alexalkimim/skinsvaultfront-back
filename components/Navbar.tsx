"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, User, Menu, X, Calculator } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const hideNavbar = ['/login', '/cadastro', '/recuperar-senha'].includes(pathname);
  if (hideNavbar) return null;

  const navLinks = [
    { name: 'Entrada', href: '/entrada', icon: LayoutDashboard }, // <-- Alterado aqui!
    { name: 'Cotador', href: '/cotador', icon: Calculator },
    { name: 'Perfil', href: '/perfil', icon: User },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/60 backdrop-blur-xl border-b border-white/3">
      <div className="max-w-360 mx-auto flex justify-between items-center px-8 h-20">
        <Link href="/" className="flex items-center group">
          <h1 className="text-lg font-bold tracking-[0.2em] uppercase text-white transition-opacity group-hover:opacity-80">
            SKINVAULT
          </h1>
        </Link>

        <div className="hidden md:flex items-center gap-10">
          <div className="flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-[11px] font-semibold uppercase tracking-[0.15em] transition-all duration-300 ${
                    isActive ? 'text-purple-500' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          <div className="h-4 w-px bg-white/10" />

          <Link
            href="/login"
            className="text-zinc-400 hover:text-white transition-all text-[11px] font-semibold uppercase tracking-[0.15em]"
          >
            Sair
          </Link>
        </div>

        <button
          className="md:hidden text-zinc-400 hover:text-white transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#080809] border-b border-white/3 p-8 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className={`block text-xs font-semibold uppercase tracking-widest ${
                  isActive ? 'text-purple-500' : 'text-zinc-400'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
          <Link
            href="/login"
            onClick={() => setIsMenuOpen(false)}
            className="block text-xs font-semibold uppercase tracking-widest text-zinc-500"
          >
            Sair do Cofre
          </Link>
        </div>
      )}
    </nav>
  );
}