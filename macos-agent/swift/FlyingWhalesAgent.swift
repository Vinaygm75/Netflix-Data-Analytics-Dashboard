//
//  FlyingWhalesAgent.swift
//  Flying Whales Ad Films - Native macOS Activity Agent
//  Target Architecture: Apple Silicon (arm64 - M2 Pro, M4, etc.)
//  Privacy Guarantee: Zero keystroke logging, zero screenshots, zero surveillance.
//

import Cocoa
import Foundation
import CoreGraphics
import IOKit
import Darwin

enum ActivityState: String, Codable {
    case active = "ACTIVE"
    case inactive = "INACTIVE"
    case sleeping = "SLEEPING"
    case locked = "LOCKED"
    case offline = "OFFLINE"
}

enum InputType: String, Codable {
    case keyboard = "keyboard"
    case mouse = "mouse"
    case none = "none"
}

struct AgentConfig: Decodable {
    var deviceId: String
    var deviceSecret: String
    var serverUrl: String
    var employeeId: String?
    var employeeName: String?
    var inactivityThresholdSeconds: Double = 300.0 // 5 minutes default
    var heartbeatIntervalSeconds: Double = 30.0    // 30 seconds default

    enum CodingKeys: String, CodingKey {
        case deviceId
        case deviceSecret
        case serverUrl
        case employeeId
        case employeeName
        case inactivityThresholdSeconds
        case heartbeatIntervalSeconds
        
        case device_id
        case device_secret
        case server_url
        case inactivity_threshold_seconds
        case heartbeat_interval_seconds
    }

    init(
        deviceId: String,
        deviceSecret: String,
        serverUrl: String,
        employeeId: String? = nil,
        employeeName: String? = nil,
        inactivityThresholdSeconds: Double = 300.0,
        heartbeatIntervalSeconds: Double = 30.0
    ) {
        self.deviceId = deviceId
        self.deviceSecret = deviceSecret
        self.serverUrl = serverUrl
        self.employeeId = employeeId
        self.employeeName = employeeName
        self.inactivityThresholdSeconds = inactivityThresholdSeconds
        self.heartbeatIntervalSeconds = heartbeatIntervalSeconds
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        // deviceId (or device_id)
        if let id = try? container.decode(String.self, forKey: .deviceId) {
            self.deviceId = id
        } else if let id = try? container.decode(String.self, forKey: .device_id) {
            self.deviceId = id
        } else {
            throw DecodingError.keyNotFound(
                CodingKeys.deviceId,
                DecodingError.Context(codingPath: container.codingPath, debugDescription: "Missing deviceId in config.json")
            )
        }

        // deviceSecret (or device_secret)
        if let sec = try? container.decode(String.self, forKey: .deviceSecret) {
            self.deviceSecret = sec
        } else if let sec = try? container.decode(String.self, forKey: .device_secret) {
            self.deviceSecret = sec
        } else {
            throw DecodingError.keyNotFound(
                CodingKeys.deviceSecret,
                DecodingError.Context(codingPath: container.codingPath, debugDescription: "Missing deviceSecret in config.json")
            )
        }

        // serverUrl (or server_url)
        if let url = try? container.decode(String.self, forKey: .serverUrl) {
            self.serverUrl = url
        } else if let url = try? container.decode(String.self, forKey: .server_url) {
            self.serverUrl = url
        } else {
            throw DecodingError.keyNotFound(
                CodingKeys.serverUrl,
                DecodingError.Context(codingPath: container.codingPath, debugDescription: "Missing serverUrl in config.json")
            )
        }

        // employeeId / employeeName (optional in Admin config)
        self.employeeId = (try? container.decodeIfPresent(String.self, forKey: .employeeId)) ?? nil
        self.employeeName = (try? container.decodeIfPresent(String.self, forKey: .employeeName)) ?? nil

        // inactivityThresholdSeconds (Double or Int, default 300.0 = 5 minutes)
        if let sec = try? container.decodeIfPresent(Double.self, forKey: .inactivityThresholdSeconds) {
            self.inactivityThresholdSeconds = sec
        } else if let sec = try? container.decodeIfPresent(Int.self, forKey: .inactivityThresholdSeconds) {
            self.inactivityThresholdSeconds = Double(sec)
        } else if let sec = try? container.decodeIfPresent(Double.self, forKey: .inactivity_threshold_seconds) {
            self.inactivityThresholdSeconds = sec
        } else if let sec = try? container.decodeIfPresent(Int.self, forKey: .inactivity_threshold_seconds) {
            self.inactivityThresholdSeconds = Double(sec)
        } else {
            self.inactivityThresholdSeconds = 300.0
        }

        // heartbeatIntervalSeconds (Double or Int, default 30.0)
        if let sec = try? container.decodeIfPresent(Double.self, forKey: .heartbeatIntervalSeconds) {
            self.heartbeatIntervalSeconds = sec
        } else if let sec = try? container.decodeIfPresent(Int.self, forKey: .heartbeatIntervalSeconds) {
            self.heartbeatIntervalSeconds = Double(sec)
        } else if let sec = try? container.decodeIfPresent(Double.self, forKey: .heartbeat_interval_seconds) {
            self.heartbeatIntervalSeconds = sec
        } else if let sec = try? container.decodeIfPresent(Int.self, forKey: .heartbeat_interval_seconds) {
            self.heartbeatIntervalSeconds = Double(sec)
        } else {
            self.heartbeatIntervalSeconds = 30.0
        }
    }
}

