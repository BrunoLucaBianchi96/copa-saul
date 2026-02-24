const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export function generateEditToken(): string {
  let token = ''
  for (let i = 0; i < 8; i++) {
    token += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return token
}
