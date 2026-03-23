package logger

import (
	"io"
	"log"
	"os"
	"path/filepath"
	"time"
)

var (
	level      string
	logFile    *os.File
	infoLog    *log.Logger
	debugLog   *log.Logger
	traceLog   *log.Logger
	multiWrite io.Writer
)

func Init(logLevel string) error {
	level = logLevel
	if level == "" {
		level = "info"
	}

	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}

	logDir := filepath.Join(home, ".nanollm")
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return err
	}

	logPath := filepath.Join(logDir, time.Now().Format("2006-01-02")+".log")
	logFile, err = os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return err
	}

	multiWrite = io.MultiWriter(os.Stdout, logFile)
	infoLog = log.New(multiWrite, "[INFO] ", log.LstdFlags)
	debugLog = log.New(multiWrite, "[DEBUG] ", log.LstdFlags)
	traceLog = log.New(multiWrite, "[TRACE] ", log.LstdFlags)

	return nil
}

func Info(format string, v ...interface{}) {
	infoLog.Printf(format, v...)
}

func Debug(format string, v ...interface{}) {
	if level == "debug" || level == "trace" {
		debugLog.Printf(format, v...)
	}
}

func Trace(format string, v ...interface{}) {
	if level == "trace" {
		traceLog.Printf(format, v...)
	}
}

func Close() {
	if logFile != nil {
		logFile.Close()
	}
}

func LogRequest(method, path, model string, statusCode int, reqHeaders map[string][]string, reqBody, respHeaders map[string][]string, respBody string) {
	Info("Request: method=%s path=%s model=%s status=%d", method, path, model, statusCode)

	if level == "trace" {
		Trace("Request Headers: %v", reqHeaders)
		Trace("Request Body: %s", reqBody)
		Trace("Response Headers: %v", respHeaders)
		Trace("Response Body: %s", respBody)
	}
}

func LogUpstream(method, url string, reqHeaders map[string][]string, reqBody, respHeaders map[string][]string, respBody string) {
	if level == "debug" || level == "trace" {
		Debug("Upstream Request: method=%s url=%s", method, url)
		Debug("Upstream Request Headers: %v", reqHeaders)
		Debug("Upstream Request Body: %s", reqBody)
		Debug("Upstream Response Headers: %v", respHeaders)
		Debug("Upstream Response Body: %s", respBody)
	}
}
