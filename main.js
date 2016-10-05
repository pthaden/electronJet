const {app, BrowserWindow} = require('electron')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

app.on('ready', () => {
    // Create the browser window.
	win = new BrowserWindow({
		  width: 800, 
		  height: 600,

		  // turn off node integration in the Electron window to prevent conflicts with require.js
		  // see http://electron.atom.io/docs/faq/#i-can-not-use-jqueryrequirejsmeteorangularjs-in-electron
		  webPreferences: { nodeIntegration: false }
	})

	// and load the index.html of the built JET app.
	win.loadURL('file://' + __dirname + '/web/index.html')
})
