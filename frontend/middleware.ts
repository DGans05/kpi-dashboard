import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// No auth middleware: Convex Auth is used in the app. Dashboard layout
// redirects unauthenticated users to /login via useCurrentUser.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
