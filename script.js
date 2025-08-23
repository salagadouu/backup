const tilesBase = "tiles";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const timeline = document.getElementById("timeline");

// Pan & zoom state
let offsetX = 0,
    offsetY = 0;
let scale = 1;
let isDragging = false,
    lastX,
    lastY;

function resizeCanvas()
{
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    redraw();
}
window.addEventListener("resize", resizeCanvas);

// Draw tiles  
let currentTiles = [];
let minX = 0,
    minY = 0,
    maxX = 0,
    maxY = 0,
    tileSize = 0;

let previousTiles = [];

function redraw()
{
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    // draw old tiles behind, then new ones
    for (const t of previousTiles) if (t.img.complete)
    {
        ctx.drawImage(t.img, (t.x - minX) * tileSize, (t.y - minY) * tileSize, tileSize, tileSize);
    }
    for (const t of currentTiles) if (t.img.complete)
    {
        ctx.drawImage(t.img, (t.x - minX) * tileSize, (t.y - minY) * tileSize, tileSize, tileSize);
    }
}

// Pan & zoom interactions
canvas.addEventListener("mousedown", (e) =>
{
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
});
window.addEventListener("mouseup", () => (isDragging = false));
window.addEventListener("mousemove", (e) =>
{
    if (!isDragging) return;
    offsetX += e.clientX - lastX;
    offsetY += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    redraw();
});
canvas.addEventListener("wheel", (e) =>
{
    e.preventDefault();
    const zoom = e.deltaY < 0 ? 1.1 : 0.9;
    const mouseX = (e.clientX - offsetX) / scale;
    const mouseY = (e.clientY - offsetY) / scale;
    scale *= zoom;
    offsetX = e.clientX - mouseX * scale;
    offsetY = e.clientY - mouseY * scale;
    redraw();
});

async function loadFolder(folder, btn)
{
    document.querySelectorAll("header button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const index = await fetch(`${tilesBase}/index.json`).then(r => r.json());
    const files = index[folder];

    previousTiles = currentTiles;
    currentTiles = [];

    const firstImg = new Image();
    firstImg.src = `${tilesBase}/${folder}/${files[0]}`;
    await new Promise(res => firstImg.onload = res);
    tileSize = firstImg.width;

    let loadedCount = 0;
    for (const name of files)
    {
        const [x, y] = name.replace(".png", "").split("_").map(Number);
        const img = new Image();
        img.src = `${tilesBase}/${folder}/${name}`;
        img.onload = () =>
        {
            loadedCount++;
            redraw();
            if (loadedCount > files.length / 2) previousTiles = [];
        };
        currentTiles.push({ x, y, img });
    }

    // update bounds
    minX = Math.min(...currentTiles.map(t => t.x));
    maxX = Math.max(...currentTiles.map(t => t.x));
    minY = Math.min(...currentTiles.map(t => t.y));
    maxY = Math.max(...currentTiles.map(t => t.y));

    // center only on first folder load
    if (scale === 1 && offsetX === 0 && offsetY === 0)
    {
        offsetX = (canvas.width / window.devicePixelRatio - (maxX - minX + 1) * tileSize) / 2;
        offsetY = (canvas.height / window.devicePixelRatio - (maxY - minY + 1) * tileSize) / 2;
    }

    redraw();
}

async function init()
{
    resizeCanvas();
    const index = await fetch(`${tilesBase}/index.json`).then(r => r.json());
    const folders = Object.keys(index).sort();

    for (const folder of folders)
    {
        const btn = document.createElement("button");
        btn.textContent = folder;
        btn.onclick = () => loadFolder(folder, btn);
        timeline.appendChild(btn);
    }

    if (folders.length) loadFolder(folders[folders.length - 1], timeline.lastChild);
}

init();