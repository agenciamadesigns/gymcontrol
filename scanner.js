let escaneando = true;

document.addEventListener("DOMContentLoaded", async () => {
  await verificarSesion();
  iniciarScanner();
});

async function verificarSesion() {
  const { data } = await supabaseClient.auth.getSession();

  if (!data.session) {
    window.location.href = "index.html";
  }
}

function iniciarScanner() {
  const scanner = new Html5QrcodeScanner("reader", {
    fps: 10,
    qrbox: 250
  });

  scanner.render(async (decodedText) => {
    if (!escaneando) return;

    escaneando = false;

    await validarAcceso(decodedText);

    setTimeout(() => {
      escaneando = true;
    }, 3000);
  });
}

async function validarAcceso(qrToken) {
  const resultado = document.getElementById("resultado");

  const { data: cliente, error } = await supabaseClient
    .from("clientes")
    .select("*")
    .eq("qr_token", qrToken)
    .single();

  if (error || !cliente) {
    sonidoSuave("error");

    resultado.innerHTML = `
      <h2>❌ QR no válido</h2>
      <p>Cliente no encontrado</p>
    `;
    resultado.className = "resultado denegado";

    mostrarAlertaScan("❌ QR no válido", "Cliente no encontrado", "error");
    mostrarOverlayAcceso("error", "QR no válido", "Cliente no encontrado");
    return;
  }

  const hoy = new Date();
  const vencimiento = new Date(cliente.fecha_vencimiento + "T00:00:00");

  const diferenciaMs = vencimiento - new Date(hoy.toISOString().split("T")[0] + "T00:00:00");
  const diasRestantes = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));

  const accesoPermitido =
    cliente.estado === "Activo" &&
    diasRestantes >= 0;

  const textoResultado = accesoPermitido ? "Permitido" : "Denegado";

  await supabaseClient.from("accesos").insert([
    {
      cliente_id: cliente.id,
      resultado: textoResultado
    }
  ]);

  if (accesoPermitido) {
    sonidoSuave("ok");

    let mensajeDias = "";

    if (diasRestantes === 0) {
      mensajeDias = "La membresía vence hoy";
      mostrarAlertaScan("⚠️ Acceso permitido", `${cliente.nombre} vence hoy`, "warning");
    } else if (diasRestantes === 1) {
      mensajeDias = "Falta 1 día para el pago";
      mostrarAlertaScan("⚠️ Acceso permitido", `${cliente.nombre}: falta 1 día para el pago`, "warning");
      mostrarOverlayAcceso("warning", cliente.nombre, "Falta 1 día para el pago");
    } else {
      mensajeDias = `Quedan ${diasRestantes} días de membresía`;
      mostrarAlertaScan("✅ Acceso permitido", cliente.nombre, "ok");
      mostrarOverlayAcceso("ok", cliente.nombre, mensajeDias);
    }

    resultado.innerHTML = `
      <h2>✅ ACCESO PERMITIDO</h2>
      <h3>${cliente.nombre}</h3>
      <p>Membresía: ${cliente.tipo_membresia}</p>
      <p>Vence: ${cliente.fecha_vencimiento}</p>
      <strong>${mensajeDias}</strong>
    `;
    resultado.className = diasRestantes <= 1 ? "resultado advertencia" : "resultado permitido";

  } else {
    sonidoSuave("error");

    resultado.innerHTML = `
      <h2>❌ ACCESO DENEGADO</h2>
      <h3>${cliente.nombre}</h3>
      <p>La membresía está vencida o suspendida</p>
      <p>Venció: ${cliente.fecha_vencimiento}</p>
    `;
    resultado.className = "resultado denegado";

    mostrarAlertaScan("❌ Acceso denegado", `${cliente.nombre} tiene membresía vencida`, "error");
    mostrarOverlayAcceso("error", cliente.nombre, "Membresía vencida o suspendida");
  }
}

function sonidoSuave(tipo) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  if (tipo === "ok") {
    oscillator.frequency.value = 660;
  } else if (tipo === "error") {
    oscillator.frequency.value = 220;
  } else {
    oscillator.frequency.value = 440;
  }

  gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);

  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + 0.18);
}

function mostrarAlertaScan(titulo, texto, tipo) {
  const alerta = document.getElementById("alertaScan");

  alerta.className = `alerta-scan alerta-${tipo} activa`;

  alerta.innerHTML = `
    <strong>${titulo}</strong>
    <span>${texto}</span>
  `;

  setTimeout(() => {
    alerta.classList.remove("activa");
  }, 3500);
}

let audioScannerActivo = false;
let audioCtxScanner = null;

function activarSonidoScanner() {
  audioCtxScanner = new (window.AudioContext || window.webkitAudioContext)();
  audioScannerActivo = true;
  sonidoSuave("ok");
  alert("Sonido activado");
}

function sonidoSuave(tipo) {
  if (!audioScannerActivo || !audioCtxScanner) return;

  const oscillator = audioCtxScanner.createOscillator();
  const gainNode = audioCtxScanner.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtxScanner.destination);

  oscillator.frequency.value = tipo === "ok" ? 660 : 220;

  gainNode.gain.setValueAtTime(0.05, audioCtxScanner.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtxScanner.currentTime + 0.22);

  oscillator.start(audioCtxScanner.currentTime);
  oscillator.stop(audioCtxScanner.currentTime + 0.22);
}

function mostrarOverlayAcceso(tipo, nombre, detalle) {
  const overlay = document.getElementById("overlayAcceso");
  const card = document.getElementById("overlayCard");
  const icono = document.getElementById("overlayIcono");
  const titulo = document.getElementById("overlayTitulo");
  const nombreEl = document.getElementById("overlayNombre");
  const detalleEl = document.getElementById("overlayDetalle");

  card.className = `overlay-card overlay-${tipo}`;

  if (tipo === "ok") {
    icono.textContent = "✅";
    titulo.textContent = "ACCESO PERMITIDO";
  } else if (tipo === "warning") {
    icono.textContent = "⚠️";
    titulo.textContent = "ACCESO PERMITIDO";
  } else {
    icono.textContent = "❌";
    titulo.textContent = "ACCESO DENEGADO";
  }

  nombreEl.textContent = nombre;
  detalleEl.textContent = detalle;

  overlay.classList.add("activo");

  setTimeout(() => {
    overlay.classList.remove("activo");
  }, 3000);
}