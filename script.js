/***********************
 * TAB NAVIGATION
 ***********************/
const tabs = document.querySelectorAll(".menu-item");
const pages = document.querySelectorAll(".main-content");
tabs.forEach(tab => {
  tab.addEventListener("click", (e) => {
    e.preventDefault(); // Prevent default anchor behavior
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    pages.forEach(page => page.classList.remove("active"));
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});

/***********************
 * THEME & SETTINGS
 ***********************/
const themeSelect = document.getElementById("themeSelect");
const downloadLocationSelect = document.getElementById("downloadLocation");
const sendAllBtn = document.getElementById("sendAllBtn"); // Get the sendAllBtn

// On load, restore saved settings (default theme: dark)
window.addEventListener("load", () => {
  const savedTheme = localStorage.getItem("theme") || "dark";
  if (themeSelect) {
    themeSelect.value = savedTheme;
  }
  setTheme(savedTheme);
  const savedDownload = localStorage.getItem("downloadLocation") || "default";
  if (downloadLocationSelect) {
    downloadLocationSelect.value = savedDownload;
  }
  // Display your own ID in the sidebar
  const myIDDisplay = document.getElementById("myIDDisplay");
  if (myIDDisplay) {
    myIDDisplay.innerText = myID;
  }
});
if (themeSelect) {
  themeSelect.addEventListener("change", (e) => {
    setTheme(e.target.value);
    localStorage.setItem("theme", e.target.value);
  });
}
function setTheme(theme) {
  document.body.classList.remove("theme-dark", "theme-light", "theme-blue", "theme-solarized", "theme-pastel", "theme-retro");
  document.body.classList.add("theme-" + theme);
}
if (downloadLocationSelect) {
  downloadLocationSelect.addEventListener("change", (e) => {
    const selection = e.target.value;
    if (selection === "custom") {
      const customFolder = prompt("Enter custom download folder name:", "MyDownloads");
      if (customFolder) {
        localStorage.setItem("downloadLocation", customFolder);
        alert("Custom download folder set to: " + customFolder);
      } else {
        e.target.value = "default";
        localStorage.setItem("downloadLocation", "default");
      }
    } else {
      localStorage.setItem("downloadLocation", selection);
    }
  });
}

/***********************
 * PEERJS & DEVICE DISCOVERY
 ***********************/
const WORDS = ["Rocket", "Guitar", "Phoenix"];
const MAX_NUM = 10;
const myID = `${WORDS[Math.floor(Math.random() * WORDS.length)]}-${Math.floor(Math.random() * MAX_NUM)}`;
const peer = new Peer(myID);
let connections = [];
peer.on("open", () => {
  console.log("My peer ID is:", myID);
  discoverPeers();
});
peer.on("connection", conn => {
  handleIncomingConnection(conn);
});
function discoverPeers() {
  const possibleIDs = [];
  WORDS.forEach(word => {
    for (let i = 0; i < MAX_NUM; i++) {
      const candidate = `${word}-${i}`;
      if (candidate !== myID) possibleIDs.push(candidate);
    }
  });
  possibleIDs.forEach(candidate => {
    const conn = peer.connect(candidate, { reliable: true });
    conn.on("open", () => handleIncomingConnection(conn));
  });
}
// Returns a FontAwesome icon class based on device type.
function getDeviceIcon() {
  const ua = navigator.userAgent;
  if (/Mobile|Android|iP(hone|od)/.test(ua)) {
    return "fa-mobile-alt";
  } else if (/iPad|Tablet/.test(ua)) {
    return "fa-tablet-alt";
  } else {
    return "fa-desktop";
  }
}
function handleIncomingConnection(conn) {
  if (connections.some(c => c.peer === conn.peer)) return;
  conn.selected = false; // not selected by default
  conn.device = "fa-desktop"; // default icon
  connections.push(conn);
  // On open, send our device info to the peer
  conn.on("open", () => {
    conn.send({ type: "handshake", device: getDeviceIcon() });
  });
  conn.on("data", data => {
    if (data.type === "handshake") {
      conn.device = data.device || "fa-desktop";
      renderDiscoveredPeers();
    } else if (data.type === "file") {
      displayIncomingFile(conn.peer, data);
    } else if (data.type === "text") {
      displayIncomingText(conn.peer, data);
    }
  });
  renderDiscoveredPeers();
}
function renderDiscoveredPeers() {
  const deviceList = document.getElementById("deviceList");
  if (!deviceList) return;
  deviceList.innerHTML = "";
  if (connections.length === 0) {
    deviceList.innerText = "(No devices found)";
    return;
  }
  connections.forEach(conn => {
    const div = document.createElement("div");
    div.className = "device" + (conn.selected ? " selected" : "");
    // Left side: check mark if selected and the device name.
    const leftDiv = document.createElement("div");
    leftDiv.className = "device-left";
    if (conn.selected) {
      const checkIcon = document.createElement("i");
      checkIcon.className = "fas fa-check-circle";
      leftDiv.appendChild(checkIcon);
    }
    const nameSpan = document.createElement("span");
    nameSpan.className = "device-name";
    nameSpan.innerText = conn.peer;
    leftDiv.appendChild(nameSpan);
    // Right side: display device type icon.
    const rightDiv = document.createElement("div");
    rightDiv.className = "device-right";
    const deviceIcon = document.createElement("i");
    deviceIcon.className = "fas " + (conn.device || "fa-desktop");
    rightDiv.appendChild(deviceIcon);
    div.appendChild(leftDiv);
    div.appendChild(rightDiv);
    div.addEventListener("click", () => {
      conn.selected = !conn.selected;
      renderDiscoveredPeers();
    });
    deviceList.appendChild(div);
  });
}

/***********************
 * PENDING ITEMS (QUEUE) & SENDING
 ***********************/
let pendingItems = [];
let currentlyPreviewing = null;

function updatePendingItemsUI() {
  const pendingContainer = document.getElementById("pendingItems");
  if (!pendingContainer) return;

  pendingContainer.innerHTML = "";
  if (pendingItems.length === 0) {
    pendingContainer.innerText = "(No pending items)";
    return;
  }
  pendingItems.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "pending-item";
    if (item.type === "file") {
      div.innerHTML = `<i class="fas fa-file"></i> ${item.name}`;
    } else if (item.type === "text") {
      div.innerHTML = `<i class="fas fa-font"></i> ${item.message.substring(0, 20)}${item.message.length > 20 ? '...' : ''}`;
    }

    const itemButtons = document.createElement("div");
    itemButtons.className = "item-buttons";

    const previewBtn = document.createElement("button");
    previewBtn.className = "preview-btn";
    previewBtn.innerHTML = '<i class="fas fa-eye"></i>';
    previewBtn.addEventListener("click", () => {
      if (item.type === 'file') {
        // Display file preview
        currentlyPreviewing = item;
        if (filePreview) filePreview.style.display = "block";
        if (previewFilename) previewFilename.textContent = item.name;
        if (previewImage) previewImage.src = item.data;
      } else {
        alert("No preview available for text items.");
      }
    });
    itemButtons.appendChild(previewBtn);

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.innerHTML = '<i class="fas fa-trash"></i>';
    removeBtn.addEventListener("click", () => {
      pendingItems.splice(index, 1);
      updatePendingItemsUI();
      if (currentlyPreviewing === item) {
        if (filePreview) filePreview.style.display = "none";
        currentlyPreviewing = null;
      }
    });
    itemButtons.appendChild(removeBtn);

    div.appendChild(itemButtons);
    pendingContainer.appendChild(div);
  });

  //If previewing, show it below
  if (currentlyPreviewing) {
    if (filePreview) filePreview.style.display = "block";
    if (previewFilename) previewFilename.textContent = currentlyPreviewing.name;
    if (previewImage) previewImage.src = currentlyPreviewing.data;
  } else {
    if (filePreview) filePreview.style.display = "none";
  }
}
// File/Folders are queued – they are added to pendingItems.
const fileBtn = document.getElementById("fileBtn");
const folderBtn = document.getElementById("folderBtn");
const textBtn = document.getElementById("textBtn");
const pasteBtn = document.getElementById("pasteBtn");
const fileInput = document.getElementById("fileInput");
const folderInput = document.getElementById("folderInput");
const filePreview = document.getElementById("filePreview");
const previewImage = document.getElementById("previewImage");
const previewFilename = document.getElementById("previewFilename");

