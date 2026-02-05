const form = document.getElementById("form");
const statusText = document.getElementById("network-status");
const countText = document.getElementById("pending-count");
const STORAGE_KEY = "pendientes_seguros";

const API_URL = "https://script.google.com/macros/s/AKfycbzZhcQ7taSMGIJUB2MuOO9TLt2Z2tmWHJ7qP_vA6PgLkX_h-d9cAnoXUs0V6HQ3dUajXQ/exec";

// Candado lógico
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
  // Agregamos un ID único para evitar que registros idénticos se confundan
  const dataConId = { ...d, uid: Date.now() + Math.random() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...current, dataConId]));
  updateUI();
};

async function sendToCloud(d) {
  await fetch(API_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(d)
  });
}

async function sync() {
  // 1. Verificación estricta del candado
  if (isSyncing || !navigator.onLine) return;
  
  const items = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  if (items.length === 0) return;

  isSyncing = true; 

  // 2. Usamos una copia local para el bucle
  let queue = [...items];

  while (queue.length > 0) {
    const item = queue[0];
    try {
      await sendToCloud(item);
      
      // 3. Eliminación inmediata del elemento procesado del STORAGE REAL
      let currentItems = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      // Filtramos por el UID único que creamos
      currentItems = currentItems.filter(i => i.uid !== item.uid);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentItems));
      
      // Actualizamos la cola del bucle
      queue.shift();
      updateUI();

      // 4. Pausa de seguridad (aumentada a 1 segundo para el servidor de Google)
      await new Promise(res => setTimeout(res, 1000)); 
    } catch (e) {
      console.error("Fallo en envío", e);
      break; 
    }
  }

  isSyncing = false; 
}

form.addEventListener("submit", async e => {
  e.preventDefault();

  // 5. BLOQUEO FÍSICO DEL BOTÓN (Evita el doble clic del usuario)
  const submitBtn = form.querySelector("button");
  submitBtn.disabled = true;
  submitBtn.style.opacity = "0.5";

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
      text: 'Sincronizando...', 
      timer: 1500, 
      showConfirmButton: false 
    });
    await sync();
  } else {
    Swal.fire({ 
      icon: 'info', 
      title: 'Guardado Local', 
      text: 'Se subirá cuando detecte internet.' 
    });
  }

  // Liberamos el botón
  submitBtn.disabled = false;
  submitBtn.style.opacity = "1";
});

// Usamos un pequeño retraso al cargar para no chocar con otros procesos
window.addEventListener("load", () => setTimeout(updateUI, 500));
window.addEventListener("online", updateUI);
window.addEventListener("offline", updateUI);