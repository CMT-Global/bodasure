-- BodaSure Multi-County Platform - Foundation Schema
-- Phase 1: Core tables with multi-tenancy and role-based access

-- =====================================================
-- ENUMS
-- =====================================================

-- User roles enum
CREATE TYPE public.app_role AS ENUM (
  'platform_super_admin',
  'platform_admin',
  'county_super_admin',
  'county_admin',
  'county_finance_officer',
  'county_enforcement_officer',
  'county_registration_agent',
  'county_analyst',
  'sacco_admin',
  'sacco_officer',
  'welfare_admin',
  'welfare_officer',
  'stage_chairman',
  'stage_secretary',
  'stage_treasurer',
  'rider',
  'owner'
);

-- County status
CREATE TYPE public.county_status AS ENUM ('active', 'inactive', 'pending', 'suspended');

-- Registration status
CREATE TYPE public.registration_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- Permit status
CREATE TYPE public.permit_status AS ENUM ('active', 'expired', 'pending', 'suspended', 'cancelled');

-- Compliance status
CREATE TYPE public.compliance_status AS ENUM ('compliant', 'non_compliant', 'pending_review', 'blacklisted');

-- Payment status
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded', 'cancelled');

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Counties table (top-level tenant)
CREATE TABLE public.counties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  status county_status NOT NULL DEFAULT 'pending',
  settings JSONB DEFAULT '{}',
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  county_id UUID REFERENCES public.counties(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  county_id UUID REFERENCES public.counties(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, county_id)
);

-- Saccos table
CREATE TABLE public.saccos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES public.counties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  registration_number TEXT,
  status registration_status NOT NULL DEFAULT 'pending',
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (county_id, name)
);

-- Stages table
CREATE TABLE public.stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES public.counties(id) ON DELETE CASCADE,
  sacco_id UUID REFERENCES public.saccos(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  location TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  status registration_status NOT NULL DEFAULT 'pending',
  capacity INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (county_id, name)
);

-- Owners table
CREATE TABLE public.owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES public.counties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  id_number TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  status registration_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (county_id, id_number)
);

-- Riders table
CREATE TABLE public.riders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES public.counties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES public.owners(id) ON DELETE SET NULL,
  sacco_id UUID REFERENCES public.saccos(id) ON DELETE SET NULL,
  stage_id UUID REFERENCES public.stages(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  id_number TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  date_of_birth DATE,
  address TEXT,
  photo_url TEXT,
  license_number TEXT,
  license_expiry DATE,
  status registration_status NOT NULL DEFAULT 'pending',
  compliance_status compliance_status NOT NULL DEFAULT 'pending_review',
  qr_code TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (county_id, id_number)
);

-- Motorbikes table
CREATE TABLE public.motorbikes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES public.counties(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  rider_id UUID REFERENCES public.riders(id) ON DELETE SET NULL,
  registration_number TEXT NOT NULL,
  chassis_number TEXT,
  engine_number TEXT,
  make TEXT,
  model TEXT,
  year INTEGER,
  color TEXT,
  photo_url TEXT,
  status registration_status NOT NULL DEFAULT 'pending',
  qr_code TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (county_id, registration_number)
);

-- Permit types configuration per county
CREATE TABLE public.permit_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES public.counties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_days INTEGER NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (county_id, name)
);

