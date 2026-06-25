document.addEventListener("DOMContentLoaded", () => {
  cargarCliente();
});

async function cargarCliente() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  const estadoCliente = document.getElementById("estadoCliente");
  const qrCanvas = document.getElementById("qrCliente");

  if (!token) {
    estadoCliente.innerHTML = `
      <h2>❌ Link no válido</h2>
      <p>No se encontró credencial.</p>
    `;
    return;
  }

  const { data: cliente, error } = await supabaseClient
    .from("clientes")
    .select("*")
    .eq("qr_token", token)
    .single();

  if (error || !cliente) {
    estadoCliente.innerHTML = `
      <h2>❌ Cliente no encontrado</h2>
      <p>Verifica tu enlace con recepción.</p>
    `;
    return;
  }

  const hoy = new Date().toISOString().split("T")[0];
  const vencido = cliente.fecha_vencimiento < hoy;

  estadoCliente.innerHTML = `
    <h2>${cliente.nombre}</h2>
    <p>Tel: ${cliente.telefono || "No registrado"}</p>
    <p>Membresía: ${cliente.tipo_membresia || "No definida"}</p>
    <p>Vence: ${cliente.fecha_vencimiento}</p>

    <div class="${vencido ? 'badge-vencido' : 'badge-activo'}">
      ${vencido ? 'Membresía vencida' : 'Membresía activa'}
    </div>
  `;

  QRCode.toCanvas(qrCanvas, cliente.qr_token, {
    width: 240,
    margin: 2
  });
}