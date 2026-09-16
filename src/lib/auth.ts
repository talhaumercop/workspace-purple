import 'server-only';
import { randomBytes, createHash, scryptSync, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { query } from './db';

export type User = { id: string; name: string; email: string; avatar_url: string | null };
const COOKIE = 'wm_session';
const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, 'hex');
  const b = scryptSync(password, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex');
  await query('INSERT INTO sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval \'30 days\')', [userId, hashToken(token)]);
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
}
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const rows = await query<User>('SELECT u.id,u.name,u.email,u.avatar_url FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()', [hashToken(token)]);
  return rows[0] ?? null;
}
export async function requireUser() { const user = await currentUser(); if (!user) redirect('/login'); return user; }
export async function destroySession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (token) await query('DELETE FROM sessions WHERE token_hash=$1', [hashToken(token)]);
  (await cookies()).delete(COOKIE);
}
export function invitationHash(token: string) { return hashToken(token); }
