document.addEventListener("DOMContentLoaded", async () => {

    await verificarSesion();

    await cargarClientes();

    activarRealtime();

});

async function verificarSesion() {
  const { data } = await supabaseClient.auth.getSession();

  if (!data.session) {
    window.location.href = "index.html";
  }
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}

async function registrarCliente() {
  const nombre = document.getElementById("nombre").value;
  const telefono = document.getElementById("telefono").value;
  const email = document.getElementById("emailCliente").value;
  const mesesMembresia = document.getElementById("tipoMembresia").value;
  const tipo_membresia = `${mesesMembresia} ${mesesMembresia == 1 ? "mes" : "meses"}`;
  const fecha_inicio = document.getElementById("fechaInicio").value;
  const fecha_vencimiento = document.getElementById("fechaVencimiento").value;
  const mensaje = document.getElementById("mensajeCliente");

  if (!nombre || !fecha_inicio || !fecha_vencimiento) {
    mensaje.textContent = "Completa los campos obligatorios";
    mensaje.style.color = "red";
    return;
  }

const qr_token = crypto.randomUUID();

const foto_url = await subirFotoCliente();

const { error } = await supabaseClient.from("clientes").insert([
    {
      nombre,
      telefono,
      email,
      tipo_membresia,
      fecha_inicio,
      fecha_vencimiento,
      estado: "Activo",
      qr_token,
      foto_url
    }
  ]);

  if (error) {
    mensaje.textContent = "Error al guardar cliente";
    mensaje.style.color = "red";
    console.log(error);
    return;
  }

  mensaje.textContent = "Cliente registrado correctamente";
  mensaje.style.color = "green";

  document.getElementById("nombre").value = "";
  document.getElementById("telefono").value = "";
  document.getElementById("emailCliente").value = "";
  document.getElementById("tipoMembresia").value = "";
  document.getElementById("fechaInicio").value = "";
  document.getElementById("fechaVencimiento").value = "";

  fotoClienteBlob = null;

document.getElementById("previewFoto").src = "";
document.getElementById("previewFoto").style.display = "none";
document.getElementById("fotoPlaceholder").style.display = "grid";

cerrarModalFoto();
cerrarModalCliente();
siguientePaso(1);
}

async function cargarClientes() {
  const { data, error } = await supabaseClient
    .from("clientes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.log(error);
    return;
  }

  const lista = document.getElementById("listaClientes");
  lista.innerHTML = "";

  let activos = 0;
  let vencidos = 0;

  const hoy = new Date().toISOString().split("T")[0];

  data.forEach(cliente => {
    const vencido = cliente.fecha_vencimiento < hoy;

    if (vencido) {
      vencidos++;
    } else {
      activos++;
    }

    const card = document.createElement("div");
    card.className = "cliente-card";

card.innerHTML = `
  <div class="cliente-info-card">
    <img class="cliente-foto" src="${cliente.foto_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(cliente.nombre) + '&background=eef2ff&color=3730a3'}">

    <div>
      <h3>${cliente.nombre}</h3>
      <p>Tel: ${cliente.telefono || "Sin teléfono"}</p>
      <p>Membresía: ${cliente.tipo_membresia || "No definida"}</p>
      <p>Vence: ${cliente.fecha_vencimiento}</p>
      <p class="${vencido ? 'vencido' : 'activo'}">
        ${vencido ? 'Vencido' : 'Activo'}
      </p>
    </div>
  </div>

  <canvas id="qr-${cliente.id}"></canvas>

  <div class="acciones">
    <button onclick="abrirPerfilCliente('${cliente.id}')">Perfil</button>
    <button onclick="abrirAppCliente('${cliente.qr_token}')">Ver app</button>
    <button onclick="copiarLinkCliente('${cliente.qr_token}')">Copiar link</button>
    <button onclick="renovarCliente('${cliente.id}')">Renovar</button>
    <button onclick="eliminarCliente('${cliente.id}')">Eliminar</button>
  </div>
`;

    lista.appendChild(card);

    QRCode.toCanvas(
      document.getElementById(`qr-${cliente.id}`),
      cliente.qr_token,
      { width: 120 }
    );
  });

  document.getElementById("totalClientes").textContent = data.length;
  document.getElementById("clientesActivos").textContent = activos;
  document.getElementById("clientesVencidos").textContent = vencidos;
}

