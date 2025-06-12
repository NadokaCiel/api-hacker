import React, { useEffect, useState } from "react"

// 定义请求和响应的数据结构
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

// 存储 API 请求记录
const apiRequests: ApiRequest[] = []
const MAX_REQUESTS = 100 // 最大存储请求数

// 创建自定义事件用于通知 UI 更新
const createCustomEvent = (request: ApiRequest) => {
  const event = new CustomEvent("apiRequestUpdate", {
    detail: { requests: [...apiRequests] }
  })
  document.dispatchEvent(event)
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

// 调试日志函数
const debug = (message: string, data?: any) => {
  console.log(`[API Hacker Debug] [Sidebar] ${message}`, data || "")
}

// 初始化时记录
debug("Sidebar component initialized")

export function ApiSidebar() {
  const [requests, setRequests] = useState<ApiRequest[]>([])
  const [filter, setFilter] = useState("")
  const [selectedRequest, setSelectedRequest] = useState<ApiRequest | null>(
    null
  )

  useEffect(() => {
    debug("Setting up message listener")

    const messageListener = (
      message: any,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ) => {
      debug("Received message in sidebar", { message, sender })

      if (message.type === "apiRequestUpdate") {
        debug("Updating requests in sidebar", {
          requestCount: message.data?.length,
          tabId: sender.tab?.id
        })
        if (message?.data) {
          // setRequests(message.data || [])
          setRequests(prev => [...(message.data || []), ...prev]);
        }
        sendResponse({ status: "received" })
      }

      return true // 保持消息通道开放以支持异步响应
    }

    chrome.runtime.onMessage.addListener(messageListener)
    debug("Message listener set up successfully")

    // 发送初始化消息
    chrome.runtime.sendMessage({ type: "sidebarReady" }, (response) => {
      if (chrome.runtime.lastError) {
        debug("Error sending sidebar ready message:", chrome.runtime.lastError)
      } else {
        debug("Sidebar ready message sent successfully", response)
      }
    })

    return () => {
      debug("Cleaning up message listener")
      chrome.runtime.onMessage.removeListener(messageListener)
    }
  }, [])

  const filteredRequests = requests.filter((req) => {
    const searchStr = `${req?.url} ${req?.method}`.toLowerCase()
    return searchStr?.includes(filter?.toLowerCase())
  })

  return (
    <div className="plasmo-h-screen plasmo-flex plasmo-flex-col plasmo-bg-gray-50 plasmo-overflow-hidden">
      {/* 搜索区域 */}
      <div className="plasmo-flex-none plasmo-bg-white plasmo-border-b plasmo-border-gray-200">
        <div className="plasmo-px-4 plasmo-py-2 plasmo-flex plasmo-items-center plasmo-justify-between plasmo-gap-2">
          <div className="plasmo-relative plasmo-flex-1">
            <input
              type="text"
              placeholder="搜索 URL 或方法..."
              className="plasmo-w-full plasmo-h-8 plasmo-pl-8 plasmo-pr-3 plasmo-text-sm plasmo-bg-gray-50 plasmo-border plasmo-border-gray-200 plasmo-rounded-md focus:plasmo-ring-1 focus:plasmo-ring-blue-500 focus:plasmo-border-blue-500 plasmo-outline-none"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <svg
              className="plasmo-absolute plasmo-left-2 plasmo-top-2 plasmo-w-4 plasmo-h-4 plasmo-text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <span className="plasmo-text-xs plasmo-text-gray-500 plasmo-bg-gray-100 plasmo-px-2 plasmo-py-1 plasmo-rounded plasmo-whitespace-nowrap">
            {requests.length} 个请求
          </span>
        </div>
      </div>

      {/* 列表区域 */}
      <div className="plasmo-flex-none plasmo-h-[300px] plasmo-bg-white plasmo-border-b plasmo-border-gray-200">
        <div className="plasmo-h-full plasmo-overflow-y-auto">
          {filteredRequests
            .filter((req) => req != null)
            .map((request) => (
              <div
                key={request?.id || Math.random().toString(36).substr(2, 9)}
                className={`plasmo-p-3 plasmo-border-b plasmo-border-gray-200 plasmo-cursor-pointer hover:plasmo-bg-gray-50 ${
                  selectedRequest?.id === request?.id ? "plasmo-bg-blue-50" : ""
                }`}
                onClick={() => request && setSelectedRequest(request)}>
                <div className="plasmo-flex plasmo-justify-between plasmo-items-start">
                  <div className="plasmo-flex-1 plasmo-min-w-0">
                    <div className="plasmo-flex plasmo-items-center plasmo-space-x-2">
                      <span
                        className={`plasmo-px-2 plasmo-py-0.5 plasmo-text-xs plasmo-font-medium plasmo-rounded ${
                          request.method === "GET"
                            ? "plasmo-bg-green-100 plasmo-text-green-800"
                            : request.method === "POST"
                              ? "plasmo-bg-blue-100 plasmo-text-blue-800"
                              : request.method === "PUT"
                                ? "plasmo-bg-yellow-100 plasmo-text-yellow-800"
                                : request.method === "DELETE"
                                  ? "plasmo-bg-red-100 plasmo-text-red-800"
                                  : "plasmo-bg-gray-100 plasmo-text-gray-800"
                        }`}>
                        {request.method}
                      </span>
                      <span
                        className={`plasmo-px-2 plasmo-py-0.5 plasmo-text-xs plasmo-font-medium plasmo-rounded ${
                          request.responseStatus >= 200 &&
                          request.responseStatus < 300
                            ? "plasmo-bg-green-100 plasmo-text-green-800"
                            : request.responseStatus >= 400
                              ? "plasmo-bg-red-100 plasmo-text-red-800"
                              : "plasmo-bg-yellow-100 plasmo-text-yellow-800"
                        }`}>
                        {request.responseStatus}
                      </span>
                    </div>
                    <div className="plasmo-mt-1 plasmo-text-sm plasmo-text-gray-900 plasmo-truncate">
                      {request.url}
                    </div>
                    <div className="plasmo-mt-1 plasmo-text-xs plasmo-text-gray-500">
                      {new Date(request.timestamp).toLocaleTimeString()} ·{" "}
                      {request.duration}ms
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* 详情区域 */}
      {selectedRequest && (
        <div className="plasmo-flex-1 plasmo-bg-white plasmo-min-h-0">
          <div className="plasmo-h-full plasmo-overflow-y-auto">
            <div className="plasmo-p-4">
              <div className="plasmo-mb-4">
                <h3 className="plasmo-text-sm plasmo-font-medium plasmo-text-gray-900">
                  请求详情
                </h3>
                <div className="plasmo-mt-2 plasmo-space-y-4">
                  <div>
                    <h4 className="plasmo-text-xs plasmo-font-medium plasmo-text-gray-500">
                      请求头
                    </h4>
                    <pre className="plasmo-mt-1 plasmo-p-2 plasmo-bg-gray-50 plasmo-rounded plasmo-text-xs plasmo-font-mono plasmo-overflow-x-auto">
                      {JSON.stringify(selectedRequest.requestHeaders, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h4 className="plasmo-text-xs plasmo-font-medium plasmo-text-gray-500">
                      请求体
                    </h4>
                    <pre className="plasmo-mt-1 plasmo-p-2 plasmo-bg-gray-50 plasmo-rounded plasmo-text-xs plasmo-font-mono plasmo-overflow-x-auto">
                      {JSON.stringify(selectedRequest.requestBody, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h4 className="plasmo-text-xs plasmo-font-medium plasmo-text-gray-500">
                      响应头
                    </h4>
                    <pre className="plasmo-mt-1 plasmo-p-2 plasmo-bg-gray-50 plasmo-rounded plasmo-text-xs plasmo-font-mono plasmo-overflow-x-auto">
                      {JSON.stringify(selectedRequest.responseHeaders, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h4 className="plasmo-text-xs plasmo-font-medium plasmo-text-gray-500">
                      响应体
                    </h4>
                    <pre className="plasmo-mt-1 plasmo-p-2 plasmo-bg-gray-50 plasmo-rounded plasmo-text-xs plasmo-font-mono plasmo-overflow-x-auto">
                      {JSON.stringify(selectedRequest.responseBody, null, 2)}
                    </pre>
                  </div>
                  {selectedRequest.error && (
                    <div>
                      <h4 className="plasmo-text-xs plasmo-font-medium plasmo-text-red-500">
                        错误
                      </h4>
                      <pre className="plasmo-mt-1 plasmo-p-2 plasmo-bg-red-50 plasmo-rounded plasmo-text-xs plasmo-font-mono plasmo-overflow-x-auto plasmo-text-red-600">
                        {selectedRequest.error}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
