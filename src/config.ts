// 从环境变量中获取目标域名
export const TARGET_DOMAIN = process.env.PLASMO_PUBLIC_TARGET_DOMAIN || "unknown"

export const isTargetDomain = (url: string): boolean => {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname === TARGET_DOMAIN
  } catch {
    return false
  }
}
