export function isUserAdmin(email: string | undefined | null): boolean {
  if (!email) return false
  
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS || ''
  const admins = adminEmails.split(',').map(e => e.trim())
  
  return admins.includes(email)
}
