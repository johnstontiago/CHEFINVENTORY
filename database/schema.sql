-- ============================================
-- CHEFMANAGER - ESQUEMA DE BASE DE DATOS
-- Supabase PostgreSQL
-- Versión: 1.0
-- ============================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLAS DE CONFIGURACIÓN
-- ============================================

-- Unidades/Restaurantes
CREATE TABLE unidades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL UNIQUE,
    direccion TEXT,
    telefono VARCHAR(20),
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categorías de productos
CREATE TABLE categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(50) NOT NULL UNIQUE,
    icono VARCHAR(10) DEFAULT '📦',
    orden INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proveedores
CREATE TABLE proveedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    contacto VARCHAR(100),
    telefono VARCHAR(20),
    email VARCHAR(100),
    notas TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Productos
CREATE TABLE productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    marca VARCHAR(100),
    categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
    formato VARCHAR(100), -- ej: "Caja 6u", "Saco 25kg"
    unidad_medida VARCHAR(20) DEFAULT 'unidad', -- unidad, kg, litro, caja
    proveedor_id UUID REFERENCES proveedores(id) ON DELETE SET NULL,
    precio_referencia DECIMAL(10,2),
    stock_minimo INT DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLAS DE USUARIOS Y ROLES
-- ============================================

-- Roles disponibles
CREATE TYPE rol_usuario AS ENUM ('superuser', 'admin', 'recepcion', 'cocina', 'viewer');

-- Usuarios (extiende auth.users de Supabase)
CREATE TABLE usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    rol rol_usuario DEFAULT 'viewer',
    unidad_id UUID REFERENCES unidades(id) ON DELETE SET NULL,
    pin VARCHAR(10), -- PIN para acceso rápido
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLAS DE PEDIDOS
-- ============================================

-- Estados de pedido
CREATE TYPE estado_pedido AS ENUM ('borrador', 'enviado', 'parcial', 'recibido', 'cancelado');

-- Pedidos (cabecera)
CREATE TABLE pedidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_pedido SERIAL, -- Número secuencial legible
    unidad_id UUID NOT NULL REFERENCES unidades(id) ON DELETE RESTRICT,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    estado estado_pedido DEFAULT 'borrador',
    fecha_pedido TIMESTAMPTZ DEFAULT NOW(),
    fecha_esperada DATE,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Estados de item de pedido
CREATE TYPE estado_item AS ENUM ('pendiente', 'parcial', 'recibido', 'cancelado');

-- Items de pedido (detalle)
CREATE TABLE pedido_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    cantidad_pedida DECIMAL(10,2) NOT NULL,
    cantidad_recibida DECIMAL(10,2) DEFAULT 0,
    estado estado_item DEFAULT 'pendiente',
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLAS DE INVENTARIO
-- ============================================

-- Estados de inventario
CREATE TYPE estado_inventario AS ENUM ('disponible', 'reservado', 'agotado', 'caducado', 'merma');

-- Inventario (cada entrada es un lote único)
CREATE TABLE inventario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_unico VARCHAR(50) NOT NULL UNIQUE, -- LOTE-CADUCIDAD-RECIBIDO
    unidad_id UUID NOT NULL REFERENCES unidades(id) ON DELETE RESTRICT,
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    pedido_item_id UUID REFERENCES pedido_items(id) ON DELETE SET NULL,
    lote VARCHAR(50) NOT NULL,
    fecha_caducidad DATE NOT NULL,
    fecha_recibido DATE NOT NULL DEFAULT CURRENT_DATE,
    cantidad_inicial DECIMAL(10,2) NOT NULL,
    cantidad_actual DECIMAL(10,2) NOT NULL,
    estado estado_inventario DEFAULT 'disponible',
    ubicacion VARCHAR(100), -- ej: "Almacén A", "Nevera 2"
    recibido_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsqueda rápida por código
CREATE INDEX idx_inventario_codigo ON inventario(codigo_unico);
CREATE INDEX idx_inventario_unidad ON inventario(unidad_id);
CREATE INDEX idx_inventario_producto ON inventario(producto_id);
CREATE INDEX idx_inventario_caducidad ON inventario(fecha_caducidad);

-- ============================================
-- TABLAS DE MOVIMIENTOS
-- ============================================

-- Tipos de movimiento
CREATE TYPE tipo_movimiento AS ENUM ('entrada', 'consumo', 'merma', 'transferencia', 'ajuste');

-- Historial de movimientos
CREATE TABLE movimientos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventario_id UUID NOT NULL REFERENCES inventario(id) ON DELETE RESTRICT,
    tipo tipo_movimiento NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL, -- Positivo para entrada, negativo para salida
    cantidad_anterior DECIMAL(10,2) NOT NULL,
    cantidad_posterior DECIMAL(10,2) NOT NULL,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    motivo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para reportes
