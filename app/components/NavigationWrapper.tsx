'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';

const DASHBOARD_PATH_PREFIXES = ['/dashboard', '/champions', '/matches', '/matchups'];

function shouldHideNavigation(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }

  return DASHBOARD_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default function NavigationWrapper() {
  const pathname = usePathname();

  if (shouldHideNavigation(pathname)) {
    return null;
  }

  return <Navigation />;
}


