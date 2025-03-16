document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".menu-item").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".menu-item").forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            document.querySelectorAll(".main-content").forEach(page => page.classList.remove("active"));
            document.getElementById(tab.dataset.tab).classList.add("active");
        });
    });

    const themeSelect = document.getElementById("themeSelect");

    function setTheme(theme) {
        document.body.classList.remove("theme-dark", "theme-light", "theme-blue", "theme-solarized");
        document.body.classList.add("theme-" + theme);
    }

    themeSelect.addEventListener("change", (e) => {
        setTheme(e.target.value);
        localStorage.setItem("theme", e.target.value);
    });

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
            if (data.type === "file-chunk") receiveFileChunk(conn.peer, data);
            else if (data.type === "text") displayIncomingText(conn.peer, data);
        });
        conn.on("close", () => {
            connections = connections.filter(c => c.peer !== conn.peer);
            renderDiscoveredPeers();
        });
        renderDiscoveredPeers();
    }

    function renderDiscoveredPeers() {
        const deviceList = document.getElementById("deviceList");
        deviceList.innerHTML = "";
        if (!connections.length) {
            deviceList.innerText = "(No devices found)";
            return;
        }
        connections.forEach(conn => {
            const div = document.createElement("div");
            div.className = "device" + (conn.selected ? " selected" : "");
            div.innerHTML = `<span>${conn.peer}</span>`;
            div.addEventListener("click", () => {
                conn.selected = !conn.selected;
                renderDiscoveredPeers();
            });
            deviceList.appendChild(div);
        });
    }

    let pendingItems = [];

    function updatePendingItemsUI() {
        const pendingContainer = document.getElementById("pendingItems");
        pendingContainer.innerHTML = pendingItems.length ? "" : "(No pending items)";
        pendingItems.forEach((item, index) => {
            const div = document.createElement("div");
            div.className = "pending-item";
            div.innerHTML = item.type === "file"
                ? `<i class="fas fa-file icon"></i> ${item.name}`
                : `<i class="fas fa-font icon"></i> ${item.message}`;
            const removeBtn = document.createElement("button");
            removeBtn.innerText = "❌";
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

    document.getElementById("sendAllBtn").addEventListener("click", () => {
        sendAll();
    });

    function sendAll() {
        const selectedConns = connections.filter(conn => conn.selected);
        if (!selectedConns.length) return alert("Select at least one device.");
        if (!pendingItems.length) return alert("No files or messages to send.");
        pendingItems.forEach(item => {
            selectedConns.forEach(conn => {
                sendFileChunks(conn, item);
            });
        });
        pendingItems = [];
        updatePendingItemsUI();
    }

    function sendFileChunks(conn, file) {
        const chunkSize = 16 * 1024;
        let offset = 0;
        function sendNextChunk() {
            if (offset < file.data.length) {
                const chunk = file.data.slice(offset, offset + chunkSize);
                conn.send({ type: "file-chunk", name: file.name, data: chunk, last: offset + chunkSize >= file.data.length });
                offset += chunkSize;
                setTimeout(sendNextChunk, 50);
            }
        }
        sendNextChunk();
    }

    let receivedFiles = {};

    function receiveFileChunk(sender, chunk) {
        if (!receivedFiles[sender]) receivedFiles[sender] = { name: chunk.name, data: "" };
        receivedFiles[sender].data += chunk.data;
        if (chunk.last) {
            displayIncomingFile(sender, { name: chunk.name, data: receivedFiles[sender].data });
            delete receivedFiles[sender];
        }
    }

    function displayIncomingFile(sender, data) {
        const incomingContainer = document.getElementById("incomingList");
        incomingContainer.innerHTML += `<div class="incoming-item"><i class="fas fa-file icon"></i> ${data.name} from ${sender} 
            <a href="${data.data}" download="${data.name}">Download</a></div>`;
    }

    function displayIncomingText(sender, data) {
        const div = document.createElement("div");
        div.className = "incoming-item";
        div.innerHTML = `<i class="fas fa-font icon"></i> "${data.message}" from ${sender}`;
        document.getElementById("incomingList").appendChild(div);
    }

    document.getElementById("clearReceivedBtn").addEventListener("click", () => {
        document.getElementById("incomingList").innerHTML = "<p>Waiting for incoming files/messages…</p>";
    });

    document.getElementById("myIDDisplay").innerText = myID;

    setInterval(() => {
        if (!connections.some(conn => conn.selected)) {
            renderDiscoveredPeers();
        }
    }, 1000);
});