async function renovarCliente(id) {
  const nuevaFecha = prompt("Nueva fecha de vencimiento, ejemplo: 2026-07-24");

  if (!nuevaFecha) return;

  const { error } = await supabaseClient
    .from("clientes")
    .update({
      fecha_vencimiento: nuevaFecha,
      estado: "Activo"
    })
    .eq("id", id);

  if (error) {
    alert("Error al renovar");
    console.log(error);
    return;
  }

  alert("Membresía renovada");
  await cargarClientes();
}

async function eliminarCliente(id) {
  const confirmar = confirm("¿Seguro que quieres eliminar este cliente?");

  if (!confirmar) return;

  const { error } = await supabaseClient
    .from("clientes")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Error al eliminar");
    console.log(error);
    return;
  }

  await cargarClientes();
}

function abrirAppCliente(token) {
  window.open(`cliente.html?token=${token}`, "_blank");
}

function copiarLinkCliente(token) {
  const url = `${window.location.origin}${window.location.pathname.replace("admin.html", "")}cliente.html?token=${token}`;

  navigator.clipboard.writeText(url)
    .then(() => {
      alert("Link del cliente copiado");
    })
    .catch(() => {
      alert("No se pudo copiar el link");
    });
}

const fechaActual = document.getElementById("fechaActual");

if (fechaActual) {
  fechaActual.textContent = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

let fotoClienteBlob = null;
let streamFoto = null;

async function abrirModalFoto() {
  const modal = document.getElementById("modalFoto");
  const video = document.getElementById("videoFoto");

  modal.classList.add("activo");

  try {
    streamFoto = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user"
      },
      audio: false
    });

    video.srcObject = streamFoto;
  } catch (error) {
    alert("No se pudo abrir la cámara");
    console.log(error);
    cerrarModalFoto();
  }
}

function cerrarModalFoto() {
  const modal = document.getElementById("modalFoto");
  const video = document.getElementById("videoFoto");

  if (streamFoto) {
    streamFoto.getTracks().forEach(track => track.stop());
    streamFoto = null;
  }

  video.srcObject = null;
  modal.classList.remove("activo");
}

