-- Tabla para almacenar recibos de Europiel procesados
CREATE TABLE IF NOT EXISTS recibos_europiel (
    id SERIAL PRIMARY KEY,
    folio VARCHAR(50) NOT NULL,
    fecha DATE,
    cliente VARCHAR(255) NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    concepto TEXT,
    sucursal VARCHAR(100),
    empresa VARCHAR(50) DEFAULT 'EUROPIEL',
    confianza_ocr INTEGER, -- Porcentaje de confianza del OCR
    texto_completo TEXT, -- Texto completo extraído por OCR
    fecha_procesamiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_procesamiento VARCHAR(100),
    notas TEXT,
    estado VARCHAR(20) DEFAULT 'PROCESADO',
    
    -- Índices para búsquedas rápidas
    CONSTRAINT unique_folio UNIQUE(folio)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_recibos_fecha ON recibos_europiel(fecha);
CREATE INDEX IF NOT EXISTS idx_recibos_cliente ON recibos_europiel(cliente);
CREATE INDEX IF NOT EXISTS idx_recibos_sucursal ON recibos_europiel(sucursal);
CREATE INDEX IF NOT EXISTS idx_recibos_monto ON recibos_europiel(monto);
CREATE INDEX IF NOT EXISTS idx_recibos_fecha_procesamiento ON recibos_europiel(fecha_procesamiento);

-- Comentarios para documentación
COMMENT ON TABLE recibos_europiel IS 'Recibos de Europiel procesados con OCR';
COMMENT ON COLUMN recibos_europiel.folio IS 'Número de folio del recibo (ej: CI1-1607)';
COMMENT ON COLUMN recibos_europiel.confianza_ocr IS 'Porcentaje de confianza del reconocimiento OCR (0-100)';
COMMENT ON COLUMN recibos_europiel.texto_completo IS 'Texto completo extraído del documento';
COMMENT ON COLUMN recibos_europiel.estado IS 'Estado del recibo: PROCESADO, REVISADO, DUPLICADO, etc.';
