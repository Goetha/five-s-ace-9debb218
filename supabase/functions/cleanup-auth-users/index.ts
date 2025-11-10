import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const IFA_ADMIN_ID = '37aa1a0d-7113-4f6e-9023-afbd7a59eb77';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verify caller is ifa_admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    if (user.id !== IFA_ADMIN_ID) {
      throw new Error('Unauthorized: Only IFA Admin can cleanup auth users');
    }

    console.log('IFA Admin authenticated, starting cleanup...');

    // List all users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw listError;
    }

    console.log(`Found ${users.length} total users`);

    // Filter users to delete (all except IFA admin)
    const usersToDelete = users.filter(u => u.id !== IFA_ADMIN_ID);
    
    console.log(`Will delete ${usersToDelete.length} users`);

    const deletedUsers: string[] = [];
    const failedDeletions: { id: string; email: string; error: string }[] = [];

    // Delete each user
    for (const userToDelete of usersToDelete) {
      try {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(userToDelete.id);
        
        if (deleteError) {
          console.error(`Failed to delete user ${userToDelete.email}:`, deleteError);
          failedDeletions.push({
            id: userToDelete.id,
            email: userToDelete.email || 'unknown',
            error: deleteError.message
          });
        } else {
          console.log(`Successfully deleted user: ${userToDelete.email}`);
          deletedUsers.push(userToDelete.email || userToDelete.id);
        }
      } catch (err) {
        console.error(`Exception deleting user ${userToDelete.email}:`, err);
        failedDeletions.push({
          id: userToDelete.id,
          email: userToDelete.email || 'unknown',
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    const response = {
      success: true,
      message: 'Auth cleanup completed',
      preserved_user: 'institutofernandoantonio@gmail.com',
      preserved_user_id: IFA_ADMIN_ID,
      deleted_count: deletedUsers.length,
      deleted_users: deletedUsers,
      failed_count: failedDeletions.length,
      failed_deletions: failedDeletions
    };

    console.log('Cleanup summary:', response);

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in cleanup-auth-users:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
