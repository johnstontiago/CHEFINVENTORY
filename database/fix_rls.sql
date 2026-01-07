-- ============================================
-- CORRECCIÓN DE POLÍTICAS RLS
-- Ejecuta esto en Supabase SQL Editor
-- ============================================

-- Eliminar la política restrictiva de usuarios
DROP POLICY IF EXISTS "Usuarios: superuser puede insertar" ON usuarios;

-- Crear nueva política que permite a usuarios crear su propio perfil
CREATE POLICY "Usuarios: puede crear propio perfil" ON usuarios 
    FOR INSERT 
    WITH CHECK (id = auth.uid());

-- También necesitamos permitir que usuarios vean su propio perfil sin importar el rol
DROP POLICY IF EXISTS "Usuarios: ver propio perfil" ON usuarios;
CREATE POLICY "Usuarios: ver propio perfil" ON usuarios 
    FOR SELECT 
    USING (id = auth.uid() OR get_user_role() IN ('superuser', 'admin'));

-- Permitir a usuarios actualizar su propio perfil
DROP POLICY IF EXISTS "Usuarios: actualizar propio perfil" ON usuarios;
CREATE POLICY "Usuarios: actualizar propio perfil" ON usuarios 
    FOR UPDATE 
    USING (id = auth.uid() OR get_user_role() = 'superuser');
