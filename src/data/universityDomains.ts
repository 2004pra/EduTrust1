
// Verified University Domains List (Starter Pack)
// In production, this would be fetched from a larger database or API
export const universityDomains = [
    // USA (Ivy League & Top Tier)
    "harvard.edu",
    "stanford.edu",
    "mit.edu",
    "yale.edu",
    "princeton.edu",
    "columbia.edu",
    "upenn.edu",
    "cornell.edu",
    "dartmouth.edu",
    "brown.edu",
    "berkeley.edu",
    "ucla.edu",
    "cmu.edu",
    "nyu.edu",
    "usc.edu",
    "umich.edu",
    "utexas.edu",
    "gatech.edu",
    "caltech.edu",
    "jhu.edu",

    // India (IITs, NITs, Top Unis)
    "iitb.ac.in",
    "iitd.ac.in",
    "iitk.ac.in",
    "iitm.ac.in",
    "iitkgp.ac.in",
    "iitr.ac.in",
    "iitg.ac.in",
    "bits-pilani.ac.in",
    "du.ac.in",
    "jnu.ac.in",
    "bhu.ac.in",
    "annauniv.edu",
    "vit.ac.in",
    "manipal.edu",
    "srmist.edu.in",
    "thapar.edu",
    "amity.edu",
    "christuniversity.in",
    "nmims.edu",
    "symbiosis.ac.in",

    // UK
    "ox.ac.uk",
    "cam.ac.uk",
    "imperial.ac.uk",
    "ucl.ac.uk",
    "lse.ac.uk",
    "ed.ac.uk",

    // Canada
    "utoronto.ca",
    "mcgill.ca",
    "ubc.ca",
    "uwaterloo.ca",

    // Tech/Online (For Hackathon/Testing)
    // "gmail.com", // REMOVED: No generic emails allowed in production
    "udemy.com",
    "coursera.org",
    "edx.org",
    "upgrad.com",
    "scaler.com"
];

// Helper function to validate email domain
export const isVerifiedDomain = (email: string): boolean => {
    if (!email || !email.includes('@')) return false;
    const domain = email.split('@')[1].toLowerCase();
    return universityDomains.some(d => domain === d || domain.endsWith('.' + d));
};