CREATE INDEX idx_movimientos_inventario ON movimientos(inventario_id);
CREATE INDEX idx_movimientos_fecha ON movimientos(created_at);
CREATE INDEX idx_movimientos_tipo ON movimientos(tipo);

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

-- Función para generar código único de inventario
CREATE OR REPLACE FUNCTION generar_codigo_unico(
    p_lote VARCHAR,
    p_fecha_caducidad DATE,
    p_fecha_recibido DATE
) RETURNS VARCHAR AS $$
DECLARE
    v_codigo VARCHAR;
BEGIN
    v_codigo := UPPER(REPLACE(p_lote, ' ', '')) || '-' ||
                TO_CHAR(p_fecha_caducidad, 'YYYYMMDD') || '-' ||
                TO_CHAR(p_fecha_recibido, 'YYYYMMDD');
    RETURN v_codigo;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER tr_unidades_updated BEFORE UPDATE ON unidades FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_proveedores_updated BEFORE UPDATE ON proveedores FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_productos_updated BEFORE UPDATE ON productos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_usuarios_updated BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_pedidos_updated BEFORE UPDATE ON pedidos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_pedido_items_updated BEFORE UPDATE ON pedido_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_inventario_updated BEFORE UPDATE ON inventario FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Función para registrar movimiento de inventario