if (fileBtn) {
  fileBtn.addEventListener("click", () => {
    if (fileInput) {
      fileInput.value = "";
      fileInput.click();
    }
  });
}

if (fileInput) {
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (file) {
      addFileToPending(file);
    }
  });
}

if (folderBtn) {
  folderBtn.addEventListener("click", () => {
    if (folderInput) {
      folderInput.value = "";
      folderInput.click();
    }
  });
}

if (folderInput) {
  folderInput.addEventListener("change", () => {
    const files = folderInput.files;
    if (files.length > 0) {
      Array.from(files).forEach(file => {
        addFileToPending(file);
      });
    }
  });
}

if (textBtn) {
  textBtn.addEventListener("click", () => {
    const text = prompt("Enter text message:");
    if (text && text.trim() !== "") {
      pendingItems.push({ type: "text", message: text });
      updatePendingItemsUI();
    }
  });
}

if (pasteBtn) {
  pasteBtn.addEventListener("click", () => {
    const text = prompt("Paste your text:");
    if (text && text.trim() !== "") {
      pendingItems.push({ type: "text", message: text });
      updatePendingItemsUI();
    }
  });
}

function addFileToPending(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    pendingItems.push({ type: "file", name: file.name, data: e.target.result });
    updatePendingItemsUI();
  };
  reader.readAsDataURL(file);
}
// When the floating "Send All" button is clicked, send every pending item to all selected devices.

