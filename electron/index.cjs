const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, 'preload.cjs')
        }
    })

    // In development, load from Vite dev server. In production, load the built HTML.
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
        win.loadURL('http://localhost:5173')
    } else {
        win.loadFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'))
    }
}

app.whenReady().then(() => {
    createWindow()
})
