const SUPABASE_URL = "https://jijycnrstdxswyiemyqv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppanljbnJzdGR4c3d5aWVteXF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMTU2NzIsImV4cCI6MjA5Nzg5MTY3Mn0.d4HyCnybgVmMOY0vd-Ppmn18kUWfe6CVCeuwXXOJmIM";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);