if (sendAllBtn) {
  sendAllBtn.addEventListener("click", () => {
    sendPendingItems();
  });
}

function sendPendingItems() {
  const selectedConns = connections.filter(conn => conn.selected);
  if (selectedConns.length === 0) {
    alert("Please select at least one device.");
    return;
  }
  if (pendingItems.length === 0) {
    alert("No pending items to send.");
    return;
  }
  selectedConns.forEach(conn => {
    pendingItems.forEach(item => {
      conn.send(item);
    });
  });
  pendingItems = [];
  updatePendingItemsUI();
  if (filePreview) filePreview.style.display = "none"; // Hide preview after sending
  currentlyPreviewing = null;
}

/***********************
 * RECEIVING FILES & TEXT
 ***********************/
// Helper: find connection info for a sender by peer ID.
function getConnectionByPeerId(peerId) {
  return connections.find(conn => conn.peer === peerId);
}
function displayIncomingFile(peerId, data) {
  const div = document.createElement("div");
  div.className = "incoming-item";
  const a = document.createElement("a");
  a.href = data.data;
  a.download = data.name;
  a.innerText = `File from ${peerId}: ${data.name}`;
  div.appendChild(a);
  document.getElementById("incomingList").appendChild(div);
}
function displayIncomingText(peerId, data) {
  const div = document.createElement("div");
  div.className = "incoming-item";
  div.innerText = `Text from ${peerId}: ${data.message}`;
  document.getElementById("incomingList").appendChild(div);
}
// Clear received items
const clearReceivedBtn = document.getElementById("clearReceivedBtn");
if (clearReceivedBtn) {
  clearReceivedBtn.addEventListener("click", () => {
    document.getElementById("incomingList").innerHTML = "";
  });
}
