-- Add DELETE policy for IFA admins on audits table
CREATE POLICY "IFA admins can delete any audit"
ON public.audits
FOR DELETE
USING (is_ifa_admin(auth.uid()));

-- Add DELETE policy for auditors to delete their own in-progress audits
CREATE POLICY "Auditors can delete their own in_progress audits"
ON public.audits
FOR DELETE
USING (
  auth.uid() = auditor_id 
  AND status = 'in_progress'
);

-- Add DELETE policy for IFA admins on audit_items table
CREATE POLICY "IFA admins can delete any audit items"
ON public.audit_items
FOR DELETE
USING (is_ifa_admin(auth.uid()));

-- Add DELETE policy for auditors to delete items from their own audits
CREATE POLICY "Auditors can delete items from their own audits"
ON public.audit_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM audits
    WHERE audits.id = audit_items.audit_id
    AND audits.auditor_id = auth.uid()
    AND audits.status = 'in_progress'
  )
);