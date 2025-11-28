-- Criar bucket para fotos de auditoria
INSERT INTO storage.buckets (id, name, public)
VALUES ('audit-photos', 'audit-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir usuários autenticados fazerem upload
CREATE POLICY "Usuários autenticados podem fazer upload de fotos de auditoria"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audit-photos');

-- Política para permitir visualização pública das fotos
CREATE POLICY "Fotos de auditoria são publicamente acessíveis"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'audit-photos');

-- Política para permitir usuários autenticados atualizarem suas fotos
CREATE POLICY "Usuários autenticados podem atualizar fotos de auditoria"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'audit-photos');

-- Política para permitir usuários autenticados deletarem fotos
CREATE POLICY "Usuários autenticados podem deletar fotos de auditoria"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'audit-photos');