function tomarFotoCliente() {
  const video = document.getElementById("videoFoto");
  const canvas = document.getElementById("canvasFoto");
  const preview = document.getElementById("previewFoto");
  const placeholder = document.getElementById("fotoPlaceholder");

  if (!streamFoto) {
    alert("Primero abre la cámara");
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob((blob) => {
    fotoClienteBlob = blob;

    preview.src = URL.createObjectURL(blob);
    preview.style.display = "block";
    placeholder.style.display = "none";

    cerrarModalFoto();
  }, "image/jpeg", 0.85);
}

async function subirFotoCliente() {
  if (!fotoClienteBlob) return null;

  const nombreArchivo = `cliente-${Date.now()}.jpg`;

  const { error } = await supabaseClient.storage
    .from("clientes")
    .upload(nombreArchivo, fotoClienteBlob, {
      contentType: "image/jpeg"
    });

  if (error) {
    console.log(error);
    alert("Error al subir la foto");
    return null;
  }

  const { data } = supabaseClient.storage
    .from("clientes")
    .getPublicUrl(nombreArchivo);

  return data.publicUrl;
}

function abrirModalCliente() {
  document.getElementById("modalCliente").classList.add("activo");
  siguientePaso(1);
  ponerFechaInicioHoy();
}

function cerrarModalCliente() {
  document.getElementById("modalCliente").classList.remove("activo");
}

let pasoActual = 1;

function siguientePaso(numero) {
  pasoActual = numero;

  document.querySelectorAll(".wizard-step").forEach(step => {
    step.classList.remove("activo");
  });

  document.getElementById(`paso${numero}`).classList.add("activo");

  actualizarWizard();
}

function actualizarWizard() {
  const progreso = {
    1: "25%",
    2: "50%",
    3: "75%",
    4: "100%"
  };

  document.getElementById("wizardBar").style.width = progreso[pasoActual];

  document.querySelectorAll(".wizard-steps-labels span").forEach(label => {
    label.classList.remove("activo-step");
  });

  document.getElementById(`labelPaso${pasoActual}`).classList.add("activo-step");
}

function prepararResumen() {
  const nombre = document.getElementById("nombre").value;
  const telefono = document.getElementById("telefono").value;
  const email = document.getElementById("emailCliente").value;
  const meses = document.getElementById("tipoMembresia").value;
  const tipo = `${meses} ${meses == 1 ? "mes" : "meses"}`;
  const inicio = document.getElementById("fechaInicio").value;
  const vencimiento = document.getElementById("fechaVencimiento").value;

  if (!nombre || !inicio || !vencimiento) {
    alert("Completa nombre, fecha de inicio y vencimiento");
    return;
  }

  document.getElementById("resumenCliente").innerHTML = `
    <div><strong>Nombre:</strong><span>${nombre}</span></div>
    <div><strong>Teléfono:</strong><span>${telefono || "Sin teléfono"}</span></div>
    <div><strong>Correo:</strong><span>${email || "Sin correo"}</span></div>
    <div><strong>Membresía:</strong><span>${tipo || "No definida"}</span></div>
    <div><strong>Inicio:</strong><span>${inicio}</span></div>
    <div><strong>Vencimiento:</strong><span>${vencimiento}</span></div>
    <div><strong>Foto:</strong><span>${fotoClienteBlob ? "Foto capturada" : "Sin foto"}</span></div>
  `;

  siguientePaso(4);
}

function activarRealtime() {
  supabaseClient
    .channel("clientes-realtime")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "clientes"
      },
      async (payload) => {
        console.log("Cambio en clientes:", payload);
        await cargarClientes();
      }
    )
    .subscribe();

  supabaseClient
    .channel("accesos-realtime")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "accesos"
      },
      (payload) => {
        console.log("Nuevo acceso:", payload);
      }
    )
    .subscribe();
}

