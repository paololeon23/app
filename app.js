const form = document.getElementById("form");
const statusText = document.getElementById("network-status");
const countText = document.getElementById("pending-count");
const STORAGE_KEY = "pendientes_seguros";

const API_URL = "https://script.google.com/macros/s/AKfycbzZhcQ7taSMGIJUB2MuOO9TLt2Z2tmWHJ7qP_vA6PgLkX_h-d9cAnoXUs0V6HQ3dUajXQ/exec";

// CANDADO: Evita que se disparen varias sincronizaciones a la vez
let isSyncing = false;

function updateUI() {
  const items = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  countText.textContent = `Pendientes: ${items.length}`;
  
  if (navigator.onLine) {
    statusText.textContent = "● En línea";
    statusText.className = "online";
    sync(); 
  } else {
    statusText.textContent = "● Sin conexión";
    statusText.className = "offline";
  }
}

const saveLocal = d => {
  const current = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...current, d]));
  updateUI();
};

async function sendToCloud(d) {
  // El modo no-cors es necesario para Google Apps Script
  await fetch(API_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(d)
  });
}

async function sync() {
  // Si ya se está sincronizando o no hay internet, salir
  if (isSyncing || !navigator.onLine) return;
  
  const items = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  if (!items.length) return;

  isSyncing = true; // ACTIVAR CANDADO

  // Procesamos estrictamente UNO POR UNO
  while (items.length > 0) {
    const item = items[0]; // Tomar el primero de la fila
    try {
      await sendToCloud(item);
      items.shift(); // Si se subió, eliminarlo de la memoria
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      updateUI();
      // Pequeña pausa de medio segundo para no saturar el Excel
      await new Promise(res => setTimeout(res, 500)); 
    } catch (e) {
      console.error("Fallo en envío", e);
      break; 
    }
  }

  isSyncing = false; // DESACTIVAR CANDADO
}

form.addEventListener("submit", async e => {
  e.preventDefault();

  const data = {
    nombre: document.getElementById("nombre").value.trim(),
    apellido: document.getElementById("apellido").value.trim(),
    edad: document.getElementById("edad").value.trim(),
    fecha: new Date().toLocaleString()
  };

  saveLocal(data);
  form.reset();

  if (navigator.onLine) {
    Swal.fire({ 
      icon: 'success', 
      title: 'Registrado', 
      text: 'Enviando...', 
      timer: 1500, 
      showConfirmButton: false,
      backdrop: `rgba(0,115,177,0.1)` 
    });
    await sync();
  } else {
    Swal.fire({ 
      icon: 'info', 
      title: 'Modo Offline', 
      text: 'Guardado. Se subirá al detectar internet.' 
    });
  }
});

window.addEventListener("online", updateUI);
window.addEventListener("offline", updateUI);
window.addEventListener("load", updateUI);