CREATE OR REPLACE FUNCTION registrar_movimiento(
    p_inventario_id UUID,
    p_tipo tipo_movimiento,
    p_cantidad DECIMAL,
    p_usuario_id UUID,
    p_motivo TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_cantidad_anterior DECIMAL;
    v_cantidad_posterior DECIMAL;
    v_movimiento_id UUID;
BEGIN
    -- Obtener cantidad actual
    SELECT cantidad_actual INTO v_cantidad_anterior
    FROM inventario WHERE id = p_inventario_id;
    
    -- Calcular nueva cantidad
    v_cantidad_posterior := v_cantidad_anterior + p_cantidad;
    
    -- Validar que no sea negativo
    IF v_cantidad_posterior < 0 THEN
        RAISE EXCEPTION 'La cantidad no puede ser negativa';
    END IF;
    
    -- Actualizar inventario
    UPDATE inventario 
    SET cantidad_actual = v_cantidad_posterior,
        estado = CASE 
            WHEN v_cantidad_posterior <= 0 THEN 'agotado'::estado_inventario
            ELSE 'disponible'::estado_inventario
        END
    WHERE id = p_inventario_id;
    
    -- Registrar movimiento
    INSERT INTO movimientos (inventario_id, tipo, cantidad, cantidad_anterior, cantidad_posterior, usuario_id, motivo)
    VALUES (p_inventario_id, p_tipo, p_cantidad, v_cantidad_anterior, v_cantidad_posterior, p_usuario_id, p_motivo)
    RETURNING id INTO v_movimiento_id;
    
    RETURN v_movimiento_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;

-- Función para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS rol_usuario AS $$
DECLARE
    v_rol rol_usuario;
BEGIN
    SELECT rol INTO v_rol FROM usuarios WHERE id = auth.uid();
    RETURN COALESCE(v_rol, 'viewer'::rol_usuario);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener la unidad del usuario actual
CREATE OR REPLACE FUNCTION get_user_unidad()
RETURNS UUID AS $$
DECLARE
    v_unidad UUID;
BEGIN
    SELECT unidad_id INTO v_unidad FROM usuarios WHERE id = auth.uid();
    RETURN v_unidad;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas para UNIDADES (todos pueden leer, solo admin+ puede modificar)
CREATE POLICY "Unidades: lectura pública" ON unidades FOR SELECT USING (true);
CREATE POLICY "Unidades: admin puede insertar" ON unidades FOR INSERT WITH CHECK (get_user_role() IN ('superuser', 'admin'));
CREATE POLICY "Unidades: admin puede actualizar" ON unidades FOR UPDATE USING (get_user_role() IN ('superuser', 'admin'));
CREATE POLICY "Unidades: superuser puede eliminar" ON unidades FOR DELETE USING (get_user_role() = 'superuser');

-- Políticas para CATEGORIAS (todos pueden leer, solo admin+ puede modificar)
CREATE POLICY "Categorias: lectura pública" ON categorias FOR SELECT USING (true);
CREATE POLICY "Categorias: admin puede insertar" ON categorias FOR INSERT WITH CHECK (get_user_role() IN ('superuser', 'admin'));
CREATE POLICY "Categorias: admin puede actualizar" ON categorias FOR UPDATE USING (get_user_role() IN ('superuser', 'admin'));
CREATE POLICY "Categorias: superuser puede eliminar" ON categorias FOR DELETE USING (get_user_role() = 'superuser');

-- Políticas para PROVEEDORES
CREATE POLICY "Proveedores: lectura pública" ON proveedores FOR SELECT USING (true);
CREATE POLICY "Proveedores: admin puede insertar" ON proveedores FOR INSERT WITH CHECK (get_user_role() IN ('superuser', 'admin'));
CREATE POLICY "Proveedores: admin puede actualizar" ON proveedores FOR UPDATE USING (get_user_role() IN ('superuser', 'admin'));
CREATE POLICY "Proveedores: superuser puede eliminar" ON proveedores FOR DELETE USING (get_user_role() = 'superuser');

-- Políticas para PRODUCTOS
CREATE POLICY "Productos: lectura pública" ON productos FOR SELECT USING (true);
CREATE POLICY "Productos: admin puede insertar" ON productos FOR INSERT WITH CHECK (get_user_role() IN ('superuser', 'admin'));
CREATE POLICY "Productos: admin puede actualizar" ON productos FOR UPDATE USING (get_user_role() IN ('superuser', 'admin'));
CREATE POLICY "Productos: superuser puede eliminar" ON productos FOR DELETE USING (get_user_role() = 'superuser');

-- Políticas para USUARIOS
CREATE POLICY "Usuarios: ver propio perfil" ON usuarios FOR SELECT USING (id = auth.uid() OR get_user_role() IN ('superuser', 'admin'));
CREATE POLICY "Usuarios: superuser puede insertar" ON usuarios FOR INSERT WITH CHECK (get_user_role() = 'superuser');
CREATE POLICY "Usuarios: actualizar propio perfil" ON usuarios FOR UPDATE USING (id = auth.uid() OR get_user_role() = 'superuser');
CREATE POLICY "Usuarios: superuser puede eliminar" ON usuarios FOR DELETE USING (get_user_role() = 'superuser');

-- Políticas para PEDIDOS (usuarios ven pedidos de su unidad)
CREATE POLICY "Pedidos: ver de mi unidad" ON pedidos FOR SELECT USING (
    unidad_id = get_user_unidad() OR get_user_role() IN ('superuser', 'admin')
);
CREATE POLICY "Pedidos: cocina/admin puede crear" ON pedidos FOR INSERT WITH CHECK (
    get_user_role() IN ('superuser', 'admin', 'cocina')
);
CREATE POLICY "Pedidos: cocina/admin puede actualizar" ON pedidos FOR UPDATE USING (
    (unidad_id = get_user_unidad() AND get_user_role() IN ('cocina', 'admin')) OR get_user_role() = 'superuser'
);
CREATE POLICY "Pedidos: admin puede eliminar" ON pedidos FOR DELETE USING (
    get_user_role() IN ('superuser', 'admin')
);

-- Políticas para PEDIDO_ITEMS
CREATE POLICY "PedidoItems: ver de mi unidad" ON pedido_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM pedidos WHERE pedidos.id = pedido_items.pedido_id AND (pedidos.unidad_id = get_user_unidad() OR get_user_role() IN ('superuser', 'admin')))
);
CREATE POLICY "PedidoItems: cocina/admin puede crear" ON pedido_items FOR INSERT WITH CHECK (
    get_user_role() IN ('superuser', 'admin', 'cocina', 'recepcion')
);
CREATE POLICY "PedidoItems: recepcion/admin puede actualizar" ON pedido_items FOR UPDATE USING (
    get_user_role() IN ('superuser', 'admin', 'recepcion')
);
CREATE POLICY "PedidoItems: admin puede eliminar" ON pedido_items FOR DELETE USING (
    get_user_role() IN ('superuser', 'admin')
);

-- Políticas para INVENTARIO
CREATE POLICY "Inventario: ver de mi unidad" ON inventario FOR SELECT USING (
    unidad_id = get_user_unidad() OR get_user_role() IN ('superuser', 'admin')
);
CREATE POLICY "Inventario: recepcion/admin puede crear" ON inventario FOR INSERT WITH CHECK (
    get_user_role() IN ('superuser', 'admin', 'recepcion')
);
CREATE POLICY "Inventario: recepcion/admin puede actualizar" ON inventario FOR UPDATE USING (
    (unidad_id = get_user_unidad() AND get_user_role() IN ('recepcion', 'admin', 'cocina')) OR get_user_role() = 'superuser'
);
CREATE POLICY "Inventario: admin puede eliminar" ON inventario FOR DELETE USING (
    get_user_role() IN ('superuser', 'admin')
);

