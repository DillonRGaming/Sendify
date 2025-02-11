document.addEventListener("DOMContentLoaded", () => {
    /***********************
     * TAB NAVIGATION
     ***********************/
    document.querySelectorAll(".menu-item").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".menu-item").forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            document.querySelectorAll(".main-content").forEach(page => page.classList.remove("active"));
            document.getElementById(tab.dataset.tab).classList.add("active");
        });
    });

    /***********************
     * THEME & SETTINGS
     ***********************/
    const themeSelect = document.getElementById("themeSelect");
    const downloadLocationSelect = document.getElementById("downloadLocation");

    function setTheme(theme) {
        document.body.classList.remove("theme-dark", "theme-light", "theme-blue", "theme-solarized");
        document.body.classList.add("theme-" + theme);
    }

    themeSelect.addEventListener("change", (e) => {
        setTheme(e.target.value);
        localStorage.setItem("theme", e.target.value);
    });

    /***********************
     * PEERJS SETUP
     ***********************/
    const WORDS = ["Rocket", "Guitar", "Phoenix"];
    const MAX_NUM = 10;
    const myID = `${WORDS[Math.floor(Math.random() * WORDS.length)]}-${Math.floor(Math.random() * MAX_NUM)}`;
    const peer = new Peer(myID, { host: "0.peerjs.com", port: 443, secure: true });

    let connections = [];

    peer.on("open", () => {
        document.getElementById("myIDDisplay").innerText = myID;
        discoverPeers();
    });

    peer.on("connection", (conn) => {
        handleIncomingConnection(conn);
    });

    /***********************
     * DISCOVER DEVICES
     ***********************/
    function discoverPeers() {
        const possibleIDs = [];
        WORDS.forEach(word => {
            for (let i = 0; i < MAX_NUM; i++) {
                if (`${word}-${i}` !== myID) possibleIDs.push(`${word}-${i}`);
            }
        });

        possibleIDs.forEach(candidate => {
            const conn = peer.connect(candidate, { reliable: true });
            conn.on("open", () => handleIncomingConnection(conn));
        });
    }

    function handleIncomingConnection(conn) {
        if (connections.some(c => c.peer === conn.peer)) return;

        conn.selected = false;
        connections.push(conn);
        conn.on("open", () => conn.send({ type: "handshake" }));

        conn.on("data", (data) => {
            if (data.type === "file-chunk") {
                receiveFileChunk(conn.peer, data);
            } else if (data.type === "text") {
                displayIncomingText(conn.peer, data);
            }
        });

        renderDiscoveredPeers();
    }

    function renderDiscoveredPeers() {
        const deviceList = document.getElementById("deviceList");
        deviceList.innerHTML = "";
        if (connections.length === 0) {
            deviceList.innerHTML = "<p class='text-secondary'>No devices found</p>"; // Use innerHTML for better structure
            return;
        }

        connections.forEach(conn => {
            const div = document.createElement("div");
            div.className = "device" + (conn.selected ? " selected" : "");
            div.innerHTML = `<span>${conn.peer}</span>`; // Use span for better semantic structure
            div.addEventListener("click", () => {
                conn.selected = !conn.selected;
                renderDiscoveredPeers();
            });
            deviceList.appendChild(div);
        });
    }

    /***********************
     * FILE SELECTION
     ***********************/
    let pendingItems = [];

    function updatePendingItemsUI() {
        const pendingContainer = document.getElementById("pendingItems");
        pendingContainer.innerHTML = pendingItems.length ? "" : "<p class='text-secondary'>No pending items</p>"; // Use innerHTML for better structure

        pendingItems.forEach((item, index) => {
            const div = document.createElement("div");
            div.className = "pending-item";
            div.innerHTML = `<i class="fas fa-file icon"></i> ${item.name}`; // Improved file display

            const removeBtn = document.createElement("button");
            removeBtn.className = "remove-btn";
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.addEventListener("click", () => {
                pendingItems.splice(index, 1);
                updatePendingItemsUI();
            });
            div.appendChild(removeBtn);
            pendingContainer.appendChild(div);
        });
    }

    document.getElementById("fileBtn").addEventListener("click", () => document.getElementById("fileInput").click());

    document.getElementById("fileInput").addEventListener("change", (event) => {
        if (event.target.files.length) {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                pendingItems.push({ type: "file", name: file.name, data: e.target.result });
                updatePendingItemsUI();
            };
            reader.readAsDataURL(file);
        }
    });

    // ... (rest of the code)
});
