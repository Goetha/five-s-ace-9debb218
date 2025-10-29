-- Add missing roles to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'area_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';