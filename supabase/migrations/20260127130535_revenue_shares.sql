-- Revenue Shares table for tracking revenue sharing distributions
CREATE TABLE public.revenue_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID NOT NULL REFERENCES public.counties(id) ON DELETE CASCADE,
  sacco_id UUID NOT NULL REFERENCES public.saccos(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  rider_id UUID REFERENCES public.riders(id) ON DELETE SET NULL,
  permit_id UUID REFERENCES public.permits(id) ON DELETE SET NULL,
  
  -- Revenue sharing details
  share_type TEXT NOT NULL CHECK (share_type IN ('percentage', 'fixed_per_rider', 'none')),
  base_amount DECIMAL(10, 2) NOT NULL, -- Original payment amount
  share_amount DECIMAL(10, 2) NOT NULL, -- Calculated share amount
  percentage DECIMAL(5, 2), -- Percentage used (if percentage-based)
  fixed_amount DECIMAL(10, 2), -- Fixed amount used (if fixed_per_rider)
  period TEXT CHECK (period IN ('weekly', 'monthly', 'annual')), -- Period for fixed amount
  
  -- Configuration used
  rule_config JSONB, -- Store the rule configuration used for this calculation
  
  -- Compliance check results
  compliance_threshold_met BOOLEAN DEFAULT true,
  active_permit_required BOOLEAN DEFAULT false,
  had_active_permit BOOLEAN DEFAULT false,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'distributed', 'cancelled')),
  distributed_at TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX idx_revenue_shares_county ON public.revenue_shares(county_id);
CREATE INDEX idx_revenue_shares_sacco ON public.revenue_shares(sacco_id);
CREATE INDEX idx_revenue_shares_payment ON public.revenue_shares(payment_id);
CREATE INDEX idx_revenue_shares_rider ON public.revenue_shares(rider_id);
CREATE INDEX idx_revenue_shares_status ON public.revenue_shares(status);
CREATE INDEX idx_revenue_shares_created ON public.revenue_shares(created_at);

-- RLS Policies
ALTER TABLE public.revenue_shares ENABLE ROW LEVEL SECURITY;

-- County admins can view all revenue shares in their county
CREATE POLICY "County admins can view revenue shares"
ON public.revenue_shares FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND county_id = revenue_shares.county_id
    AND role IN ('county_super_admin', 'county_admin', 'county_finance_officer', 'county_analyst')
  )
);

-- Sacco admins can view revenue shares for their sacco
CREATE POLICY "Sacco admins can view their revenue shares"
ON public.revenue_shares FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('sacco_admin', 'sacco_officer')
    AND p.county_id = revenue_shares.county_id
    AND revenue_shares.sacco_id IN (
      SELECT id FROM public.saccos
      WHERE county_id = p.county_id
      AND id IN (
        -- Get saccos where user is admin
        SELECT sacco_id FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('sacco_admin', 'sacco_officer')
      )
    )
  )
);

-- Note: Service role (used by webhooks) bypasses RLS, so no policy needed for inserts
-- Revenue shares are inserted via the paystack-webhook function using service role

-- County admins can update revenue share status
CREATE POLICY "County admins can update revenue shares"
ON public.revenue_shares FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND county_id = revenue_shares.county_id
    AND role IN ('county_super_admin', 'county_admin', 'county_finance_officer')
  )
);
