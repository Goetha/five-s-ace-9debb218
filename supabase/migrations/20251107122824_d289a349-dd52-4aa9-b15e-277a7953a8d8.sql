-- Criar políticas RLS para o bucket audit-photos

-- Política para permitir que usuários autenticados façam upload de fotos
CREATE POLICY "Authenticated users can upload audit photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audit-photos' AND
  auth.uid() IS NOT NULL
);

-- Política para permitir que usuários autenticados atualizem suas próprias fotos
CREATE POLICY "Authenticated users can update audit photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'audit-photos' AND
  auth.uid() IS NOT NULL
);

-- Política para permitir que usuários vejam fotos das auditorias de suas empresas
CREATE POLICY "Users can view audit photos from their companies"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'audit-photos' AND
  auth.uid() IS NOT NULL
);

-- Política para permitir que usuários deletem fotos de suas auditorias
CREATE POLICY "Users can delete their audit photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'audit-photos' AND
  auth.uid() IS NOT NULL
);