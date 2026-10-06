import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// La clave de servidor vive en los secretos de Supabase y nunca se envía a Angular.
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return respond({ error: 'Método no permitido.' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anonKey || !serviceKey) throw new Error('Falta configuración de Supabase en la Edge Function.');
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return respond({ error: 'Sesión requerida.' }, 401);
    const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await callerClient.auth.getUser();
    if (authError || !user) return respond({ error: 'Sesión inválida.' }, 401);
    const adminClient = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: actor, error: actorError } = await adminClient.from('perfiles').select('rol').eq('id', user.id).single();
    if (actorError || actor?.rol !== 'admin') return respond({ error: 'Solo un administrador puede crear usuarios privilegiados.' }, 403);

    const body = await request.json();
    const nombre = String(body.nombre ?? '').trim();
    const apellido = String(body.apellido ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const rol = String(body.rol ?? '');
    if (!nombre || nombre.length > 80 || !apellido || apellido.length > 80
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      || !password.trim() || password.length < 8 || !['empleado', 'admin'].includes(rol)) {
      return respond({ error: 'Completá nombre, apellido, un correo válido, una contraseña de al menos 8 caracteres y un rol permitido.' }, 400);
    }
    // El trigger handle_new_user crea primero el perfil con rol cliente.
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { nombre, apellido },
    });
    if (createError || !created.user) throw createError ?? new Error('No se pudo crear la cuenta de autenticación.');
    const { data: profile, error: profileError } = await adminClient.from('perfiles').upsert({
      id: created.user.id, email, nombre, apellido, rol,
    }).select('id, rol').single();
    if (profileError || profile?.rol !== rol) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      throw profileError ?? new Error('Supabase no confirmó el rol solicitado en el perfil del usuario.');
    }
    await adminClient.from('log_actividad').insert({
      usuario_id: user.id, accion: 'CREAR_USUARIO_PRIVILEGIADO',
      detalle: `Correo ${email}; rol ${rol}`, fecha_hora: new Date().toISOString(),
    });
    return respond({ id: created.user.id, email, rol }, 201);
  } catch (error) {
    return respond({ error: error instanceof Error ? error.message : 'Error interno al crear el usuario.' }, 400);
  }
});

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