struct HeartbeatPayload: Codable {
    let deviceId: String
    let deviceSecret: String
    let timestamp: String
    let state: ActivityState
    let activityDetail: ActivityDetail
    let agentVersion: String
    let deviceModel: String
    let macosVersion: String
}

struct ActivityDetail: Codable {
    let lastInputSecondsAgo: Int
    let inputType: InputType
    let idleSeconds: Int
}

struct HeartbeatResponse: Codable {
    let success: Bool
    let currentDayActiveSeconds: Int?
    let activeFormatted: String?
    let message: String?
    let error: String?
}

class FlyingWhalesActivityAgent: NSObject, NSApplicationDelegate {
    private var statusItem: NSStatusItem!
    private var timer: Timer?
    private var config: AgentConfig?
    
    // State machine trackers
    private var currentState: ActivityState = .inactive
    private var isSystemSleeping: Bool = false
    private var isDisplaySleeping: Bool = false
    private var isScreenLocked: Bool = false
    private var lastInputType: InputType = .none
    private var lastInputTimestamp: Date = Date()
    private var todayActiveFormatted: String = "00h 00m"
    private var postWakeGrace: Bool = false
    
    func applicationDidFinishLaunching(_ notification: Notification) {
        setupMenubar()
        loadConfiguration()
        setupNotificationObservers()
        setupEventMonitor()
        startHeartbeatTimer()
        
        print("[FLYING WHALES AGENT] Native Apple Silicon macOS agent started.")
    }
    
    // MARK: - Menubar Status Setup
    private func setupMenubar() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        updateStatusItemUI()
        
