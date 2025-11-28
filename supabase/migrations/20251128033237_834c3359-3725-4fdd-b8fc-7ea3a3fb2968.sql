-- Tornar o bucket audit-photos público
UPDATE storage.buckets SET public = true WHERE id = 'audit-photos';