import { DesktopObject } from '@/components/desktop-object';
import { WorldEntry } from '@/components/world-entry';
import Link from 'next/link';
import { currentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { signUp } from '@/app/actions';
export default async function Page() {
 if (await currentUser()) redirect('/');
 return <WorldEntry signup={true}><div className="auth-form-wrap"><div className="eyebrow">CREATE YOUR ACCOUNT</div><h2>HELLO, WORLD.</h2><p>A new space for you and your team.</p><form action={signUp} className="auth-form"><label>Full name<input name="name" placeholder="Your name" required maxLength={100}/></label><label>Email address<input type="email" name="email" placeholder="you@example.com" required/></label><label>Password<input type="password" name="password" minLength={8} placeholder="At least 8 characters" required/></label><button className="button primary full"><DesktopObject kind="key"/><span className="desktop-caption">Create account</span></button></form><div className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></div></div></WorldEntry>;
}
