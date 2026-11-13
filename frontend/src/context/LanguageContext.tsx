import React, { createContext, useContext, useState, type ReactNode } from 'react';

export type Language = 'en' | 'si' | 'ta';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Nav
    'nav.home': 'Home',
    'nav.jobs': 'Find Services',
    'nav.dashboard': 'Dashboard',
    'nav.postJob': 'Post a Service',
    'nav.profile': 'Profile',
    'nav.admin': 'Admin Portal',
    'nav.signIn': 'Sign In',
    'nav.getStarted': 'Get Started',
    'nav.logout': 'Log Out',

    // Hero
    'hero.title': 'Hire Trusted Services & Jobs in Sri Lanka',
    'hero.subtitle': 'Browse verified service providers, temporary gigs, and permanent jobs with direct WhatsApp and phone contact.',
    'hero.postBtn': 'Post Your Service Free',
    'hero.browseBtn': 'Browse Services',

    // Search
    'search.keyword': 'What service do you need? (e.g. Electrician, Web Dev)',
    'search.location': 'City or District (Colombo, Kandy, Galle...)',
    'search.allTypes': 'All Service Types',
    'search.temporary': 'Temporary Gig',
    'search.permanent': 'Permanent Hire',
    'search.button': 'Search Marketplace',

    // Listings
    'job.featured': 'FEATURED PROMOTED',
    'job.priority': 'PRIORITY',
    'job.expiresIn': 'Expires in',
    'job.unlimited': 'Unlimited Listing',
    'job.days': 'days',
    'job.contact': 'Contact Provider',
    'job.call': 'Call',
    'job.whatsapp': 'WhatsApp',
    'job.apply': 'Send Application',
    'job.views': 'views',
    'job.salary': 'Rate / Budget',
    'job.promoteTop': 'Bump to Top (Paid)',

    // Boost & Payments
    'boost.title': 'Promote Your Service to the Top',
    'boost.subtitle': 'Get 5x more customer calls and priority placement on HireJob marketplace.',
    'boost.plan7': '7 Days Priority Boost',
    'boost.plan30': '30 Days Super Placement',
    'boost.price7': 'LKR 1,500',
    'boost.price30': 'LKR 3,500',
    'boost.payNow': 'Pay to HireJob Company',
    'boost.method': 'Select Sri Lankan Payment Method',
    'boost.card': 'Debit / Credit Card (Visa/Master)',
    'boost.payhere': 'PayHere Online Gateway',
    'boost.bank': 'Bank Direct Deposit / Slip',

    // Duration
    'post.duration': 'Listing Duration',
    'post.durationUnlimited': 'Unlimited (Standard - Default)',
    'post.duration7': '7 Days (Auto-delete after 7 days)',
    'post.duration14': '14 Days (Auto-delete after 14 days)',
    'post.duration30': '30 Days (Auto-delete after 30 days)',

    // Contact fields
    'post.phone': 'Direct Contact Phone',
    'post.whatsapp': 'WhatsApp Number (for direct chat)',
    'post.email': 'Direct Email',

    // Auth & 2FA
    'auth.google': 'Continue with Google',
    'auth.orEmail': 'Or continue with email',
    'auth.2faTitle': '2FA Verification Required',
    'auth.2faDesc': 'Enter the 6-digit OTP code sent to your phone/email or verify passkey.',
    'auth.verifyOtp': 'Verify & Sign In',
    'auth.passkey': 'Verify Passkey / Biometrics',
    'auth.emailVerifyNotice': 'Email verification required before accessing services.',

    // Admin
    'admin.dashboard': 'Company Admin Center',
    'admin.revenue': 'Company Revenue from Boosts',
    'admin.users': 'Total Registered Users',
    'admin.activeListings': 'Active Marketplace Services',
    'admin.spamFlagged': 'ML Spam Flags',
    'admin.safeNotice': 'Admin privacy protection active: User passwords are encrypted and hidden.',

    // Theme & Common
    'theme.toggle': 'Toggle Dark/Light Mode',
    'lang.select': 'Language',
  },
  si: {
    // Nav
    'nav.home': 'මුල් පිටුව',
    'nav.jobs': 'සේවාවන් සොයන්න',
    'nav.dashboard': 'මගේ පුවරුව',
    'nav.postJob': 'සේවාවක් පළ කරන්න',
    'nav.profile': 'මගේ ගිණුම',
    'nav.admin': 'පරිපාලක පුවරුව',
    'nav.signIn': 'ඇතුල් වන්න',
    'nav.getStarted': 'ලියාපදිංචි වන්න',
    'nav.logout': 'ඉවත් වන්න',

    // Hero
    'hero.title': 'ශ්‍රී ලංකාවේ විශ්වාසදායක සේවාවන් සහ රැකියා සොයාගන්න',
    'hero.subtitle': 'කෙලින්ම WhatsApp සහ දුරකථනයෙන් සම්බන්ධ විය හැකි දක්ෂ ශිල්පීන් සහ සේවා සපයන්නන්.',
    'hero.postBtn': 'නොමිලේ සේවාවක් පළ කරන්න',
    'hero.browseBtn': 'සේවාවන් පිරික්සන්න',

    // Search
    'search.keyword': 'ඔබට අවශ්‍ය කුමන සේවාවද? (උදා: විදුලි කාර්මික, පෙදරේරු...)',
    'search.location': 'නගරය හෝ දිස්ත්‍රික්කය (කොළඹ, මහනුවර, ගාල්ල...)',
    'search.allTypes': 'සියලු සේවා වර්ග',
    'search.temporary': 'තාවකාලික වැඩ (Gigs)',
    'search.permanent': 'ස්ථිර රැකියා',
    'search.button': 'සොයන්න',

    // Listings
    'job.featured': 'විශේෂ ප්‍රමුඛතා සේවාව',
    'job.priority': 'ඉහළින්ම පෙන්වන සේවාව',
    'job.expiresIn': 'කල් ඉකුත් වීමට ඉතිරි දින',
    'job.unlimited': 'සීමාවක් රහිතයි (Unlimited)',
    'job.days': 'දින',
    'job.contact': 'සේවා සපයන්නා අමතන්න',
    'job.call': 'ඇමතුමක් ගන්න',
    'job.whatsapp': 'WhatsApp පණිවිඩයක්',
    'job.apply': 'අයදුම්පත යවන්න',
    'job.views': 'නැරඹූ වාර',
    'job.salary': 'මිල / ගාස්තුව',
    'job.promoteTop': 'ඉහළට ගෙන එන්න (ගෙවීම් සහිත)',

    // Boost & Payments
    'boost.title': 'ඔබගේ සේවාව පළමු පිටුවේ ඉහළටම ගෙන එන්න',
    'boost.subtitle': '5 ගුණයකින් වැඩි ගනුදෙනුකරුවන් ලබාගැනීමට ප්‍රමුඛතා පැකේජයක් තෝරාගන්න.',
    'boost.plan7': 'දින 7 ක ප්‍රමුඛතාව',
    'boost.plan30': 'දින 30 ක සුපිරි ප්‍රමුඛතාව',
    'boost.price7': 'රු. 1,500',
    'boost.price30': 'රු. 3,500',
    'boost.payNow': 'HireJob ආයතනයට ගෙවන්න',
    'boost.method': 'ගෙවීම් ක්‍රමය තෝරන්න',
    'boost.card': 'වීසා / මාස්ටර් කාඩ්පත්',
    'boost.payhere': 'PayHere ඔන්ලයින් ගෙවීම්',
    'boost.bank': 'බැංකු තැන්පතු / රිසිට්පත්',

    // Duration
    'post.duration': 'පළ කිරීමේ වලංගු කාල සීමාව',
    'post.durationUnlimited': 'අසීමිත කාලයක් (Unlimited - පෙරනිමිය)',
    'post.duration7': 'දින 7 යි (දින 7 කින් ස්වයංක්‍රීයව මැකේ)',
    'post.duration14': 'දින 14 යි (දින 14 කින් ස්වයංක්‍රීයව මැකේ)',
    'post.duration30': 'දින 30 යි (දින 30 කින් ස්වයංක්‍රීයව මැකේ)',

    // Contact fields
    'post.phone': 'දුරකථන අංකය',
    'post.whatsapp': 'WhatsApp අංකය (කෙලින්ම කතාබස් කිරීමට)',
    'post.email': 'විද්‍යුත් තැපෑල',

    // Auth & 2FA
    'auth.google': 'Google මගින් ඇතුල් වන්න',
    'auth.orEmail': 'නැතහොත් ඊමේල් මගින් ඇතුල් වන්න',
    'auth.2faTitle': '2FA තහවුරු කිරීම අවශ්‍යයි',
    'auth.2faDesc': 'ඔබගේ දුරකථනයට හෝ ඊමේල් ලිපිනයට එවූ ඉලක්කම් 6 ක OTP කේතය ඇතුළත් කරන්න.',
    'auth.verifyOtp': 'තහවුරු කර ඇතුල් වන්න',
    'auth.passkey': 'Passkey මගින් තහවුරු කරන්න',
    'auth.emailVerifyNotice': 'සේවාවන් භාවිතා කිරීමට පෙර ඊමේල් තහවුරු කිරීම සිදුකළ යුතුය.',

    // Admin
    'admin.dashboard': 'ආයතනික පරිපාලක මධ්‍යස්ථානය',
    'admin.revenue': 'ප්‍රමුඛතා ගෙවීම් වලින් ආයතනික ආදායම',
    'admin.users': 'ලියාපදිංචි පාරිභෝගිකයින් ගණන',
    'admin.activeListings': 'සක්‍රිය සේවා දැන්වීම් ගණන',
    'admin.spamFlagged': 'ML මගින් හඳුනාගත් සැකකටයුතු දැන්වීම්',
    'admin.safeNotice': 'පරිශීලක මුරපද (Passwords) සම්පූර්ණයෙන්ම සඟවා ආරක්ෂා කර ඇත.',

    // Theme & Common
    'theme.toggle': 'අඳුරු / ආලෝක තේමාව',
    'lang.select': 'භාෂාව',
  },
  ta: {
    // Nav
    'nav.home': 'முகப்பு',
    'nav.jobs': 'சேவைகளைத் தேடுக',
    'nav.dashboard': 'முகப்புப் பலகை',
    'nav.postJob': 'சேவையை இடுகையிடுக',
    'nav.profile': 'சுயவிவரம்',
    'nav.admin': 'நிர்வாகப் பலகை',
    'nav.signIn': 'உள்நுழைக',
    'nav.getStarted': 'பதிவுசெய்க',
    'nav.logout': 'வெளியேறுக',

    // Hero
    'hero.title': 'இலங்கையில் நம்பகமான சேவைகளையும் வேலைகளையும் கண்டறியுங்கள்',
    'hero.subtitle': 'வாட்ஸ்அப் மற்றும் தொலைபேசி மூலம் நேரடியாகத் தொடர்புகொள்ளக்கூடிய திறமையான பணியாளர்கள் மற்றும் சேவைகள்.',
    'hero.postBtn': 'இலவசமாக சேவையை இடுகையிடுக',
    'hero.browseBtn': 'சேவைகளை உலாவுக',

    // Search
    'search.keyword': 'உங்களுக்கு என்ன சேவை தேவை? (எ.கா: மின் பணியாளர், தச்சர்...)',
    'search.location': 'நகரம் அல்லது மாவட்டம் (கொழும்பு, கண்டி, காலி...)',
    'search.allTypes': 'அனைத்து சேவை வகைகள்',
    'search.temporary': 'தற்காலிக வேலைகள் (Gigs)',
    'search.permanent': 'நிரந்தர வேலைகள்',
    'search.button': 'தேடுக',

    // Listings
    'job.featured': 'சிறப்பு முன்னுரிமை சேவை',
    'job.priority': 'முன்னுரிமை பெற்றது',
    'job.expiresIn': 'காலாவதியாக மீதமுள்ள நாட்கள்',
    'job.unlimited': 'வரம்பற்ற காலம் (Unlimited)',
    'job.days': 'நாட்கள்',
    'job.contact': 'சேவை வழங்குநரைத் தொடர்பு கொள்க',
    'job.call': 'அழைக்க',
    'job.whatsapp': 'WhatsApp செய்தி',
    'job.apply': 'விண்ணப்பத்தை அனுப்புக',
    'job.views': 'பார்வைகள்',
    'job.salary': 'கட்டணம் / சம்பளம்',
    'job.promoteTop': 'முதன்மை இடத்திற்கு உயர்த்துக (கட்டணம்)',

    // Boost & Payments
    'boost.title': 'உங்கள் சேவையை முதன்மை இடத்திற்கு உயர்த்துங்கள்',
    'boost.subtitle': '5 மடங்கு அதிக வாடிக்கையாளர் அழைப்புகளைப் பெற முன்னுரிமைத் திட்டத்தைத் தேர்ந்தெடுக்கவும்.',
    'boost.plan7': '7 நாட்கள் முன்னுரிமை',
    'boost.plan30': '30 நாட்கள் அதிவிரைவு முன்னுரிமை',
    'boost.price7': 'ரூ. 1,500',
    'boost.price30': 'ரூ. 3,500',
    'boost.payNow': 'HireJob நிறுவனத்திற்கு செலுத்துக',
    'boost.method': 'கட்டண முறையைத் தேர்ந்தெடுக்கவும்',
    'boost.card': 'விசா / மாஸ்டர்கார்டு',
    'boost.payhere': 'PayHere இணையக் கட்டணம்',
    'boost.bank': 'வங்கி வைப்பு / ரசீது',

    // Duration
    'post.duration': 'இடுகை காலம்',
    'post.durationUnlimited': 'வரம்பற்ற காலம் (இயல்புநிலை)',
    'post.duration7': '7 நாட்கள் (7 நாட்களில் தானாகவே நீக்கப்படும்)',
    'post.duration14': '14 நாட்கள் (14 நாட்களில் தானாகவே நீக்கப்படும்)',
    'post.duration30': '30 நாட்கள் (30 நாட்களில் தானாகவே நீக்கப்படும்)',

    // Contact fields
    'post.phone': 'தொடர்பு தொலைபேசி எண்',
    'post.whatsapp': 'WhatsApp எண் (நேரடி அரட்டைக்கு)',
    'post.email': 'மின்னஞ்சல் முகவரி',

    // Auth & 2FA
    'auth.google': 'Google மூலம் தொடரவும்',
    'auth.orEmail': 'அல்லது மின்னஞ்சல் மூலம் தொடரவும்',
    'auth.2faTitle': '2FA சரிபார்ப்பு தேவை',
    'auth.2faDesc': 'உங்கள் தொலைபேசி அல்லது மின்னஞ்சலுக்கு அனுப்பப்பட்ட 6 இலக்க OTP குறியீட்டை உள்ளிடவும்.',
    'auth.verifyOtp': 'சரிபார்த்து உள்நுழைக',
    'auth.passkey': 'Passkey சரிபார்ப்பு',
    'auth.emailVerifyNotice': 'சேவைகளைப் பயன்படுத்துவதற்கு முன்பு மின்னஞ்சல் சரிபார்ப்பு தேவை.',

    // Admin
    'admin.dashboard': 'நிறுவன நிர்வாக மையம்',
    'admin.revenue': 'முன்னுரிமைக் கட்டணங்கள் மூலம் நிறுவன வருமானம்',
    'admin.users': 'பதிவுசெய்த பயனர்கள்',
    'admin.activeListings': 'செயலில் உள்ள சேவைகள்',
    'admin.spamFlagged': 'ML கண்டறிந்த சந்தேகத்திற்கிடமான விளம்பரங்கள்',
    'admin.safeNotice': 'பயனர் கடவுச்சொற்கள் முழுமையாக குறியாக்கம் செய்யப்பட்டு பாதுகாக்கப்பட்டுள்ளன.',

    // Theme & Common
    'theme.toggle': 'இருண்ட / வெளிச்ச தீம்',
    'lang.select': 'மொழி',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('hirejob_lang') as Language;
    return saved === 'si' || saved === 'ta' || saved === 'en' ? saved : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('hirejob_lang', lang);
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

