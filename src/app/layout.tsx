import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Workspace Manager', description: 'A focused space for team projects and tasks.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