-- Permits table
CREATE TABLE public.permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES public.counties(id) ON DELETE CASCADE,
  rider_id UUID NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  motorbike_id UUID NOT NULL REFERENCES public.motorbikes(id) ON DELETE CASCADE,
  permit_type_id UUID NOT NULL REFERENCES public.permit_types(id) ON DELETE RESTRICT,
  permit_number TEXT NOT NULL UNIQUE,
  status permit_status NOT NULL DEFAULT 'pending',
  issued_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  amount_paid DECIMAL(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES public.counties(id) ON DELETE CASCADE,
  permit_id UUID REFERENCES public.permits(id) ON DELETE SET NULL,
  rider_id UUID REFERENCES public.riders(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT,
  payment_reference TEXT,
  provider TEXT,
  provider_reference TEXT,
  status payment_status NOT NULL DEFAULT 'pending',
  description TEXT,
  metadata JSONB DEFAULT '{}',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Penalties table
CREATE TABLE public.penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES public.counties(id) ON DELETE CASCADE,
  rider_id UUID NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  issued_by UUID REFERENCES auth.users(id),
  penalty_type TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  payment_id UUID REFERENCES public.payments(id),
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID REFERENCES public.counties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_profiles_county ON public.profiles(county_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_county ON public.user_roles(county_id);
CREATE INDEX idx_saccos_county ON public.saccos(county_id);
CREATE INDEX idx_stages_county ON public.stages(county_id);
CREATE INDEX idx_stages_sacco ON public.stages(sacco_id);
CREATE INDEX idx_owners_county ON public.owners(county_id);
CREATE INDEX idx_riders_county ON public.riders(county_id);
CREATE INDEX idx_riders_sacco ON public.riders(sacco_id);
CREATE INDEX idx_riders_stage ON public.riders(stage_id);
CREATE INDEX idx_motorbikes_county ON public.motorbikes(county_id);
CREATE INDEX idx_motorbikes_rider ON public.motorbikes(rider_id);
CREATE INDEX idx_permits_county ON public.permits(county_id);
CREATE INDEX idx_permits_rider ON public.permits(rider_id);
CREATE INDEX idx_payments_county ON public.payments(county_id);
CREATE INDEX idx_penalties_county ON public.penalties(county_id);
CREATE INDEX idx_audit_logs_county ON public.audit_logs(county_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Security definer function to check user role in specific county
CREATE OR REPLACE FUNCTION public.has_role_in_county(_user_id UUID, _role app_role, _county_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND county_id = _county_id
  )
$$;

-- Security definer function to get user's county_id
CREATE OR REPLACE FUNCTION public.get_user_county_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT county_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- Security definer function to check if user is platform admin
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('platform_super_admin', 'platform_admin')
  )
$$;

-- Security definer function to check if user has county admin access
CREATE OR REPLACE FUNCTION public.is_county_admin(_user_id UUID, _county_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('county_super_admin', 'county_admin', 'platform_super_admin', 'platform_admin')
      AND (county_id = _county_id OR role IN ('platform_super_admin', 'platform_admin'))
  )
$$;

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamps
CREATE TRIGGER update_counties_updated_at BEFORE UPDATE ON public.counties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_saccos_updated_at BEFORE UPDATE ON public.saccos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_stages_updated_at BEFORE UPDATE ON public.stages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_owners_updated_at BEFORE UPDATE ON public.owners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_riders_updated_at BEFORE UPDATE ON public.riders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_motorbikes_updated_at BEFORE UPDATE ON public.motorbikes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_permit_types_updated_at BEFORE UPDATE ON public.permit_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_permits_updated_at BEFORE UPDATE ON public.permits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_penalties_updated_at BEFORE UPDATE ON public.penalties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.counties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saccos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motorbikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permit_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Counties policies
CREATE POLICY "Platform admins can manage all counties"
  ON public.counties FOR ALL
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Users can view their own county"
  ON public.counties FOR SELECT
  TO authenticated
  USING (id = public.get_user_county_id(auth.uid()));

CREATE POLICY "Active counties are viewable for login"
  ON public.counties FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "County admins can view profiles in their county"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_county_admin(auth.uid(), county_id));

CREATE POLICY "Platform admins can manage all profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- User roles policies
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Platform admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "County admins can manage roles in their county"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.is_county_admin(auth.uid(), county_id));

-- Saccos policies
CREATE POLICY "County admins can manage saccos"
  ON public.saccos FOR ALL
  TO authenticated
  USING (public.is_county_admin(auth.uid(), county_id));

CREATE POLICY "Users can view saccos in their county"
  ON public.saccos FOR SELECT
  TO authenticated
  USING (county_id = public.get_user_county_id(auth.uid()));

-- Stages policies
CREATE POLICY "County admins can manage stages"
  ON public.stages FOR ALL
  TO authenticated
  USING (public.is_county_admin(auth.uid(), county_id));

CREATE POLICY "Users can view stages in their county"
  ON public.stages FOR SELECT
  TO authenticated
  USING (county_id = public.get_user_county_id(auth.uid()));

-- Owners policies
CREATE POLICY "County admins can manage owners"
  ON public.owners FOR ALL
  TO authenticated
  USING (public.is_county_admin(auth.uid(), county_id));

CREATE POLICY "Owners can view own profile"
  ON public.owners FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Riders policies
CREATE POLICY "County admins can manage riders"
  ON public.riders FOR ALL
  TO authenticated
  USING (public.is_county_admin(auth.uid(), county_id));

CREATE POLICY "Riders can view own profile"
  ON public.riders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Motorbikes policies
CREATE POLICY "County admins can manage motorbikes"
  ON public.motorbikes FOR ALL
  TO authenticated
  USING (public.is_county_admin(auth.uid(), county_id));

CREATE POLICY "Users can view their own motorbikes"
  ON public.motorbikes FOR SELECT
  TO authenticated
  USING (
    rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid())
    OR owner_id IN (SELECT id FROM public.owners WHERE user_id = auth.uid())
  );

-- Permit types policies
CREATE POLICY "Anyone can view active permit types"
  ON public.permit_types FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "County admins can manage permit types"
  ON public.permit_types FOR ALL
  TO authenticated
  USING (public.is_county_admin(auth.uid(), county_id));

-- Permits policies
CREATE POLICY "County admins can manage permits"
  ON public.permits FOR ALL
  TO authenticated
  USING (public.is_county_admin(auth.uid(), county_id));

CREATE POLICY "Riders can view own permits"
  ON public.permits FOR SELECT
  TO authenticated
  USING (rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()));

-- Payments policies
CREATE POLICY "County finance can manage payments"
  ON public.payments FOR ALL
  TO authenticated
  USING (public.is_county_admin(auth.uid(), county_id));

CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()));

-- Penalties policies
CREATE POLICY "County admins can manage penalties"
  ON public.penalties FOR ALL
  TO authenticated
  USING (public.is_county_admin(auth.uid(), county_id));

CREATE POLICY "Riders can view own penalties"
  ON public.penalties FOR SELECT
  TO authenticated
  USING (rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()));

-- Audit logs policies
CREATE POLICY "Platform admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "County admins can view county audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_county_admin(auth.uid(), county_id));