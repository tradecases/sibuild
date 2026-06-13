-- Fix the auth trigger to handle role casting more robustly
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role_val TEXT;
BEGIN
  -- Get role from metadata, default to 'sales'
  user_role_val := COALESCE(NEW.raw_user_meta_data->>'role', 'sales');
  
  -- Validate it's a valid role, otherwise default to 'sales'
  IF user_role_val NOT IN ('super_admin', 'manager', 'sales', 'inventory', 'accountant', 'delivery') THEN
    user_role_val := 'sales';
  END IF;
  
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    user_role_val::public.user_role
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log but don't fail the user creation
  RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();