import type { PlasmoCSConfig } from "plasmo"
import { sanitizeObject } from "~utils";

// 调试日志函数
const debug = (message: string, data?: any) => {
  console.log(`[API Hacker Debug] [Main World] ${message}`, data || "")
}



// 创建一个自定义事件用于与 Content Script 通信
const notifyContentScript = (request: any) => {
  const data = sanitizeObject(request);
  debug("XHR Request event data: ", data)
  window.dispatchEvent(new CustomEvent("api-hacker-request", {
    detail: data,
    bubbles: true,
  }))
}

// 拦截 XMLHttpRequest
const originalXHROpen = XMLHttpRequest.prototype.open
const originalXHRSend = XMLHttpRequest.prototype.send

XMLHttpRequest.prototype.open = function (method: string, url: string, ...args: any[]) {
  // debug("XHR Request intercepted", { method, url })
  this._requestData = {
    method,
    url,
    startTime: Date.now(),
    requestHeaders: {},
    requestBody: null
  }
  return originalXHROpen.apply(this, arguments)
}

XMLHttpRequest.prototype.send = function (body: any) {
  if (this._requestData) {
    this._requestData.requestBody = body

    this.addEventListener("load", function () {
      const endTime = Date.now()
      const duration = endTime - this._requestData.startTime

      let responseBody
      try {
        responseBody = JSON.parse(this.responseText)
      } catch {
        responseBody = this.responseText
      }

      const request = {
        id: Math.random().toString(36).slice(2),
        timestamp: this._requestData.startTime,
        method: this._requestData.method,
        url: this._requestData.url,
        requestHeaders: this._requestData.requestHeaders,
        requestBody: this._requestData.requestBody,
        responseStatus: this.status,
        responseHeaders: this.getAllResponseHeaders(),
        responseBody,
        duration
      }

      notifyContentScript(request)
    })

    this.addEventListener("error", function (error: any) {
      const request = {
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
      notifyContentScript(request)
    })
  }
  return originalXHRSend.apply(this, arguments)
}

// 拦截 fetch
const originalFetch = window.fetch
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  // debug("Fetch Request intercepted", { input, init })
  const startTime = Date.now()
  const requestData = {
    method: init?.method || "GET",
    url: typeof input === "string" ? input : input instanceof Request ? input.url : input.toString(),
    requestHeaders: init?.headers || {},
    requestBody: init?.body
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

    const request = {
      id: Math.random().toString(36).slice(2),
      timestamp: startTime,
      method: requestData.method,
      url: requestData.url,
      requestHeaders: requestData.requestHeaders,
      requestBody: requestData.requestBody,
      responseStatus: response.status,
      responseHeaders: Object.fromEntries(response.headers.entries()),
      responseBody,
      duration: endTime - startTime
    }

    notifyContentScript(request)
    return response
  } catch (error: any) {
    const request = {
      id: Math.random().toString(36).slice(2),
      timestamp: startTime,
      method: requestData.method,
      url: requestData.url,
      requestHeaders: requestData.requestHeaders,
      requestBody: requestData.requestBody,
      responseStatus: 0,
      responseHeaders: {},
      responseBody: null,
      duration: Date.now() - startTime,
      error: error.toString()
    }
    notifyContentScript(request)
    throw error
  }
}

debug("API listener initialized in main world")

export const config: PlasmoCSConfig = {
  // matches: ["https://test.cn.dentsu.pro/*"],  
  world: "MAIN"
} 