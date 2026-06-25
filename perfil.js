document.addEventListener("DOMContentLoaded", cargarPerfilCliente);

async function cargarPerfilCliente() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const contenedor = document.getElementById("perfilCliente");

  if (!id) {
    contenedor.innerHTML = "Cliente no encontrado";
    return;
  }

  const { data: cliente, error } = await supabaseClient
    .from("clientes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !cliente) {
    contenedor.innerHTML = "Error al cargar cliente";
    console.log(error);
    return;
  }

  const { data: accesos } = await supabaseClient
    .from("accesos")
    .select("*")
    .eq("cliente_id", id)
    .order("fecha", { ascending: false })
    .limit(10);

  const hoy = new Date().toISOString().split("T")[0];
  const vencido = cliente.fecha_vencimiento < hoy;

  contenedor.innerHTML = `
    <div class="perfil-header">
      <img class="perfil-foto" src="${cliente.foto_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(cliente.nombre) + '&background=eef2ff&color=3730a3'}">

      <div>
        <span class="${vencido ? 'vencido' : 'activo'}">
          ${vencido ? 'Membresía vencida' : 'Membresía activa'}
        </span>
        <h1>${cliente.nombre}</h1>
        <p>${cliente.telefono || "Sin teléfono"}</p>
        <p>${cliente.email || "Sin correo"}</p>
      </div>
    </div>

    <div class="perfil-grid">
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
    </div>

    <div class="perfil-qr">
      <h3>QR del cliente</h3>
      <canvas id="qrPerfil"></canvas>
    </div>

    <div class="historial-card">
      <h3>Últimos accesos</h3>
      ${
        accesos && accesos.length
          ? accesos.map(acceso => `
              <div class="acceso-row">
                <span>${new Date(acceso.fecha).toLocaleString("es-MX")}</span>
                <strong>${acceso.resultado}</strong>
              </div>
            `).join("")
          : "<p>No hay accesos registrados</p>"
      }
    </div>
  `;

  QRCode.toCanvas(document.getElementById("qrPerfil"), cliente.qr_token, {
    width: 180
  });
}