        let menu = NSMenu()
        menu.addItem(NSMenuItem(title: "Flying Whales Activity Agent", action: nil, keyEquivalent: ""))
        menu.addItem(NSMenuItem.separator())
        menu.addItem(NSMenuItem(title: "Status: Initializing...", action: nil, keyEquivalent: ""))
        menu.addItem(NSMenuItem.separator())
        menu.addItem(NSMenuItem(title: "Preferences...", action: #selector(openPreferences), keyEquivalent: ","))
        menu.addItem(NSMenuItem(title: "Quit Flying Whales Agent", action: #selector(quitApp), keyEquivalent: "q"))
        statusItem.menu = menu
    }
    
    private func updateStatusItemUI() {
        guard let button = statusItem.button else { return }
        
        if config == nil {
            button.title = "🐳 ⚠️ Unpaired"
            if let menu = statusItem.menu, menu.items.count > 2 {
                menu.items[2].title = "Status: Not Paired (Requires config.json from Admin)"
            }
            return
        }
        
        let icon: String
        switch currentState {
        case .active:   icon = "🟢"
        case .inactive: icon = "🟡"
        case .sleeping: icon = "💤"
        case .locked:   icon = "🔒"
        case .offline:  icon = "⚪"
        }
        
        button.title = "🐳 \(icon) \(todayActiveFormatted)"
        
        if let menu = statusItem.menu, menu.items.count > 2 {
            menu.items[2].title = "Status: \(currentState.rawValue) (\(todayActiveFormatted) today)"
        }
    }
    
    // MARK: - Configuration
    private func loadConfiguration() {
        let fileManager = FileManager.default
        
        // Build candidate search paths for Apple Silicon macOS (dynamically resolved)
        var candidatePaths: [String] = []
        
        // 1. User Application Support directory via FileManager search path
        if let appSupport = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first {
            let path = appSupport.appendingPathComponent("FlyingWhalesAgent/config.json").path
            candidatePaths.append(path)
        }
        
        // 2. Home directory resolution via homeDirectoryForCurrentUser (reliable across all usernames)
        let homeAppSupport = fileManager.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/Application Support/FlyingWhalesAgent/config.json").path
        candidatePaths.append(homeAppSupport)
        
        // 3. Tilde-expanded path (~/Library/Application Support/FlyingWhalesAgent/config.json)
        let tildePath = ("~/Library/Application Support/FlyingWhalesAgent/config.json" as NSString).expandingTildeInPath
        candidatePaths.append(tildePath)
        
        // 4. Current working directory fallback
        candidatePaths.append("config.json")
        
        // Deduplicate paths while preserving priority order
        var seen = Set<String>()
        let uniqueCandidates = candidatePaths.filter { seen.insert($0).inserted }
        
        // Locate first existing path
        var foundPath: String? = nil
        for path in uniqueCandidates {
            if fileManager.fileExists(atPath: path) {
                foundPath = path
                break
            }
        }
        
        guard let configPath = foundPath else {
            let primaryDisplay = uniqueCandidates.first ?? "~/Library/Application Support/FlyingWhalesAgent/config.json"
            print("[FLYING WHALES AGENT] No config.json found at \(primaryDisplay). Awaiting device pairing from Admin portal.")
            self.config = nil
            return
        }
        
        // Verify file is readable
        guard fileManager.isReadableFile(atPath: configPath) else {
            print("[FLYING WHALES AGENT] Error: config.json exists at \(configPath) but is not readable. Please verify file permissions.")
            self.config = nil
            return
        }
        
        do {
            let fileUrl = URL(fileURLWithPath: configPath)
            let data = try Data(contentsOf: fileUrl)
            let decoder = JSONDecoder()
            let loaded = try decoder.decode(AgentConfig.self, from: data)
            self.config = loaded
            print("[FLYING WHALES AGENT] Successfully loaded config for device: \(loaded.deviceId) from \(configPath)")
        } catch {
            self.config = nil
            print("[FLYING WHALES AGENT] Error: config.json exists at \(configPath) but JSON decoding failed: \(error.localizedDescription)")
        }
    }
    
    // MARK: - Notifications (Sleep, Wake, Display, Lock)
    private func setupNotificationObservers() {
        let wsCenter = NSWorkspace.shared.notificationCenter
        
        // System Sleep & Wake
        wsCenter.addObserver(forName: NSWorkspace.willSleepNotification, object: nil, queue: .main) { [weak self] _ in
            self?.isSystemSleeping = true
            self?.currentState = .sleeping
            self?.updateStatusItemUI()
            self?.sendImmediateHeartbeat()
        }
        
        wsCenter.addObserver(forName: NSWorkspace.didWakeNotification, object: nil, queue: .main) { [weak self] _ in
            self?.isSystemSleeping = false
            self?.postWakeGrace = true // Wait until user touches keyboard/mouse
            self?.currentState = .inactive
            self?.updateStatusItemUI()
        }
        
        // Screens Sleep & Wake
        wsCenter.addObserver(forName: NSWorkspace.screensDidSleepNotification, object: nil, queue: .main) { [weak self] _ in
            self?.isDisplaySleeping = true
            self?.currentState = .sleeping
            self?.updateStatusItemUI()
            self?.sendImmediateHeartbeat()
        }
        
        wsCenter.addObserver(forName: NSWorkspace.screensDidWakeNotification, object: nil, queue: .main) { [weak self] _ in
            self?.isDisplaySleeping = false
            self?.postWakeGrace = true
            self?.currentState = .inactive
            self?.updateStatusItemUI()
        }
        
        // Session Lock & Unlock (Distributed Notifications)
        let distCenter = DistributedNotificationCenter.default()
        distCenter.addObserver(forName: NSNotification.Name("com.apple.screenIsLocked"), object: nil, queue: .main) { [weak self] _ in
            self?.isScreenLocked = true
            self?.currentState = .locked
            self?.updateStatusItemUI()
            self?.sendImmediateHeartbeat()
        }
        
        distCenter.addObserver(forName: NSNotification.Name("com.apple.screenIsUnlocked"), object: nil, queue: .main) { [weak self] _ in
            self?.isScreenLocked = false
            self?.postWakeGrace = true
            self?.currentState = .inactive
            self?.updateStatusItemUI()
        }
    }
    
    // MARK: - Privacy-Preserving Input Activity Monitor
    private func setupEventMonitor() {
        // Global monitor listens only for event categories.
        // It NEVER intercepts text, passwords, or coordinates.
        NSEvent.addGlobalMonitorForEvents(matching: [.keyDown]) { [weak self] _ in
            self?.lastInputType = .keyboard
            self?.lastInputTimestamp = Date()
            self?.postWakeGrace = false
        }
        
        NSEvent.addGlobalMonitorForEvents(matching: [.leftMouseDown, .rightMouseDown, .mouseMoved]) { [weak self] _ in
            self?.lastInputType = .mouse
            self?.lastInputTimestamp = Date()
            self?.postWakeGrace = false
        }
    }
    
    // MARK: - System Idle Time Query
    private func getSystemIdleSeconds() -> Double {
        // Reads native macOS HIDIdleTime from IOHIDSystem kernel registry.
        // This native approach works on macOS 13+ (Apple Silicon M2 Pro, M4, etc.),
        // preserves 100% user privacy, and does NOT require Accessibility permission.
        var iterator: io_iterator_t = 0
        let result = IOServiceGetMatchingServices(kIOMainPortDefault, IOServiceMatching("IOHIDSystem"), &iterator)
        guard result == KERN_SUCCESS, iterator != 0 else {
            return Date().timeIntervalSince(lastInputTimestamp)
        }
        defer { IOObjectRelease(iterator) }
        
        let entry = IOIteratorNext(iterator)
        guard entry != 0 else {
            return Date().timeIntervalSince(lastInputTimestamp)
        }
        defer { IOObjectRelease(entry) }
        
        guard let unmanagedProperty = IORegistryEntryCreateCFProperty(
            entry,
            "HIDIdleTime" as CFString,
            kCFAllocatorDefault,
            0
        ) else {
            return Date().timeIntervalSince(lastInputTimestamp)
        }
        
        let property = unmanagedProperty.takeRetainedValue()
        if let number = property as? NSNumber {
            return number.doubleValue / 1_000_000_000.0
        } else if let data = property as? Data {
            var nanoseconds: Int64 = 0
            if data.count >= MemoryLayout<Int64>.size {
                _ = withUnsafeMutableBytes(of: &nanoseconds) { data.copyBytes(to: $0) }
                return Double(nanoseconds) / 1_000_000_000.0
            }
        }
        return Date().timeIntervalSince(lastInputTimestamp)
    }
    
    // MARK: - Evaluation & Heartbeat Loop
    private func startHeartbeatTimer() {
        let interval = config?.heartbeatIntervalSeconds ?? 30.0
        timer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { [weak self] _ in
            self?.tick()
        }
        tick()
    }
    
    private func tick() {
        if config == nil {
            loadConfiguration()
        }
        evaluateCurrentState()
        updateStatusItemUI()
        sendImmediateHeartbeat()
    }
    
    private func evaluateCurrentState() {
        if isSystemSleeping || isDisplaySleeping {
            currentState = .sleeping
            return
        }
        
        if isScreenLocked {
            currentState = .locked
            return
        }
        
        let idleSec = getSystemIdleSeconds()
        let threshold = config?.inactivityThresholdSeconds ?? 300.0
        
        if postWakeGrace {
            // After wake or unlock, require user input before counting
            if idleSec < 15.0 {
                postWakeGrace = false
                currentState = .active
            } else {
                currentState = .inactive
            }
            return
        }
        
        if idleSec < threshold {
            currentState = .active
        } else {
            currentState = .inactive
        }
    }
    
    private func sendImmediateHeartbeat() {
        guard let config = self.config else { return }
        
        let idleSeconds = Int(getSystemIdleSeconds())
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let timestamp = isoFormatter.string(from: Date())
        
        let payload = HeartbeatPayload(
            deviceId: config.deviceId,
            deviceSecret: config.deviceSecret,
            timestamp: timestamp,
            state: currentState,
            activityDetail: ActivityDetail(
                lastInputSecondsAgo: min(idleSeconds, 3600),
                inputType: lastInputType,
                idleSeconds: idleSeconds
            ),
            agentVersion: "1.0.0",
            deviceModel: "Mac mini (Apple Silicon)",
            macosVersion: ProcessInfo.processInfo.operatingSystemVersionString
        )
        
        let baseUrl = config.serverUrl.hasSuffix("/") ? String(config.serverUrl.dropLast()) : config.serverUrl
        guard let url = URL(string: "\(baseUrl)/api/presence/heartbeat") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("FlyingWhales-Swift-Agent/1.0.0 (Apple Silicon; macOS)", forHTTPHeaderField: "User-Agent")
        request.timeoutInterval = 10.0
        
        do {
            request.httpBody = try JSONEncoder().encode(payload)
        } catch {
            return
        }
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let self = self, let data = data, error == nil else { return }
            if let decoded = try? JSONDecoder().decode(HeartbeatResponse.self, from: data),
               let formatted = decoded.activeFormatted {
                DispatchQueue.main.async {
                    self.todayActiveFormatted = formatted
                    self.updateStatusItemUI()
                }
            }
        }.resume()
    }
    
    @objc private func openPreferences() {
        NSWorkspace.shared.open(URL(string: "\(config?.serverUrl ?? "http://localhost:3000")/#settings")!)
    }
    
    @objc private func quitApp() {
        NSApplication.shared.terminate(nil)
    }
}

// MARK: - Single Instance Process Lock
// Ensures exactly one instance of FlyingWhalesAgent runs per user session.
// Prevents duplicate processes when both launchd and manual executions are invoked.
private var lockFileDescriptor: Int32 = -1

func acquireSingleInstanceLock() -> Bool {
    let appSupport = FileManager.default.homeDirectoryForCurrentUser
        .appendingPathComponent("Library/Application Support/FlyingWhalesAgent")
    try? FileManager.default.createDirectory(at: appSupport, withIntermediateDirectories: true)
    
    let lockPath = appSupport.appendingPathComponent("agent.lock").path
    lockFileDescriptor = open(lockPath, O_CREAT | O_RDWR, 0o644)
    if lockFileDescriptor < 0 {
        return true
    }
    
    if flock(lockFileDescriptor, LOCK_EX | LOCK_NB) != 0 {
        let pidPath = appSupport.appendingPathComponent("agent.pid").path
        let existingPid = (try? String(contentsOfFile: pidPath, encoding: .utf8))?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? "unknown"
        print("[FLYING WHALES AGENT] Another instance is already running (PID: \(existingPid)). Exiting to prevent duplicate processes.")
        close(lockFileDescriptor)
        lockFileDescriptor = -1
        return false
    }
    
    let pidStr = "\(getpid())\n"
    let pidPath = appSupport.appendingPathComponent("agent.pid").path
    try? pidStr.write(toFile: pidPath, atomically: true, encoding: .utf8)
    return true
}

// Entry Point
guard acquireSingleInstanceLock() else {
    exit(0)
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let delegate = FlyingWhalesActivityAgent()
app.delegate = delegate
app.run()
