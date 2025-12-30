-- Inserir audit_items para todas as auditorias da Granja Boa Vista
-- Cada auditoria terá 10 itens (1 por critério vinculado ao local)
-- As respostas são baseadas no score existente da auditoria

INSERT INTO audit_items (audit_id, criterion_id, question, answer, comment)
SELECT 
  a.id as audit_id,
  cc.id as criterion_id,
  cc.name as question,
  -- Determina answer baseado no score e posição do critério (ordenado por senso)
  CASE 
    WHEN a.score >= 100 THEN true
    WHEN a.score >= 90 AND criteria_order.row_num <= 9 THEN true
    WHEN a.score >= 80 AND criteria_order.row_num <= 8 THEN true
    WHEN a.score >= 70 AND criteria_order.row_num <= 7 THEN true
    ELSE false
  END as answer,
  -- Adiciona comentário para não-conformidades
  CASE 
    WHEN a.score >= 100 THEN NULL
    WHEN a.score >= 90 AND criteria_order.row_num <= 9 THEN NULL
    WHEN a.score >= 80 AND criteria_order.row_num <= 8 THEN NULL
    WHEN a.score >= 70 AND criteria_order.row_num <= 7 THEN NULL
    ELSE 'Necessita melhoria e atenção especial'
  END as comment
FROM audits a
CROSS JOIN LATERAL (
  SELECT 
    cc.id,
    cc.name,
    cc.senso,
    ROW_NUMBER() OVER (ORDER BY cc.senso DESC, cc.name) as row_num
  FROM environment_criteria ec
  JOIN company_criteria cc ON cc.id = ec.criterion_id
  WHERE ec.environment_id = a.location_id
    AND cc.status = 'active'
) as criteria_order
JOIN company_criteria cc ON cc.id = criteria_order.id
WHERE a.company_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  AND a.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM audit_items ai WHERE ai.audit_id = a.id
  )
ORDER BY a.id, criteria_order.row_num;