import { isTargetDomain } from "./config"

// 调试日志函数
const debug = (message: string, data?: any) => {
  console.log(`[API Hacker Debug] [Background] ${message}`, data || "")
}

// 初始化时记录
debug("Background script initialized")

// 设置侧边栏行为：启用点击图标打开的行为
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .then(() => debug("Side panel behavior set successfully"))
  .catch((error) => debug("Error setting side panel behavior:", error))

// 监听扩展安装/更新
chrome.runtime.onInstalled.addListener((details) => {
  debug("Extension installed/updated", details)
})

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debug("Received message from content script", { message, sender })

  if (message.type === "contentScriptReady") {
    debug("Content script ready message received", { tabId: sender.tab?.id })
    sendResponse({ status: "received" })
  } else if (message.type === "apiRequestUpdate") {
    debug("API request update received", {
      requestCount: message.data?.length,
      tabId: sender.tab?.id
    })
    sendResponse({ status: "received" })
  }

  return true // 保持消息通道开放以支持异步响应
})