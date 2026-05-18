const { app, BrowserWindow, shell } = require("electron");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

let server;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json"
};

function getOutDir() {
  if (app.isPackaged) {
    return path.join(app.getAppPath(), "out");
  }

  return path.join(process.cwd(), "out");
}

function resolveStaticFiles(outDir, requestUrl) {
  const url = new URL(requestUrl, "http://127.0.0.1");
  let pathname = decodeURIComponent(url.pathname);

  if (pathname === "/") pathname = "/index.html";

  const names = path.extname(pathname)
    ? [pathname]
    : [`${pathname}.html`, path.join(pathname, "index.html")];

  return names
    .map((name) => path.normalize(path.join(outDir, name)))
    .filter((filePath) => filePath.startsWith(path.normalize(outDir)));
}

function startStaticServer() {
  const outDir = getOutDir();

  server = http.createServer((request, response) => {
    const candidates = resolveStaticFiles(outDir, request.url || "/");
    if (candidates.length === 0) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const readCandidate = (index) => {
      const filePath = candidates[index];

      if (!filePath) {
        fs.readFile(path.join(outDir, "index.html"), (fallbackError, fallbackData) => {
          if (fallbackError) {
            response.writeHead(404);
            response.end("Not found");
            return;
          }

          response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          response.end(fallbackData);
        });
        return;
      }

      fs.readFile(filePath, (error, data) => {
        if (error) {
          readCandidate(index + 1);
          return;
        }

        response.writeHead(200, {
          "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream"
        });
        response.end(data);
      });
    };

    readCandidate(0);
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

async function createWindow() {
  const localUrl = await startStaticServer();

  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#0b1017",
    title: "MAKO-IP Magazyn",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  await window.loadURL(localUrl);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (server) server.close();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
