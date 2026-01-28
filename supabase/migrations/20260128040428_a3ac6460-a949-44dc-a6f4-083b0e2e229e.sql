-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('superadmin', 'admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
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

-- RLS policies for user_roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can manage all roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'superadmin'));

-- Add status column to profiles for blocking users
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked'));

-- Create policy for superadmin to view all profiles
CREATE POLICY "Superadmins can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'superadmin'));

-- Create policy for superadmin to update all profiles
CREATE POLICY "Superadmins can update all profiles"
ON public.profiles FOR UPDATE
USING (public.has_role(auth.uid(), 'superadmin'));

-- Create policy for superadmin to view all whatsapp_numbers
CREATE POLICY "Superadmins can view all numbers"
ON public.whatsapp_numbers FOR SELECT
USING (public.has_role(auth.uid(), 'superadmin'));

-- Create policy for superadmin to update all whatsapp_numbers
CREATE POLICY "Superadmins can update all numbers"
ON public.whatsapp_numbers FOR UPDATE
USING (public.has_role(auth.uid(), 'superadmin'));

-- Create policy for superadmin to view all conversations
CREATE POLICY "Superadmins can view all conversations"
ON public.conversations FOR SELECT
USING (public.has_role(auth.uid(), 'superadmin'));

-- Create policy for superadmin to view all messages
CREATE POLICY "Superadmins can view all messages"
ON public.messages FOR SELECT
USING (public.has_role(auth.uid(), 'superadmin'));