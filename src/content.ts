import type { PlasmoCSConfig } from "plasmo"

// 调试日志函数
const debug = (message: string, data?: any) => {
  console.log(`[API Hacker Debug] [Content Script] ${message}`, data || "")
}

// 初始化时记录
debug("Content script initialized")

// 定义请求数据结构
interface ApiRequest {
  id: string
  url: string
  method: string
  requestHeaders: Record<string, string>
  requestBody: any
  responseHeaders: Record<string, string>
  responseBody: any
  responseStatus: number
  timestamp: number
  duration: number
  error?: string
}

// 存储捕获的请求
const capturedRequests: ApiRequest[] = []
const MAX_REQUESTS = 100

// 发送请求更新到侧边栏
const sendRequestUpdate = (requests: ApiRequest[]) => {
  debug("Sending request update", { requestCount: requests.length })
  try {
    chrome.runtime.sendMessage({ type: "apiRequestUpdate", data: requests }, (response) => {
      if (chrome.runtime.lastError) {
        debug("Error sending message:", chrome.runtime.lastError)
      } else {
        debug("Message sent successfully", response)
      }
    })
  } catch (error) {
    debug("Error in sendRequestUpdate:", error)
  }
}

// 扩展 XMLHttpRequest 类型
declare global {
  interface XMLHttpRequest {
    _requestData?: {
      method: string
      url: string
      startTime: number
      requestHeaders: Record<string, string>
      requestBody: any
    }
  }
}

// 格式化请求体
const formatRequestBody = (body: any): any => {
  if (!body) return null
  if (typeof body === "string") {
    try {
      return JSON.parse(body)
    } catch {
      return body
    }
  }
  return body
}

// 拦截 XMLHttpRequest
const setupXHRInterceptor = () => {
  const originalXHROpen = XMLHttpRequest.prototype.open
  const originalXHRSend = XMLHttpRequest.prototype.send

  XMLHttpRequest.prototype.open = function (method: string, url: string, ...args: any[]) {
    debug("XHR Request intercepted", { method, url })
    this._requestData = {
      method,
      url,
      startTime: Date.now(),
      requestHeaders: {},
      requestBody: null
    }
    return originalXHROpen.apply(this, arguments as any)
  }

  XMLHttpRequest.prototype.send = function (body: any) {
    if (this._requestData) {
      this._requestData.requestBody = formatRequestBody(body)

      // 记录请求头
      const requestHeaders: Record<string, string> = {}
      this.getAllResponseHeaders()
        .split("\r\n")
        .forEach((line) => {
          const [key, value] = line.split(": ")
          if (key && value) {
            requestHeaders[key.toLowerCase()] = value
          }
        })
      this._requestData.requestHeaders = requestHeaders

      this.addEventListener("load", function () {
        const endTime = Date.now()
        const duration = endTime - this._requestData.startTime

        let responseBody
        try {
          responseBody = JSON.parse(this.responseText)
        } catch {
          responseBody = this.responseText
        }

        const responseHeaders: Record<string, string> = {}
        this.getAllResponseHeaders()
          .split("\r\n")
          .forEach((line) => {
            const [key, value] = line.split(": ")
            if (key && value) {
              responseHeaders[key.toLowerCase()] = value
            }
          })

        const request: ApiRequest = {
          id: Math.random().toString(36).slice(2),
          timestamp: this._requestData.startTime,
          method: this._requestData.method,
          url: this._requestData.url,
          requestHeaders: this._requestData.requestHeaders,
          requestBody: this._requestData.requestBody,
          responseStatus: this.status,
          responseHeaders,
          responseBody,
          duration
        }

        sendRequestUpdate([request])
      })

      this.addEventListener("error", function (error) {
        const request: ApiRequest = {
          id: Math.random().toString(36).slice(2),
          timestamp: this._requestData.startTime,
          method: this._requestData.method,
          url: this._requestData.url,
          requestHeaders: this._requestData.requestHeaders,
          requestBody: this._requestData.requestBody,
          responseStatus: this.status,
          responseHeaders: {},
          responseBody: null,
          duration: Date.now() - this._requestData.startTime,
          error: error.toString()
        }
        sendRequestUpdate([request])
      })
    }
    return originalXHRSend.apply(this, arguments as any)
  }
}

// 拦截 fetch
const setupFetchInterceptor = () => {
  const originalFetch = window.fetch

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    debug("Fetch Request intercepted", { input, init })
    const [resource, config] = [input, init]
    const startTime = Date.now()
    const requestData = {
      method: config?.method || "GET",
      url:
        typeof resource === "string"
          ? resource
          : resource instanceof Request
            ? resource.url
            : resource.toString(),
      requestHeaders: config?.headers || {},
      requestBody: formatRequestBody(config?.body)
    }

    try {
      const response = await originalFetch(input, init)
      const responseClone = response.clone()
      const endTime = Date.now()

      let responseBody
      try {
        responseBody = await responseClone.json()
      } catch {
        try {
          responseBody = await responseClone.text()
        } catch {
          responseBody = null
        }
      }

      const request: ApiRequest = {
        id: Math.random().toString(36).slice(2),
        timestamp: startTime,
        method: requestData.method,
        url: requestData.url,
        requestHeaders: requestData.requestHeaders as Record<string, string>,
        requestBody: requestData.requestBody,
        responseStatus: response.status,
        responseHeaders: Object.fromEntries(response.headers.entries()),
        responseBody,
        duration: endTime - startTime
      }

      sendRequestUpdate([request])
      return response
    } catch (error) {
      const request: ApiRequest = {
        id: Math.random().toString(36).slice(2),
        timestamp: startTime,
        method: requestData.method,
        url: requestData.url,
        requestHeaders: requestData.requestHeaders as Record<string, string>,
        requestBody: requestData.requestBody,
        responseStatus: 0,
        responseHeaders: {},
        responseBody: null,
        duration: Date.now() - startTime,
        error: error.toString()
      }
      sendRequestUpdate([request])
      throw error
    }
  }
}

// 初始化拦截器
setupXHRInterceptor()
setupFetchInterceptor()

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

export const config: PlasmoCSConfig = {
  // matches: [],
  world: "MAIN"
} 