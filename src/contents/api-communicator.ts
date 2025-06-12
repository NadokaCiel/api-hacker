import type { PlasmoCSConfig } from "plasmo"

// 调试日志函数
const debug = (message: string, data?: any) => {
  console.log(`[API Hacker Debug] [Isolated World] ${message}`, data || "")
}

// 定义请求接口
interface ApiRequest {
  id: string
  timestamp: number
  method: string
  url: string
  requestHeaders: Record<string, string>
  requestBody: any
  responseStatus: number
  responseHeaders: Record<string, string>
  responseBody: any
  duration: number
  error?: string
}

// 监听来自 MAIN world 的事件
window.addEventListener("api-hacker-request", ((event: CustomEvent) => {
  const request = event.detail as ApiRequest
  debug("Received request from main world", request)
  
  // 通过 chrome.runtime.sendMessage 发送到扩展的其他部分
  chrome.runtime.sendMessage(
    { type: "apiRequestUpdate", data: [request] },
    (response) => {
      if (chrome.runtime.lastError) {
        debug("Error sending message:", chrome.runtime.lastError)
      } else {
        debug("Message sent successfully", response)
      }
    }
  )
}) as EventListener)

// 在页面加载完成时发送一个测试消息
window.addEventListener("load", () => {
  debug("Page loaded, sending test message")
  chrome.runtime.sendMessage({ type: "contentScriptReady" }, (response) => {
    if (chrome.runtime.lastError) {
      debug("Error sending test message:", chrome.runtime.lastError)
    } else {
      debug("Test message sent successfully", response)
    }
  })
})

debug("API communicator initialized in isolated world")

// export const config: PlasmoCSConfig = {
//   matches: ["https://test.cn.dentsu.pro/*"],  // 与 host_permissions 保持一致
//   world: "ISOLATED"
// } 