import { DesktopObject } from '@/components/desktop-object';
import { WorldEntry } from '@/components/world-entry';
import Link from 'next/link';
import { currentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { signIn } from '@/app/actions';
export default async function Page() {
 if (await currentUser()) redirect('/');
 return <WorldEntry signup={false}><div className="auth-form-wrap"><div className="eyebrow">SIGN IN TO YOUR WORKSPACE</div><h2>WELCOME BACK.</h2><p>Your world is right where you left it.</p><form action={signIn} className="auth-form"><label>Email address<input type="email" name="email" placeholder="you@example.com" required/></label><label>Password<input type="password" name="password" placeholder="Enter your password" required/></label><button className="button primary full"><DesktopObject kind="key"/><span className="desktop-caption">Sign in</span></button></form><div className="auth-switch">New here? <Link href="/signup">Create an account</Link></div></div></WorldEntry>;
}
