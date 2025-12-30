const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');


const SALT = "AMA_PRODUCT_GEM_SECURE_2025_V88"; 
const LICENSE_FILE = path.join(app.getPath('userData'), 'license.dat');


function getMachineId() {
  try {
    const fingerprint = [
      os.hostname(),
      os.arch(),
      os.platform(),
      os.cpus().length,
      Math.floor(os.totalmem() / 1024 / 1024 / 1024) + "GB" 
    ].join('|');

    return crypto.createHash('md5').update(fingerprint).digest('hex').toUpperCase();
  } catch (e) {
    return "UNKNOWN-DEVICE-ID";
  }
}


function verifyKey(inputKey, machineId) {
  const targetHash = crypto.createHash('sha256')
    .update(machineId + SALT)
    .digest('hex')
    .toUpperCase();
  
  const expectedKey = targetHash.substring(0, 16).match(/.{1,4}/g).join('-');
  return inputKey.trim().toUpperCase() === expectedKey;
}

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#fcfdff',
      symbolColor: '#64748b',
      height: 32
    },
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // 允许渲染进程直接使用 ipcRenderer
      webSecurity: false 
    }
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
  
  return win;
};

app.whenReady().then(() => {
  const win = createWindow();


  ipcMain.handle('check-license', () => {
    const mid = getMachineId();
    let isActivated = false;

    if (fs.existsSync(LICENSE_FILE)) {
      try {
        const savedKey = fs.readFileSync(LICENSE_FILE, 'utf-8').trim();
        if (verifyKey(savedKey, mid)) {
          isActivated = true;
        }
      } catch (e) {
        console.error("License read error", e);
      }
    }

    return { machineId: mid, isActivated };
  });


  ipcMain.handle('verify-license', (event, inputKey) => {
    const mid = getMachineId();
    if (verifyKey(inputKey, mid)) {
      fs.writeFileSync(LICENSE_FILE, inputKey);
      return { success: true };
    } else {
      return { success: false, message: "Invalid Key" };
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});