'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, BarChart3, Repeat, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', icon: Home, label: 'Hoje' },
  { href: '/semana', icon: Calendar, label: 'Semana' },
  { href: '/dashboard', icon: BarChart3, label: 'Dashboard' },
  { href: '/temporada', icon: Repeat, label: 'Temporada' },
  { href: '/config', icon: Settings, label: 'Config' },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 px-4 py-2 z-50">
      <div className="max-w-lg mx-auto flex justify-around">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors',
                isActive
                  ? 'text-blue-500'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
