-- Assign company_admin role to the existing user doket43879@lovleo.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('4508dcf2-6902-48ec-8f9b-ffce216190b6', 'company_admin')
ON CONFLICT (user_id, role) DO NOTHING;