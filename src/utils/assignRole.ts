/**
 * Utility function to assign platform_super_admin role to the current user
 * This can be called from the browser console for emergency role assignment
 * 
 * Usage in browser console:
 * import { assignPlatformSuperAdmin } from './utils/assignRole';
 * await assignPlatformSuperAdmin();
 * 
 * Or if you have access to supabase client:
 * window.assignSuperAdminRole = async () => { ... }
 */

import { supabase } from '@/integrations/supabase/client';

export async function assignPlatformSuperAdmin(userId?: string) {
  try {
    // Get current user if userId not provided
    if (!userId) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('No user session found. Please log in first.');
      }
      userId = session.user.id;
    }

    console.log(`Assigning platform_super_admin role to user: ${userId}`);

    // Check if role already exists
    const { data: existingRole, error: checkError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'platform_super_admin')
      .is('county_id', null)
      .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    if (existingRole) {
      console.log('✅ User already has platform_super_admin role');
      return { success: true, message: 'Role already assigned' };
    }

    // Insert the role
    const { data: roleData, error: insertError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'platform_super_admin',
        county_id: null,
        granted_by: userId,
      })
      .select()
      .single();

    if (insertError) {
      // Check if it's a unique constraint violation (role already exists)
      if (insertError.code === '23505') {
        console.log('✅ User already has this role (unique constraint)');
        return { success: true, message: 'Role already assigned' };
      }
      throw insertError;
    }

    console.log('✅ Successfully assigned platform_super_admin role!');
    console.log('Role details:', roleData);
    
    // Refresh the page to reload roles
    console.log('🔄 Refreshing page to reload roles...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);

    return { success: true, message: 'Role assigned successfully', data: roleData };
  } catch (error: any) {
    console.error('❌ Error assigning role:', error.message);
    if (error.details) {
      console.error('Details:', error.details);
    }
    if (error.hint) {
      console.error('Hint:', error.hint);
    }
    return { success: false, error: error.message };
  }
}

// Make it available globally for easy access from browser console
if (typeof window !== 'undefined') {
  (window as any).assignSuperAdminRole = assignPlatformSuperAdmin;
}
