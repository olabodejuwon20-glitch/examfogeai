// CHANGES TO APPLY TO Dashboard.tsx

// 1. ADD these imports:
// import { useCredits } from '@/hooks/useCredits';
// import CreditsBadge from '@/components/credits/CreditsBadge';

// 2. ADD inside Dashboard component:
// const { checkDailyCredits, isAdFree } = useCredits();

// 3. UPDATE the useEffect to check daily credits on load:
// useEffect(() => {
//   loadData();
//   showBannerAd();
//   checkDailyCredits(); // ← add this line
//   return () => { hideBannerAd(); };
// }, []);

// 4. ADD CreditsBadge to the header nav (before the LogOut button):
// <CreditsBadge />

// 5. WRAP showBannerAd and AdSenseAd with ad-free check:
// useEffect(() => {
//   loadData();
//   checkDailyCredits();
//   if (!isAdFree()) {         // ← only show ads to non-paying users
//     showBannerAd();
//   }
//   return () => { hideBannerAd(); };
// }, []);

// And wrap the AdSense component:
// {!isAdFree() && (
//   <div className="mt-8">
//     <AdSenseAd adSlot="XXXXXXXXXX" className="text-center" />
//   </div>
// )}

// ---- FULL UPDATED HEADER SECTION ----
// Replace your header div children with:

/*
<header className="border-b border-border bg-card">
  <div className="container mx-auto px-4 h-16 flex items-center justify-between">
    <Link to="/dashboard" className="flex items-center gap-2">
      <GraduationCap className="h-7 w-7 text-primary" />
      <span className="text-xl font-bold text-foreground">ExamForge</span>
    </Link>
    <div className="flex items-center gap-2 md:gap-3">
      <Link to="/question-banks">
        <Button variant="ghost" size="sm">
          <Library className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Banks</span>
        </Button>
      </Link>
      <Link to="/leaderboard">
        <Button variant="ghost" size="sm">
          <Trophy className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Leaderboard</span>
        </Button>
      </Link>
      <CreditsBadge />
      <Button variant="ghost" size="sm" onClick={handleSignOut}>
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  </div>
</header>
*/
