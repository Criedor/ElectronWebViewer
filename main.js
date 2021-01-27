const electron = require("electron");
const { BrowserWindow, screen, app, Menu } = electron;
const fs = require('fs');
const path = require("path");


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let screenHeight;
let screenWidth;
let initPath;
var template = [];

const appPath = app.getPath("exe");

app.commandLine.appendSwitch ("disable-http-cache");


// This will read the config.json and pass its data to the the index.html
// let config = require(appPath.slice(0,appPath.lastIndexOf("\\")) + "\\config\\config.json");   ---------> this is outdated, use lines below
let config = JSON.parse(fs.readFileSync('./config/config.json', function(err, data) {
  if (err) throw err;}))

// Only you on dev for npm start
// let config = require("./config/config.json");


// Menu available in the DEBUG mode
if (config.debug) {
  template = [
    {
      label: "Debug Tools",
      submenu: [
        { role: "reload" },
        { role: "forcereload" },
        { role: "toggledevtools" },
        // { type: "separator" },
        // { role: "resetzoom" },
        // { role: "zoomin" },
        // { role: "zoomout" },
        // { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      role: "Window",
      submenu: [{ role: "minimize" }, { role: "close" }],
    },
  ];
}


// Only needed for MAC OS Version
// if (process.platform === "darwin") {
//   template.unshift({
//     label: app.productName,
//     submenu: [
//       { role: "about" },
//       { type: "separator" },
//       { role: "services", submenu: [] },
//       { type: "separator" },
//       { role: "hide" },
//       { role: "hideothers" },
//       { role: "unhide" },
//       { type: "separator" },
//       { role: "quit" },
//     ],
//   });

//   // Edit menu
//   template[1].submenu.push(
//     { type: "separator" },
//     {
//       label: "Speech",
//       submenu: [{ role: "startspeaking" }, { role: "stopspeaking" }],
//     }
//   );

//   // Window menu available in DEBUG mode
//   template[3].submenu = [
//     { role: "close" },
//     { role: "minimize" },
//     { role: "zoom" },
//     { type: "separator" },
//     { role: "front" },
//   ];
// }


// This method will be called when Electron has finished initialization and is ready to create browser windows.
app.allowRendererProcessReuse = true;

app.on("ready", () => {
  initPath = path.join(app.getPath("userData"), "init.json");
  try {
    data = JSON.parse(fs.readFileSync(initPath, "utf8"));
  } 
  catch (e) {}
  

//Check for last used screen resolution saved in the config.json
  if (config.height && config.width) {
    screenHeight = config.height
    screenWidth = config.width
  }
  else {
    screenHeight = screen.getPrimaryDisplay().workAreaSize.height
    screenWidth = screen.getPrimaryDisplay().workAreaSize.width
  }

  
  //Open Browserwindow
  // https://www.electronjs.org/docs/api/browser-window#class-browserwindow
  mainWindow = new BrowserWindow({
    width: screenWidth,
    height: screenHeight,
    kiosk: config.kiosk,
    icon: path.join(__dirname, "assets/icons/png/64x64.png"),
    titleBarStyle: 'hidden',
    // frame: false,
    backgroundColor: "#fff",
    
    // Uses the size of the content + the frames etc.
    // useContentSize: true,
    
    webPreferences: {
      nodeIntegration: true,
      disableDialogs: true,
      spellcheck: false,
      // https://www.electronjs.org/docs/api/webview-tag
      webviewTag: true, // Security warning since Electron 10
      zoomFactor: 1.0,
      enableRemoteModule: true,
    },
  });

  // Load the index.html which contains the webview
  mainWindow.loadURL(config.url[0])
  
  // Makes sure the webviewer layer is shown
  mainWindow.maximize();
  
  //Create Menu based on predefined template, controled by config.json
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  //Save last working screen resolution to config.json
  config.width = screenWidth
  config.height = screenHeight
  try { 
    fs.writeFileSync('./config/config.json', JSON.stringify(config), 'utf-8'); 
  }
  catch(e) {
     alert('Failed to save the file !'); 
  }

  // Reload WebView: To reload at 6am set & use timer, else use millisecs (3600000 = 1h)
  var now = new Date();
  var timer = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0, 0) - now;
  if (timer < 0) {
    timer += 86400000; // it's after defined time, so try tomorrow at that time.
  }
  setTimeout (()=>{
    if(config.kiosk) {
     setTimeout(()=>mainWindow.setKiosk(false),5000)
      setTimeout(()=>mainWindow.setSize(800,600),5000);
      setTimeout(()=>mainWindow.setSize(screenWidth, screenHeight),5000);
      setTimeout(()=>mainWindow.setKiosk(true),5000);
      setTimeout(()=>mainWindow.reload(),5000);
      mainWindow.maximize()
    }
    else {
      setTimeout(()=>mainWindow.setSize(800,600),5000);
      setTimeout(()=>mainWindow.setSize(screenWidth, screenHeight),5000);
      setTimeout(()=>mainWindow.reload(),5000);
      mainWindow.maximize()
    }
    console.log("refreshed by timer")
  }, timer)

//Carousell Option -> loads the url from the url array every 10s
  let i = 0
  setInterval(function(){
    if (config.url.length > 1  && config.carousell){
      if (i+1 < config.url.length) {
        i = i+1
      }
      else {
        i = 0
      }
      mainWindow.loadURL(config.url[i])
    }
   }, config.carouselltime );

  // Log the current Screen size, AppWindowSize and WindowContentSize to displaylog.json
  let currentScreen
  let currentSize
  let currentContentSize

  setInterval(()=>{
    if (currentScreen != screen.getPrimaryDisplay() ||currentSize != mainWindow.getSize() || currentContentSize != mainWindow.getContentSize()) {
      currentScreen = screen.getPrimaryDisplay()
      currentSize = mainWindow.getSize()
      currentContentSize = mainWindow.getContentSize()
      fs.appendFile('./config/displaylog.txt', "Date: "+ new Date()+", Screen: "+ currentScreen.workAreaSize.width+"x"+currentScreen.workAreaSize.height+", WindowSize: "+currentSize+", ContentSize: "+currentContentSize+"\n", (err)=> {
        if (err) throw err;
      })
    }
  },3600000)
})

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  data = {
    bounds: mainWindow.getBounds(),
  };
  fs.writeFileSync(initPath, JSON.stringify(data));
  app.quit();
});