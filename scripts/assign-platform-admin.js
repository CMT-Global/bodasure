import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../.env');

let SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY;

try {
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      if (key === 'VITE_SUPABASE_URL') SUPABASE_URL = value;
      if (key === 'VITE_SUPABASE_PUBLISHABLE_KEY') SUPABASE_PUBLISHABLE_KEY = value;
    }
  });
} catch (error) {
  console.error('Error reading .env file:', error.message);
}

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('Error: Missing Supabase environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function assignPlatformSuperAdmin(email) {
  try {
    console.log(`Looking up user with email: ${email}`);
    
    // Find user by email in profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', email)
      .single();

    if (profileError) {
      throw profileError;
    }

    if (!profile) {
      throw new Error(`User with email ${email} not found`);
    }

    console.log(`Found user: ${profile.full_name || profile.email} (ID: ${profile.id})`);

    // Check if user already has platform_super_admin role
    const { data: existingRole, error: checkError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', profile.id)
      .eq('role', 'platform_super_admin')
      .is('county_id', null)
      .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    if (existingRole) {
      console.log('User already has platform_super_admin role');
      return;
    }

    // Get current session user (if available) for granted_by
    const { data: { session } } = await supabase.auth.getSession();
    const grantedBy = session?.user?.id || profile.id; // Fallback to self if no session

    // Insert platform_super_admin role with county_id = null
    const { data: roleData, error: insertError } = await supabase
      .from('user_roles')
      .insert({
        user_id: profile.id,
        role: 'platform_super_admin',
        county_id: null, // Platform-level role, not tied to a county
        granted_by: grantedBy,
      })
      .select()
      .single();

    if (insertError) {
      // Check if it's a unique constraint violation (role already exists)
      if (insertError.code === '23505') {
        console.log('User already has this role (unique constraint)');
        return;
      }
      throw insertError;
    }

    console.log('✅ Successfully assigned platform_super_admin role!');
    console.log('Role details:', roleData);
  } catch (error) {
    console.error('❌ Error assigning role:', error.message);
    if (error.details) {
      console.error('Details:', error.details);
    }
    if (error.hint) {
      console.error('Hint:', error.hint);
    }
    process.exit(1);
  }
}

// Get email from command line argument
const email = process.argv[2] || 'shubhambhatt9082003@gmail.com';

if (!email) {
  console.error('Usage: node assign-platform-admin.js <email>');
  process.exit(1);
}

assignPlatformSuperAdmin(email);
