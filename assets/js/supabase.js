// Browser-safe Supabase connection. Only the publishable key belongs here.
(function () {
  const projectUrl = 'https://ocfdnpkelavyhxskqgez.supabase.co';
  const publishableKey = 'sb_publishable_81RTo2Wb2D4qD2Fh0dwOIQ_uO-SCOix';

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('Supabase SDK failed to load. Check the Supabase CDN script.');
    return;
  }

  window.elevateSupabase = window.supabase.createClient(projectUrl, publishableKey);
})();
