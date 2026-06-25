async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const mensaje = document.getElementById("mensaje");

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    mensaje.textContent = "Correo o contraseña incorrectos";
    mensaje.style.color = "red";
    return;
  }

  window.location.href = "admin.html";
}