-- Políticas para MOVIMIENTOS
CREATE POLICY "Movimientos: ver de mi unidad" ON movimientos FOR SELECT USING (
    EXISTS (SELECT 1 FROM inventario WHERE inventario.id = movimientos.inventario_id AND (inventario.unidad_id = get_user_unidad() OR get_user_role() IN ('superuser', 'admin')))
);
CREATE POLICY "Movimientos: usuarios autorizados pueden crear" ON movimientos FOR INSERT WITH CHECK (
    get_user_role() IN ('superuser', 'admin', 'recepcion', 'cocina')
);

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Insertar categorías por defecto
INSERT INTO categorias (nombre, icono, orden) VALUES
('Bebidas', '🥤', 1),
('Harinas', '🌾', 2),
('Salsas', '🍅', 3),
('Lácteos', '🧀', 4),
('Verduras', '🥬', 5),
('Conservas', '🥫', 6),
('Aliños', '🧂', 7),
('Postres', '🍰', 8),
('Congelados', '🧊', 9),
('Carnes', '🥩', 10),
('Embalaje', '📦', 11),
('Limpieza', '🧹', 12),
('Otros', '📋', 99);

-- Insertar unidades por defecto
INSERT INTO unidades (nombre) VALUES
('Alisas'),
('Lomas'),
('Marsol'),
('Pathos'),
('Rías'),
('Tilos');

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista de inventario con detalles
CREATE OR REPLACE VIEW v_inventario_detalle AS
SELECT 
    i.id,
    i.codigo_unico,
    i.lote,
    i.fecha_caducidad,
    i.fecha_recibido,
    i.cantidad_inicial,
    i.cantidad_actual,
    i.estado,
    i.ubicacion,
    p.nombre AS producto_nombre,
    p.marca AS producto_marca,
    p.formato AS producto_formato,
    c.nombre AS categoria_nombre,
    c.icono AS categoria_icono,
    pr.nombre AS proveedor_nombre,
    u.nombre AS unidad_nombre,
    us.nombre AS recibido_por_nombre,
    CASE 
        WHEN i.fecha_caducidad < CURRENT_DATE THEN 'caducado'
        WHEN i.fecha_caducidad < CURRENT_DATE + INTERVAL '7 days' THEN 'por_caducar'
        ELSE 'ok'
    END AS estado_caducidad,
    i.fecha_caducidad - CURRENT_DATE AS dias_para_caducar
FROM inventario i
LEFT JOIN productos p ON i.producto_id = p.id
LEFT JOIN categorias c ON p.categoria_id = c.id
LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
LEFT JOIN unidades u ON i.unidad_id = u.id
LEFT JOIN usuarios us ON i.recibido_por = us.id;

-- Vista de pedidos con resumen
CREATE OR REPLACE VIEW v_pedidos_resumen AS
SELECT 
    p.id,
    p.numero_pedido,
    p.estado,
    p.fecha_pedido,
    p.fecha_esperada,
    p.notas,
    u.nombre AS unidad_nombre,
    us.nombre AS usuario_nombre,
    COUNT(pi.id) AS total_items,
    SUM(pi.cantidad_pedida) AS total_cantidad_pedida,
    SUM(pi.cantidad_recibida) AS total_cantidad_recibida
FROM pedidos p
LEFT JOIN unidades u ON p.unidad_id = u.id
LEFT JOIN usuarios us ON p.usuario_id = us.id
LEFT JOIN pedido_items pi ON p.id = pi.pedido_id
GROUP BY p.id, p.numero_pedido, p.estado, p.fecha_pedido, p.fecha_esperada, p.notas, u.nombre, us.nombre;

-- Vista de stock actual por unidad y producto
CREATE OR REPLACE VIEW v_stock_actual AS
SELECT 
    u.id AS unidad_id,
    u.nombre AS unidad_nombre,
    p.id AS producto_id,
    p.nombre AS producto_nombre,
    p.marca AS producto_marca,
    c.nombre AS categoria_nombre,
    COALESCE(SUM(i.cantidad_actual), 0) AS stock_total,
    p.stock_minimo,
    CASE 
        WHEN COALESCE(SUM(i.cantidad_actual), 0) <= 0 THEN 'sin_stock'
        WHEN COALESCE(SUM(i.cantidad_actual), 0) < p.stock_minimo THEN 'bajo'
        ELSE 'ok'
    END AS estado_stock,
    MIN(i.fecha_caducidad) AS proxima_caducidad
FROM unidades u
CROSS JOIN productos p
LEFT JOIN categorias c ON p.categoria_id = c.id
LEFT JOIN inventario i ON i.unidad_id = u.id AND i.producto_id = p.id AND i.estado = 'disponible'
WHERE p.activo = true AND u.activa = true
GROUP BY u.id, u.nombre, p.id, p.nombre, p.marca, c.nombre, p.stock_minimo;

-- ============================================
-- FIN DEL ESQUEMA
-- ============================================