async function abrirPerfilCliente(id) {
  const modal = document.getElementById("modalPerfil");
  const contenido = document.getElementById("contenidoPerfil");

  modal.classList.add("activo");

  contenido.innerHTML = "Cargando perfil...";

  const { data: cliente, error } = await supabaseClient
    .from("clientes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !cliente) {
    contenido.innerHTML = `
      <h2>Error al cargar cliente</h2>
      <p>No se pudo encontrar la información.</p>
    `;
    console.log(error);
    return;
  }

  const { data: accesos } = await supabaseClient
    .from("accesos")
    .select("*")
    .eq("cliente_id", id)
    .order("fecha", { ascending: false })
    .limit(8);

  const hoy = new Date().toISOString().split("T")[0];
  const vencido = cliente.fecha_vencimiento < hoy;

  const foto = cliente.foto_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(cliente.nombre)}&background=eef2ff&color=3730a3`;

  contenido.innerHTML = `
    <div class="perfil-modal-header">
      <img src="${foto}" class="perfil-modal-foto">

      <div>
        <span class="${vencido ? 'vencido' : 'activo'}">
          ${vencido ? 'Membresía vencida' : 'Membresía activa'}
        </span>

        <h2>${cliente.nombre}</h2>
        <p>${cliente.telefono || "Sin teléfono"}</p>
        <p>${cliente.email || "Sin correo"}</p>
      </div>
    </div>

    <div class="perfil-tabs">
      <button class="tab-activa" onclick="mostrarTabPerfil('info')">Información</button>
      <button onclick="mostrarTabPerfil('accesos')">Accesos</button>
      <button onclick="mostrarTabPerfil('qr')">QR</button>
    </div>

    <div id="tab-info" class="perfil-tab activo-tab">
      <div class="perfil-grid-modal">
        <div>
          <h3>Membresía</h3>
          <p>${cliente.tipo_membresia || "No definida"}</p>
        </div>

        <div>
          <h3>Inicio</h3>
          <p>${cliente.fecha_inicio}</p>
        </div>

        <div>
          <h3>Vencimiento</h3>
          <p>${cliente.fecha_vencimiento}</p>
        </div>

        <div>
          <h3>Estado</h3>
          <p>${vencido ? "Vencido" : "Activo"}</p>
        </div>
      </div>
    </div>

    <div id="tab-accesos" class="perfil-tab">
      <h3>Últimos accesos</h3>

      ${
        accesos && accesos.length
          ? accesos.map(acceso => `
              <div class="acceso-row">
                <span>${new Date(acceso.fecha).toLocaleString("es-MX")}</span>
                <strong>${acceso.resultado}</strong>
              </div>
            `).join("")
          : "<p>No hay accesos registrados.</p>"
      }
    </div>

    <div id="tab-qr" class="perfil-tab">
      <h3>QR del cliente</h3>
      <canvas id="qrPerfilModal"></canvas>
      <p class="muted">Este código se usa para validar el acceso.</p>
    </div>

    <div class="perfil-modal-actions">
      <button onclick="renovarCliente('${cliente.id}')">Renovar</button>
      <button onclick="abrirAppCliente('${cliente.qr_token}')">Ver app</button>
      <button onclick="copiarLinkCliente('${cliente.qr_token}')">Copiar link</button>
      <button class="btn-danger" onclick="eliminarCliente('${cliente.id}')">Eliminar</button>
    </div>
  `;

  QRCode.toCanvas(
    document.getElementById("qrPerfilModal"),
    cliente.qr_token,
    { width: 180 }
  );
}

function cerrarPerfilCliente() {
  document.getElementById("modalPerfil").classList.remove("activo");
}

function mostrarTabPerfil(tab) {
  document.querySelectorAll(".perfil-tab").forEach(item => {
    item.classList.remove("activo-tab");
  });

  document.querySelectorAll(".perfil-tabs button").forEach(btn => {
    btn.classList.remove("tab-activa");
  });

  document.getElementById(`tab-${tab}`).classList.add("activo-tab");

  event.target.classList.add("tab-activa");
}

function ponerFechaInicioHoy() {
  const fechaInicio = document.getElementById("fechaInicio");

  if (!fechaInicio) return;

  const hoy = new Date();
  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth() + 1).padStart(2, "0");
  const dd = String(hoy.getDate()).padStart(2, "0");

  fechaInicio.value = `${yyyy}-${mm}-${dd}`;

  calcularVencimiento();
}

function calcularVencimiento() {
  const fechaInicioInput = document.getElementById("fechaInicio");
  const fechaVencimientoInput = document.getElementById("fechaVencimiento");
  const tipoMembresiaInput = document.getElementById("tipoMembresia");

  if (!fechaInicioInput || !fechaVencimientoInput || !tipoMembresiaInput) return;

  const fechaInicio = fechaInicioInput.value;
  const meses = parseInt(tipoMembresiaInput.value);

  if (!fechaInicio || !meses) return;

  const fecha = new Date(fechaInicio + "T00:00:00");
  fecha.setMonth(fecha.getMonth() + meses);

  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const dd = String(fecha.getDate()).padStart(2, "0");

  fechaVencimientoInput.value = `${yyyy}-${mm}-${dd}`;
}