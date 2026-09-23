# Makefile for Flying Whales macOS Native Apple Silicon Agent
# Compiles natively for arm64 (Apple M2 Pro, M4, M-series)

TARGET = FlyingWhalesAgent
SWIFT_SRC = FlyingWhalesAgent.swift

all: build

build:
	@echo "Compiling Flying Whales Activity Agent for Apple Silicon (arm64)..."
	swiftc -target arm64-apple-macos13.0 \
		-O \
		-framework Cocoa \
		-framework IOKit \
		-framework CoreGraphics \
		$(SWIFT_SRC) \
		-o $(TARGET)
	@echo "Build successful: ./$(TARGET)"

install: build
	@chmod +x install.sh
	@./install.sh

uninstall:
	@chmod +x uninstall.sh
	@./uninstall.sh

status:
	@chmod +x status.sh
	@./status.sh

logs:
	@tail -f "$$HOME/Library/Application Support/FlyingWhalesAgent/agent.log"

restart:
	@launchctl kickstart -k "gui/$$(id -u)/com.flyingwhales.agent" 2>/dev/null || (./uninstall.sh && ./install.sh)

clean:
	rm -f $(TARGET)

run: build
	./$(TARGET)

