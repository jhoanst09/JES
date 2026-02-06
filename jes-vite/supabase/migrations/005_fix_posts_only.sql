-- =============================================
-- FIX SIMPLE PARA POSTS - EJECUTAR EN SUPABASE
-- =============================================

-- 1. ELIMINAR TODAS las políticas existentes de posts
DROP POLICY IF EXISTS "posts_select_all" ON posts;
DROP POLICY IF EXISTS "posts_insert_own" ON posts;
DROP POLICY IF EXISTS "posts_update_own" ON posts;
DROP POLICY IF EXISTS "posts_delete_own" ON posts;
DROP POLICY IF EXISTS "Anyone can view posts" ON posts;
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts;
DROP POLICY IF EXISTS "Users can view all posts" ON posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;
DROP POLICY IF EXISTS "Users can create their own posts" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;
DROP POLICY IF EXISTS "Enable read access for all users" ON posts;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON posts;

-- 2. Deshabilitar RLS temporalmente para ver si funciona
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;

-- 3. Habilitar RLS de nuevo
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas SUPER simples
-- SELECT: todos pueden ver
CREATE POLICY "allow_select_all" ON posts
FOR SELECT USING (true);

-- INSERT: usuarios autenticados (auth.uid() no es null) pueden insertar
-- Y el user_id debe coincidir con su ID
CREATE POLICY "allow_insert_own" ON posts
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: solo el dueño
CREATE POLICY "allow_update_own" ON posts
FOR UPDATE USING (auth.uid() = user_id);

-- DELETE: solo el dueño
CREATE POLICY "allow_delete_own" ON posts
FOR DELETE USING (auth.uid() = user_id);

-- 5. Verificar que se crearon
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'posts';
