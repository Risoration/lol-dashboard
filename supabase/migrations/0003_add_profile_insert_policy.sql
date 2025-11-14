-- Add INSERT policy for profiles table
-- Users should be able to create their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

