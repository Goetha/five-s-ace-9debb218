-- Permitir IFA Admin criar auditorias em qualquer empresa
CREATE POLICY "IFA admins can create audits for any company"
ON audits FOR INSERT
TO authenticated
WITH CHECK (is_ifa_admin(auth.uid()));

-- Permitir IFA Admin atualizar qualquer auditoria
CREATE POLICY "IFA admins can update any audit"
ON audits FOR UPDATE
TO authenticated
USING (is_ifa_admin(auth.uid()));

-- Permitir IFA Admin gerenciar audit_items de qualquer auditoria
CREATE POLICY "IFA admins can create audit items for any audit"
ON audit_items FOR INSERT
TO authenticated
WITH CHECK (is_ifa_admin(auth.uid()));

CREATE POLICY "IFA admins can update any audit items"
ON audit_items FOR UPDATE
TO authenticated
USING (is_ifa_admin(auth.uid()));