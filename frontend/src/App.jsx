import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Leaf, LayoutDashboard, Sprout, Stethoscope, History, 
  Wifi, Sun, Moon, Languages, Droplets, 
  ThermometerSun, FlaskConical, TestTube, 
  X, Sparkles, Send, Loader2, AlertTriangle,
  User, LogOut, ArrowRight, Info, CheckCircle2,
  Clock, Search, Download, MapPin, Activity
} from 'lucide-react';

// --- Kerala Context Data ---
const districts = [
  'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha', 'Kottayam', 
  'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad', 'Malappuram', 
  'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod'
];

const elevations = [
  { id: 'Lowland', nameEN: 'Lowland (Coastal/Plains)', nameML: 'താഴ്ന്ന പ്രദേശം (തീരദേശം/ഇടനാട്)' },
  { id: 'Midland', nameEN: 'Midland (Laterite hills)', nameML: 'ഇടനാട് (വെട്ടുകൽ പ്രദേശങ്ങൾ)' },
  { id: 'Highland', nameEN: 'Highland (Mountains)', nameML: 'മലനാട് (മലയോരപ്രദേശങ്ങൾ)' }
];

const categories = [
  { id: 'All', en: 'All', ml: 'എല്ലാം' },
  { id: 'Cereal', en: 'Cereal', ml: 'ധാന്യം' },
  { id: 'Plantation', en: 'Plantation', ml: 'തോട്ടവിള' },
  { id: 'Spice', en: 'Spice', ml: 'മസാല' },
  { id: 'Fruit', en: 'Fruit', ml: 'ഫലം' },
  { id: 'Tuber', en: 'Tuber', ml: 'കിഴങ്ങ്' },
  { id: 'Vegetable', en: 'Vegetable', ml: 'പച്ചക്കറി' }
];

const getSeason = () => {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 3 && month <= 5) return 'Summer';
  if (month >= 6 && month <= 8) return 'SW Monsoon';
  if (month >= 9 && month <= 11) return 'NE Monsoon';
  return 'Winter';
};

// --- INDEXED DB WRAPPER FOR PWA OFFLINE STORAGE ---
const DB_NAME = 'AgriEdgeDB';
const DB_VERSION = 2; // Incremented for indexes

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = (e) => reject(e.target.error);
    request.onsuccess = (e) => resolve(e.target.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (e.oldVersion < 1) {
        db.createObjectStore('user', { keyPath: 'id' });
      }
      if (e.oldVersion < 2) {
        if (!db.objectStoreNames.contains('history')) {
          const historyStore = db.createObjectStore('history', { keyPath: 'id' });
          historyStore.createIndex('date', 'date', { unique: false });
          historyStore.createIndex('crop', 'crop.id', { unique: false });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      }
    };
  });
};

const dbSaveUser = async (user) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('user', 'readwrite');
    tx.objectStore('user').put(user);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
};

const dbGetUser = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('user', 'readonly');
    const request = tx.objectStore('user').getAll();
    request.onsuccess = () => resolve(request.result[0] || null);
    request.onerror = (e) => reject(e.target.error);
  });
};

const dbClearUser = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('user', 'readwrite');
    tx.objectStore('user').clear();
    tx.oncomplete = () => resolve();
  });
};

const dbSaveHistory = async (record) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('history', 'readwrite');
    tx.objectStore('history').put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
};

const dbGetHistory = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('history', 'readonly');
    const request = tx.objectStore('history').getAll();
    request.onsuccess = () => {
      // Robust sorting by timestamp
      const sorted = request.result.sort((a, b) => b.timestamp - a.timestamp);
      resolve(sorted);
    };
    request.onerror = (e) => reject(e.target.error);
  });
};

const dbClearHistory = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('history', 'readwrite');
    tx.objectStore('history').clear();
    tx.oncomplete = () => resolve();
  });
};

// --- 1. Offline Databases (Crops & Pests with Exact Science) ---
const cropsDB = [
  { 
    id: 'paddy', nameEN: 'Paddy', nameML: 'നെല്ല്', cat: 'Cereal', pH: 6.5, N: 90, P: 45, K: 50, moistMin: 75, moistMax: 95, tempMin: 20, tempMax: 35, img: '🌾', 
    elevations: ['Lowland', 'Midland'], seasons: ['Summer', 'SW Monsoon', 'NE Monsoon'],
    guideEN: `Cultivate paddy by extensive puddling to create an impermeable soil layer. Maintain a continuous water level of 2-5 cm during vegetative growth to suppress weeds. Before transplanting 20-day-old seedlings, incorporate a heavy basal dressing of well-rotted farmyard manure. Top-dress with nitrogen at panicle initiation to ensure grain filling.`, 
    guideML: `മണ്ണ് നന്നായി ഉഴുതുമറിച്ച് ചെളിയാക്കി വേണം നെൽകൃഷി ചെയ്യാൻ. കളകളുടെ വളർച്ച തടയാൻ പാടത്ത് എപ്പോഴും 2-5 സെൻ്റീമീറ്റർ വെള്ളം കെട്ടിനിർത്തണം. 20 ദിവസം പ്രായമായ ഞാറുകൾ നടുന്നതിന് മുൻപ് പൊടിഞ്ഞ ചാണകമോ പച്ചിലവളമോ അടിവളമായി ചേർക്കുക. കതിര് വരുന്ന സമയത്ത് നൈട്രജൻ വളങ്ങൾ മേൽവളമായി നൽകുന്നത് നെൽമണികൾ നിറയാൻ സഹായിക്കും.`,
    organicEN: `Replace Urea with 10 tonnes/hectare of well-decomposed cow dung and integrate Azolla in the standing water. Substitute SSP with finely crushed Bone Meal during final puddling. For MOP, use pure wood ash. Spray Jeevamrutham every 14 days to boost microbial activity.`,
    organicML: `യൂറിയക്ക് പകരമായി ഹെക്ടറിന് 10 ടൺ ചാണകം അടിവളമായി ചേർക്കുക. പാടത്തെ വെള്ളത്തിൽ അസോള വളർത്തുന്നത് നൈട്രജൻ കൂട്ടും. ഫോസ്ഫറസിനായി അസ്ഥിപ്പൊടിയോ റോക്ക് ഫോസ്ഫേറ്റോ നിലം ഒരുക്കുമ്പോൾ വിതറുക. പൊട്ടാസ്യത്തിനായി മരച്ചാരമോ വാഴപ്പിണ്ടി കമ്പോസ്റ്റോ കലർത്തുക. ജീവാമൃതം തളിക്കുന്നത് വളർച്ചയ്ക്ക് നല്ലതാണ്.`
  },
  { 
    id: 'coconut', nameEN: 'Coconut', nameML: 'തേങ്ങ', cat: 'Plantation', pH: 6.5, N: 150, P: 90, K: 300, moistMin: 50, moistMax: 70, tempMin: 25, tempMax: 32, img: '🥥',
    elevations: ['Lowland', 'Midland', 'Highland'], seasons: ['Summer', 'SW Monsoon', 'NE Monsoon', 'Winter'],
    guideEN: `Plant disease-resistant seedlings in 1x1x1m pits filled with topsoil, cow dung, and ash. During summer, provide at least 200 liters of water per palm weekly to prevent button shedding. Apply 50 kg organic manure annually in split doses. Apply 50g Magnesium Sulphate and Borax annually to prevent crown yellowing.`,
    guideML: `അത്യുല്പാദന ശേഷിയുള്ള തൈകൾ 1x1x1 മീറ്റർ കുഴികളിൽ നടുക. കടുത്ത വേനൽക്കാലത്ത് മച്ചിങ്ങ കൊഴിച്ചിൽ തടയാൻ ആഴ്ചയിൽ 200 ലിറ്റർ വെള്ളമെങ്കിലും നൽകണം. ഓരോ തെങ്ങിനും 50 കിലോ ജൈവവളം വർഷത്തിൽ രണ്ട് തവണകളായി ചേർത്തു കൊടുക്കുക. ഓലകൾ മഞ്ഞളിക്കുന്നത് തടയാൻ 50 ഗ്രാം മഗ്നീഷ്യം സൾഫേറ്റും ബോറാക്സും നൽകുക.`,
    organicEN: `Replace Urea with 50 kg compost mixed with 5 kg Neem Cake per palm annually. For Phosphorus, incorporate 2 kg Steamed Bone Meal into the basin before monsoons. For Potassium, apply 15 kg dry wood ash with decaying coconut husks. Plant Cowpea in the basin to enrich soil nitrogen.`,
    organicML: `യൂറിയ ഒഴിവാക്കി ഓരോ തെങ്ങിനും 50 കിലോ ചാണകപ്പൊടിയും 5 കിലോ വേപ്പിൻ പിണ്ണാക്കും തടത്തിൽ ചേർക്കുക. ഫോസ്ഫറസ് ലഭിക്കാൻ 2 കിലോ അസ്ഥിപ്പൊടി മഴക്കാലത്തിന് മുൻപായി കലർത്തുക. പൊട്ടാസ്യത്തിനായി 15 കിലോ മരച്ചാരവും തൊണ്ടുകളും തടത്തിൽ കുഴിച്ചിടുക. തടത്തിൽ വൻപയർ നട്ടുപിടിപ്പിക്കുന്നത് നൈട്രജൻ വർദ്ധിപ്പിക്കും.`
  },
  { 
    id: 'rubber', nameEN: 'Rubber', nameML: 'റബ്ബർ', cat: 'Plantation', pH: 5.5, N: 100, P: 50, K: 120, moistMin: 60, moistMax: 80, tempMin: 25, tempMax: 35, img: '🌳',
    elevations: ['Midland', 'Highland'], seasons: ['SW Monsoon', 'NE Monsoon'],
    guideEN: `Plant budded stumps in well-drained pits after pre-monsoon showers. On hilly terrains, construct contour terraces and plant leguminous cover crops like Pueraria to prevent erosion. Apply fertilizers in September and April. Use plastic rain guards on tapping panels during monsoons to prevent bark rot.`,
    guideML: `മികച്ച വിളവ് നൽകുന്ന ബഡ് ചെയ്ത തൈകൾ വേനൽമഴ ലഭിച്ചയുടനെ നടുക. കുന്നിൻപ്രദേശങ്ങളിൽ മണ്ണൊലിപ്പ് തടയാൻ തട്ടുകൾ തിരിച്ച് നടുകയും പ്യൂറേറിയ പോലെയുള്ള ആവരണവിളകൾ വളർത്തുകയും ചെയ്യണം. ഏപ്രിൽ, സെപ്റ്റംബർ മാസങ്ങളിൽ വളം നൽകുക. കനത്ത മഴക്കാലത്ത് ടാപ്പിംഗ് ഭാഗത്ത് റെയിൻ ഗാർഡുകൾ ഘടിപ്പിച്ച് സംരക്ഷിക്കുക.`,
    organicEN: `Rely on thick leguminous cover crops (Mucuna/Pueraria) to naturally fix atmospheric nitrogen, replacing Urea. Broadcast Rock Phosphate over decaying cover crop residues for Phosphorus. Replace chemical MOP by retaining fallen dry rubber leaves and adding coir pith compost and wood ash for slow-release potassium.`,
    organicML: `തോട്ടം മുഴുവൻ ആവരണവിളകൾ നട്ടുപിടിപ്പിച്ചാൽ അന്തരീക്ഷത്തിൽ നിന്ന് നൈട്രജൻ ലഭിക്കുകയും യൂറിയ ഒഴിവാക്കുകയും ചെയ്യാം. ഫോസ്ഫറസിനായി റോക്ക് ഫോസ്ഫേറ്റ് വിതറിക്കൊടുക്കുക. പൊട്ടാഷിന് പകരമായി, കൊഴിഞ്ഞുവീഴുന്ന ഇലകൾ തോട്ടത്തിൽ അഴുകാൻ അനുവദിക്കുകയും ചകിരിച്ചോറ് കമ്പോസ്റ്റും മരച്ചാരവും തട്ടുകളിൽ നിക്ഷേപിക്കുകയും ചെയ്യുക.`
  },
  { 
    id: 'tapioca', nameEN: 'Tapioca', nameML: 'മരച്ചീനി', cat: 'Tuber', pH: 6.0, N: 100, P: 50, K: 100, moistMin: 40, moistMax: 60, tempMin: 25, tempMax: 32, img: '🥔',
    elevations: ['Lowland', 'Midland', 'Highland'], seasons: ['Summer', 'SW Monsoon'],
    guideEN: `Tapioca requires abundant sunlight and well-drained, loose soil to prevent root rot. Plow deeply and form raised mounds, planting mature 15-20 cm stem cuttings vertically. Ensuring perfect drainage during monsoons is critical. Perform weed management and earthing up 45 to 60 days after planting to encourage tuber expansion.`,
    guideML: `കിഴങ്ങുകൾ അഴുകാതിരിക്കാൻ ധാരാളം സൂര്യപ്രകാശവും വെള്ളം കെട്ടിനിൽക്കാത്ത ഇളക്കമുള്ള മണ്ണും ആവശ്യമാണ്. വലിയ കൂനകളോ വാരങ്ങളോ കോരിയ ശേഷം 15-20 സെൻ്റീമീറ്റർ നീളമുള്ള തണ്ടുകൾ കുത്തനെ നടുക. മഴക്കാലത്ത് വെള്ളം വാർന്നുപോകാൻ ചാലുകൾ കീറണം. നട്ട് 45-60 ദിവസങ്ങൾക്കുള്ളിൽ കളകൾ പറിച്ച് ചെടിയുടെ ചുവട്ടിലേക്ക് മണ്ണ് കൂട്ടിക്കൊടുക്കണം.`,
    organicEN: `Tapioca demands high potassium for starch. Replace MOP by applying pure wood ash (1.5 tonnes/hectare) and decomposed coconut husk during earthing-up. Substitute Urea with heavy applications of organic poultry manure integrated into the base soil. Utilize Bone Meal and Phosphate Solubilizing Bacteria (PSB) instead of SSP.`,
    organicML: `കപ്പയ്ക്ക് കിഴങ്ങ് വെക്കാൻ മണ്ണിൽ ധാരാളം പൊട്ടാസ്യം ആവശ്യമാണ്. പൊട്ടാഷിന് പകരമായി മരച്ചാരവും ചകിരിച്ചോറ് കമ്പോസ്റ്റും തടത്തിൽ ചേർക്കുക. യൂറിയ ഒഴിവാക്കാൻ കോഴിവളമോ ഉണങ്ങിയ ചാണകപ്പൊടിയോ മണ്ണിൽ കലർത്തുക. ഫോസ്ഫറസ് ലഭിക്കാൻ അസ്ഥിപ്പൊടിയും, പോഷകങ്ങൾ അലിയിച്ചെടുക്കാൻ പിഎസ്ബി (PSB) ജീവാണുവളങ്ങളും നൽകുക.`
  },
  { 
    id: 'cardamom', nameEN: 'Cardamom', nameML: 'ഏലം', cat: 'Spice', pH: 5.5, N: 60, P: 40, K: 120, moistMin: 75, moistMax: 90, tempMin: 15, tempMax: 30, img: '🌱', 
    elevations: ['Highland'], seasons: ['SW Monsoon', 'NE Monsoon'],
    guideEN: `Cardamom strictly demands dense overhead shade and continuous high atmospheric humidity. Plant vegetative suckers in shallow pits filled with topsoil, leaf compost, and cow dung. Heavily mulching the base using dry leaves is non-negotiable to preserve moisture and mimic the forest ecosystem. Annually remove all old, dried out leaves and exhausted shoots.`,
    guideML: `ഇടതൂർന്ന കാടുകൾക്ക് സമാനമായ നല്ല തണലും ഉയർന്ന ഈർപ്പവും ഉള്ള മലനാട് പ്രദേശങ്ങളിലാണ് ഏലം വളരുന്നത്. കാട്ടുമണ്ണും, ഉണങ്ങിയ ചാണകവും, കരിയിലക്കമ്പോസ്റ്റും നിറച്ച അധികം ആഴമില്ലാത്ത കുഴികളിൽ കന്നുകൾ നടുക. ചെടിയുടെ ചുവട്ടിൽ വർഷം മുഴുവനും കരിയിലകൾ പുതയിടേണ്ടത് നിർബന്ധമാണ്. എല്ലാ വർഷവും ഉണങ്ങിയ ഇലകളും പഴയ ശരങ്ങളും വെട്ടിമാറ്റി തോട്ടം വൃത്തിയാക്കണം.`,
    organicEN: `Cardamom roots require slow-releasing organic nutrition. Replace Urea by applying a thick mulch of forest leaves to add natural nitrogen. For P and K, apply 2 kg of premium vermicompost and topsoil mix per clump twice a year. Spraying diluted fish amino acid during panicle emergence boosts yield organically.`,
    organicML: `ഏലത്തിന്റെ മൃദുവായ വേരുകൾക്ക് പതുക്കെ അലിയുന്ന ജൈവവളങ്ങൾ നൽകുക. യൂറിയ ഒഴിവാക്കി, കാടുകളിൽ നിന്നുള്ള പച്ചിലകൾ കട്ടിയായി പുതയിടുക. ഫോസ്ഫറസിനും പൊട്ടാസ്യത്തിനും പകരമായി, വനത്തിലെ മേൽമണ്ണും ഉയർന്ന നിലവാരമുള്ള മണ്ണിരക്കമ്പോസ്റ്റും വർഷത്തിൽ രണ്ട് തവണ ഏലത്തടങ്ങളിൽ ഇട്ടുകൊടുക്കുക. കായ പിടിക്കുന്ന സമയത്ത് ഫിഷ് അമിനോ ആസിഡ് സ്പ്രേ ചെയ്യുന്നത് മികച്ച വിളവ് നൽകും.`
  },
  { 
    id: 'pepper', nameEN: 'Pepper', nameML: 'കുരുമുളക്', cat: 'Spice', pH: 6.0, N: 50, P: 50, K: 150, moistMin: 60, moistMax: 80, tempMin: 23, tempMax: 32, img: '🌿',
    elevations: ['Midland', 'Highland'], seasons: ['SW Monsoon'],
    guideEN: `Propagate using healthy runner shoots from proven mother vines. Plant rooted cuttings at the base of rough-barked support trees like Erythrina. Providing excellent soil drainage is the most vital practice to prevent fatal root rot. Constantly tie emerging shoots securely to the standard to encourage upward growth and lateral branching.`,
    guideML: `രോഗപ്രതിരോധ ശേഷിയുള്ള തള്ളവള്ളികളിൽ നിന്ന് തിരഞ്ഞെടുക്കുന്ന നടവള്ളികൾ ഉപയോഗിച്ചാണ് പുതിയ തൈകൾ ഉൽപ്പാദിപ്പിക്കേണ്ടത്. മുരിക്ക് പോലെയുള്ള പുറംതൊലി പരുക്കനായ താങ്ങുമരങ്ങളുടെ ചുവട്ടിലാണ് നടാറുള്ളത്. കൃഷിയിടത്തിൽ വെള്ളം കെട്ടിനിൽക്കാതെ ഡ്രെയിനേജ് ഉറപ്പാക്കണം, അല്ലാത്തപക്ഷം വേരുചീയൽ വരും. വള്ളികൾ വളരുന്നതിനനുസരിച്ച് അവയെ താങ്ങുമരത്തോട് ചേർത്ത് മൃദുവായി കെട്ടിക്കൊടുക്കേണ്ടതാണ്.`,
    organicEN: `Prioritize disease-free soil. Replace synthetic NPK by applying organic manure deeply enriched with Trichoderma viride and Pseudomonas to prevent fungal root wilt. Substitute Urea by broadcasting Groundnut cake mixed with Neem cake. For increased spice spike production, spray filtered fish amino acids directly onto leaves right before flowering.`,
    organicML: `NPK രാസവളങ്ങൾ ഒഴിവാക്കി, പകരം ട്രൈക്കോഡെർമയും സ്യൂഡോമോണാസും ചേർത്ത് സമ്പുഷ്ടമാക്കിയ ചാണകപ്പൊടി മാത്രം നൽകുക. ഇത് ദ്രുതവാട്ടത്തെ പ്രതിരോധിക്കാൻ സഹായിക്കും. നൈട്രജൻ ലഭിക്കാൻ കടലപ്പിണ്ണാക്കും വേപ്പിൻ പിണ്ണാക്കും തുല്യ അളവിൽ കലർത്തി വിതറുക. ധാരാളം പുതിയ തിരികൾ ഉണ്ടാകാൻ പൂക്കുന്നതിന് തൊട്ടുമുൻപായി ഫിഷ് അമിനോ ആസിഡ് ഇലകളിൽ സ്പ്രേ ചെയ്തു കൊടുക്കുക.`
  },
  { 
    id: 'banana', nameEN: 'Banana', nameML: 'പഴം', cat: 'Fruit', pH: 7.0, N: 180, P: 60, K: 300, moistMin: 60, moistMax: 80, tempMin: 26, tempMax: 35, img: '🍌',
    elevations: ['Lowland', 'Midland'], seasons: ['Summer', 'SW Monsoon', 'NE Monsoon'],
    guideEN: `Banana cultivation requires a continuous supply of macro-nutrients and regular irrigation. Select strictly disease-free sword suckers. As heavy fruit bunches mature, provide sturdy propping using wooden poles to prevent pseudostems from snapping during winds. Routinely execute desuckering to channel vital energy solely into developing the primary fruit bunch.`,
    guideML: `വാഴക്കൃഷിക്ക് അത്യധികം പോഷകങ്ങളും വേനൽക്കാലത്ത് ധാരാളം ജലസേചനവും അത്യന്താപേക്ഷിതമാണ്. രോഗബാധയില്ലാത്ത സൂചിക്കന്നുകൾ തന്നെ നടുക. വാഴ കുലച്ചു കഴിയുമ്പോൾ കാറ്റടിച്ചാൽ മറിഞ്ഞുവീഴാൻ സാധ്യതയുള്ളതിനാൽ താങ്ങ് (Propping) നൽകേണ്ടത് നിർബന്ധമാണ്. വാഴയുടെ ചുവട്ടിൽ നിന്ന് വളർന്നുവരുന്ന അധികമുള്ള മറ്റ് വാഴക്കന്നുകൾ കൃത്യമായ ഇടവേളകളിൽ വെട്ടിമാറ്റുന്ന പ്രക്രിയ (Desuckering) തുടർച്ചയായി ചെയ്യണം.`,
    organicEN: `Completely replace Urea by integrating 10-15 kg of green cow dung directly into the planting pit, followed by bi-monthly applications of fermented groundnut cake slurry. For Phosphorus, add 500g of Bone Meal per pit. Replace MOP by adding 2 kg of pure wood ash and chopped pseudostem compost for high potassium.`,
    organicML: `യൂറിയക്ക് പകരമായി നൈട്രജൻ ലഭിക്കാൻ, വാഴ നടുമ്പോൾ തന്നെ കുഴിയിൽ 10-15 കിലോ പച്ചച്ചാണകം ചേർക്കണം; തുടർന്ന് രണ്ട് മാസം കൂടുമ്പോഴും കടലപ്പിണ്ണാക്ക് പുളിപ്പിച്ച ജൈവവളം നൽകുക. ഫോസ്ഫറസ് ലഭിക്കാൻ നടുമ്പോൾ തന്നെ അര കിലോ അസ്ഥിപ്പൊടി മണ്ണിൽ കലർത്തുക. വാഴക്കുലയ്ക്ക് നല്ല വലിപ്പവും തൂക്കവും വെക്കാൻ MOP ഒഴിവാക്കി 2 കിലോ മരച്ചാരവും വാഴപ്പിണ്ടി കമ്പോസ്റ്റും നൽകുക.`
  },
  { 
    id: 'plantain', nameEN: 'Plantain (Nendran)', nameML: 'ഏത്തപ്പഴം', cat: 'Fruit', pH: 6.5, N: 150, P: 50, K: 250, moistMin: 65, moistMax: 80, tempMin: 25, tempMax: 35, img: '🍌',
    elevations: ['Lowland', 'Midland'], seasons: ['Summer', 'SW Monsoon', 'NE Monsoon'],
    guideEN: `Select certified, disease-free sword suckers. Apply abundant quantities of pure wood ash and well-decomposed cow dung to furnish required potassium levels. During dry periods, deeply water the plants every 3 to 4 days to prevent leaf yellowing. Physically wrapping developing fruit bunches using dry leaves prevents sunburn and insect attacks.`,
    guideML: `രോഗങ്ങളില്ലാത്തതും നല്ല കരുത്തുള്ളതുമായ സൂചിക്കന്നുകൾ കൃഷിക്കായി തിരഞ്ഞെടുക്കുക. വലിപ്പമുള്ള ഏത്തയ്ക്കകൾ ഉണ്ടാകുന്നതിന് പച്ചച്ചാണകവും മരച്ചാരവും വലിയ തോതിൽ ഇട്ടുകൊടുക്കേണ്ടത് അത്യാവശ്യമാണ്. കടുത്ത വേനൽക്കാലത്ത് ഇലകൾ ഉണങ്ങാതിരിക്കാൻ 3-4 ദിവസം കൂടുമ്പോൾ തടത്തിൽ വെള്ളം നിറയുന്ന രീതിയിൽ നനച്ചു കൊടുക്കണം. ഏത്തക്കുലകൾ വിരിഞ്ഞു വരുമ്പോൾ അവയെ ഉണങ്ങിയ വാഴയിലകൾ ഉപയോഗിച്ച് പൊതിഞ്ഞു സൂക്ഷിക്കുക.`,
    organicEN: `Provide basal nitrogen by adding 15 kg of green cow dung at planting, substituting Urea. Supplement with foliar drenches of Jeevamrutham every two weeks. Replace SSP with 500g of Bone Meal. The high potassium requirement for large fruits is met by strictly excluding MOP and applying 2 kg of wood ash deeply during the 3rd and 5th months.`,
    organicML: `യൂറിയ ഒഴിവാക്കി, നടുമ്പോൾ തന്നെ ഒരു കുഴിയിൽ 15 കിലോ പച്ചച്ചാണകം ചേർക്കുക. തുടർന്ന് വളർച്ചാഘട്ടങ്ങളിൽ ജീവാമൃതം രണ്ടാഴ്ച കൂടുമ്പോൾ തടത്തിൽ ഒഴിച്ചുകൊടുക്കുക. ഫോസ്ഫറസ് ലഭിക്കാൻ അര കിലോ അസ്ഥിപ്പൊടി ഉപയോഗിക്കാം. ഏത്തക്കുലയ്ക്ക് നല്ല വലിപ്പവും മഞ്ഞ നിറവും ലഭിക്കാൻ MOP ഒഴിവാക്കി, മൂന്നാം മാസത്തിലും അഞ്ചാം മാസത്തിലും കുറഞ്ഞത് 2 കിലോ വീതം മരച്ചാരം വാഴത്തടത്തിൽ വിതറുക.`
  },
  { 
    id: 'jackfruit', nameEN: 'Jackfruit', nameML: 'ചക്ക', cat: 'Fruit', pH: 6.0, N: 75, P: 30, K: 75, moistMin: 40, moistMax: 70, tempMin: 25, tempMax: 35, img: '🍈',
    elevations: ['Lowland', 'Midland', 'Highland'], seasons: ['Summer', 'SW Monsoon'],
    guideEN: `Jackfruit is incredibly resilient and notoriously low-maintenance. Plant grafted saplings (like Ayur Jack) to guarantee early fruiting and maintain a compact size. In early stages, perform structural pruning by entirely removing lower branches to develop a tremendously strong main trunk. The mature tree demands minimal inputs.`,
    guideML: `വലിയ പരിചരണങ്ങളൊന്നുമില്ലാതെ തന്നെ തഴച്ചുവളരുന്ന മരമാണ് പ്ലാവ്. സാധാരണ തൈകൾക്ക് പകരം ഗ്രാഫ്റ്റ് ചെയ്ത തൈകൾ (ആയുർ ജാക്ക്) നടാൻ എപ്പോഴും ശ്രദ്ധിക്കണം. ഇത്തരത്തിലുള്ള തൈകൾ വേഗത്തിൽ കായ്ക്കുമെന്നതും മരം വലിയ ഉയരത്തിൽ പോകാതെ നിൽക്കും എന്നതുമാണ് പ്രത്യേകത. വളർന്നു തുടങ്ങുന്ന ആദ്യ നാളുകളിൽ താഴെയുള്ള കൊമ്പുകൾ കൃത്യമായി വെട്ടിമാറ്റി പ്രധാന തടിക്ക് നല്ല കരുത്തും ബലവും നൽകുക.`,
    organicEN: `Jackfruit trees thrive without chemical NPK. Replace any Urea urge by applying 20 kg of well-composted cow dung or kitchen waste compost in a wide circular basin before the monsoon to provide steady, slow-release nitrogen. Supplement with a light dusting of wood ash to noticeably improve fruit sweetness and size. Continuous dried leaf mulching is sufficient for soil health.`,
    organicML: `പ്ലാവിന് വളർച്ചയുടെ ഒരു ഘട്ടത്തിലും രാസവളങ്ങളുടെ ആവശ്യമില്ല. യൂറിയയും മറ്റ് രാസവളങ്ങളും പൂർണ്ണമായും ഒഴിവാക്കാം. എല്ലാ വർഷവും മഴക്കാലത്തിന് തൊട്ടുമുൻപായി പ്ലാവിന്റെ ചുവട്ടിൽ വട്ടത്തിൽ വലിയൊരു തടമെടുത്ത് അതിൽ കരിയിലകളും 10-15 കിലോ ചാണകപ്പൊടിയോ കമ്പോസ്റ്റോ ഇട്ട് മണ്ണുമായി മൂടുക. മരച്ചാരം വിതറുന്നത് ചക്കയ്ക്ക് കൂടുതൽ മധുരം നൽകും.`
  },
  { 
    id: 'arecanut', nameEN: 'Arecanut', nameML: 'അടയ്ക്ക', cat: 'Plantation', pH: 6.0, N: 100, P: 40, K: 140, moistMin: 50, moistMax: 70, tempMin: 20, tempMax: 32, img: '🌴',
    elevations: ['Midland', 'Highland'], seasons: ['Summer', 'SW Monsoon', 'NE Monsoon', 'Winter'],
    guideEN: `Plant vigorous seedlings in deep, well-prepared pits to guarantee a strong root system capable of supporting the slender palm. Protect young seedlings from sun scorching by wrapping dried areca leaves around their fragile stems. To actively combat Mahali disease (Fruit rot) during monsoons, proactively spray a concentrated 1% Bordeaux mixture on developing bunches before the rains.`,
    guideML: `കാറ്റിൽ മറിഞ്ഞുവീഴാതിരിക്കാൻ വളരെ ശക്തമായ വേരുപടലം ആവശ്യമായതിനാൽ ആരോഗ്യമുള്ള കവുങ്ങിൻ തൈകൾ നല്ല ആഴവും വീതിയുമുള്ള കുഴികളെടുത്ത് നടാൻ ശ്രദ്ധിക്കണം. ഇളം തൈകളെ വെയിലിൽ നിന്ന് സംരക്ഷിക്കാൻ ഉണങ്ങിയ പാളകൾ ഉപയോഗിച്ച് തടി മറച്ചു കെട്ടുക. മഴക്കാലത്ത് അടയ്ക്ക കൊഴിഞ്ഞുവീഴുന്ന മഹാളി രോഗം തടയാൻ, മഴ തുടങ്ങുന്നതിന് മുൻപായി എല്ലാ കുലകളിലും 1% വീര്യമുള്ള ബോർഡോ മിശ്രിതം തളിച്ചിരിക്കണം.`,
    organicEN: `Arecanut thrives on heavy yearly applications of natural organic matter. Replace Urea by applying 12 to 15 kg of rich compost or cow dung per palm before the monsoon, alongside 500g of Neem cake. Substitute SSP with 500g of Rock Phosphate. To replace MOP for better nut sizing, apply 1.5 kg of pure wood ash per basin.`,
    organicML: `യൂറിയ ഒഴിവാക്കാൻ കാലവർഷത്തിന് മുൻപായി ഓരോ കവുങ്ങിനും 12-15 കിലോ വരെ ഉണങ്ങിപ്പൊടിഞ്ഞ ചാണകമോ കമ്പോസ്റ്റോ തടത്തിൽ ചേർക്കുക. ഒപ്പം അര കിലോ വേപ്പിൻ പിണ്ണാക്ക് കൂടി നൽകുന്നത് നിമാവിരകളെ നശിപ്പിക്കും. ഫോസ്ഫറസ് ലഭിക്കാൻ അര കിലോ റോക്ക് ഫോസ്ഫേറ്റും, അടയ്ക്കയ്ക്ക് നല്ല വിളവ് ലഭിക്കാൻ പൊട്ടാസ്യത്തിന് പകരമായി ഒന്നര കിലോ ശുദ്ധമായ മരച്ചാരവും തടത്തിൽ നൽകുക.`
  }
];

const pestsDB = [
  { 
    id: 'rhinocerous_beetle', nameEN: 'Rhinoceros Beetle', nameML: 'കൊമ്പൻ ചെല്ലി',
    keywords: ['hole', 'cut', 'v-shape', 'crown', 'beetle', 'spots', 'dry leaf', 'falling leaves', 'കൊമ്പൻ', 'ചെല്ലി', 'ഓല', 'വെട്ട്'],
    symptomsEN: 'Adults bore into unopened fronds and spathes, causing characteristic V-shaped cuts on emerging leaves. Severe attacks destroy the growing point (heart) of the palm, stunting growth or killing young palms.',
    symptomsML: 'വിരിയാത്ത ഇളം ഓലകളിലും പൂങ്കുലകളിലും തുരന്നുകയറുന്നു. ഓലകൾ വിരിയുമ്പോൾ V ആകൃതിയിലുള്ള വെട്ടുകൾ കാണാം. കൂമ്പ് നശിപ്പിച്ച് തെങ്ങിന്റെ വളർച്ച മുരടിപ്പിക്കുന്നു.',
    organicEN: 'Apply a 1:2 mixture of neem cake and river sand in the innermost leaf axils. Use PVC pheromone traps (Rhinolure) laced with castor cake to attract and trap flying adults.',
    organicML: 'വേപ്പിൻ പിണ്ണാക്കും മണലും 1:2 അനുപാതത്തിൽ കൂട്ടി മണ്ടയിൽ ഇടുക. റൈനോലൂർ ഫിറമോൺ കെണികൾ തോട്ടത്തിൽ സ്ഥാപിക്കുക.',
    chemicalEN: 'Apply 10% Sevidol granules or Carbaryl 50 WP mixed with sand in the leaf axils during severe infestations, strictly avoiding rainy days.',
    chemicalML: 'ആക്രമണം രൂക്ഷമാണെങ്കിൽ സെവിഡോൾ ഗുളികകൾ അല്ലെങ്കിൽ കാർബാറിൽ മണലുമായി കലർത്തി മണ്ടയിൽ ഇടുക.',
    preventiveEN: 'Maintain strict plantation hygiene. Destroy decaying organic matter, compost pits, and dead palm trunks where larvae heavily breed.',
    preventiveML: 'തോട്ടം വൃത്തിയായി സൂക്ഷിക്കുക. ചാണകക്കുഴികളിലും അഴുകിയ തടികളിലുമാണ് ഇവ പെരുകുന്നത്, അതിനാൽ അവ നശിപ്പിക്കുക.'
  },
  { 
    id: 'red_palm_weevil', nameEN: 'Red Palm Weevil', nameML: 'ചുവന്ന ചെല്ലി',
    keywords: ['hole', 'oozing', 'liquid', 'sound', 'chewing', 'red', 'brown', 'rotting', 'ദ്രാവകം', 'ശബ്ദം', 'ചുവന്ന', 'ചെല്ലി'],
    symptomsEN: 'Grubs bore deep inside the trunk. Visible symptoms include small holes oozing a foul-smelling, brownish-red viscous liquid and a chilling chewing sound echoing from within. The crown eventually collapses.',
    symptomsML: 'പുഴുക്കൾ തെങ്ങിൻതടിയുടെ ഉള്ളിൽ തുരന്നുകയറി കാർന്നുതിന്നുന്നു. ദ്വാരങ്ങളിൽ നിന്ന് ദുർഗന്ധമുള്ള ചുവപ്പ് ദ്രാവകം ഒലിച്ചിറങ്ങുകയും, തടിക്ക് ഉള്ളിൽ പുഴുക്കൾ കരണ്ടുതിന്നുന്നതിന്റെ ശബ്ദം കേൾക്കുകയും ചെയ്യും.',
    organicEN: 'Deploy bucket pheromone traps. If detected early, inject pure neem oil or highly concentrated garlic extract deep into the oozing holes and plug them airtight with wet clay.',
    organicML: 'ഫിറമോൺ കെണികൾ ഉപയോഗിക്കുക. തുടക്കത്തിലേ കണ്ടാൽ ദ്വാരങ്ങൾക്കുള്ളിലേക്ക് ശുദ്ധമായ വേപ്പെണ്ണയോ വെളുത്തുള്ളി സത്തോ പമ്പ് ചെയ്ത് ദ്വാരങ്ങൾ കളിമണ്ണ് വെച്ച് അടയ്ക്കുക.',
    chemicalEN: 'Inject approved systemic insecticides (like Indoxacarb) directly into the trunk holes and seal with mud. Use only as a last resort.',
    chemicalML: 'കൃഷിഭവൻ നിർദ്ദേശിക്കുന്ന കീടനാശിനികൾ (Indoxacarb) ദ്വാരങ്ങളിലൂടെ ഒഴിച്ച് അടയ്ക്കുക.',
    preventiveEN: 'Ensure absolutely no mechanical injuries or deep cuts to the soft trunk or fragile leaf bases, as exposed wounds act as magnets inviting female weevils to lay eggs.',
    preventiveML: 'വെട്ടുകത്തി കൊണ്ടോ മറ്റോ തെങ്ങിൻതടിയിലോ ഓലമടലുകളിലോ യാതൊരുവിധത്തിലുള്ള മുറിവുകളും ഉണ്ടാക്കാതിരിക്കാൻ കർഷകർ പ്രത്യേകം ശ്രദ്ധിക്കണം.'
  },
  { 
    id: 'rice_stem_borer', nameEN: 'Rice Stem Borer', nameML: 'തണ്ടുതുരപ്പൻ പുഴു',
    keywords: ['dead heart', 'white ear', 'dry', 'borer', 'stem', 'dry leaf', 'wilting', 'തണ്ട്', 'വെൺകതിർ', 'പുഴു'],
    symptomsEN: 'Caterpillars bore into the rice stem causing "dead heart" (drying of central leaf shoot) in young plants and "white ear" (empty white panicles) during the flowering stage.',
    symptomsML: 'പുഴുക്കൾ നെല്ലിന്റെ തണ്ട് തുരന്ന് കയറുന്നു. ഇളം കൂമ്പില കരിഞ്ഞുണങ്ങുന്ന "ഡെഡ് ഹാർട്ട്" അവസ്ഥയും, നെൽമണികൾ പതിരായി കതിർ വെളുത്തുനിൽക്കുന്ന "വെൺകതിർ" അവസ്ഥയും ഉണ്ടാകുന്നു.',
    organicEN: 'Release Trichogramma egg parasitoids directly into the field. Repeatedly spray potent Neem Seed Kernel Extract (NSKE 5%) during initial infestation phases.',
    organicML: 'ട്രൈക്കോഗ്രമ്മ പോലെയുള്ള മിത്രകീടങ്ങളെ പാടത്ത് തുറന്നുവിടുക. 5% വീര്യമുള്ള വേപ്പിൻകുരു സത്ത് (NSKE) തയ്യാറാക്കി പാടത്ത് നന്നായി തളിക്കുക.',
    chemicalEN: 'Apply Cartap Hydrochloride 4G granules or spray Chlorantraniliprole according to expert local agricultural department advisories.',
    chemicalML: 'ആക്രമണം രൂക്ഷമാണെങ്കിൽ കാർട്ടാപ്പ് ഹൈഡ്രോക്ലോറൈഡ് ഗുളികകൾ പാടത്ത് വിതറുകയോ മരുന്നടിക്കുകയോ ചെയ്യുക.',
    preventiveEN: 'Manually clip off the extreme tips of all rice seedlings exactly before transplanting to remove the vast majority of unseen borer eggs.',
    preventiveML: 'ഞാറുകൾ പറിച്ച് പ്രധാന പാടത്തേക്ക് നടുന്നതിന് തൊട്ടുമുൻപായി എല്ലാ ഞാറുകളുടെയും ഇലകളുടെ അറ്റം നുള്ളി മാറ്റുക.'
  },
  { 
    id: 'quick_wilt', nameEN: 'Quick Wilt (Phytophthora)', nameML: 'ദ്രുതവാട്ടം',
    keywords: ['yellow', 'wilting', 'drop', 'rot', 'fall', 'falling leaves', 'dry leaf', 'rotting', 'curling', 'വാട്ടം', 'മഞ്ഞ', 'കൊഴിയുക'],
    symptomsEN: 'Deadly fungal disease in pepper. Leaves rapidly turn pale yellow and drop off, spice spikes fall, and the entire vine wilts and dies within a few weeks.',
    symptomsML: 'കുരുമുളക് വള്ളികൾ പെട്ടെന്ന് മഞ്ഞളിച്ച് ഉണങ്ങിപ്പോകുന്ന ഫംഗസ് രോഗം. ഇലകളും തിരികളും കൊഴിഞ്ഞുവീഴുകയും വള്ളി പൂർണ്ണമായും നശിക്കുകയും ചെയ്യുന്നു.',
    organicEN: 'Drench the soil base extensively with Trichoderma viride enriched organic manure. Spray a strong formulation of 1% Bordeaux mixture on the lower leaves and soil.',
    organicML: 'ട്രൈക്കോഡെർമ (Trichoderma) ചേർത്ത ജൈവവളം നൽകുക. ചുവട്ടിലെ മണ്ണ് ഇളക്കി 1% ബോർഡോ മിശ്രിതം ഇലകളിലും തടത്തിലും ഒഴിച്ചുകൊടുക്കുക.',
    chemicalEN: 'Apply Potassium Phosphonate (0.3%) or Metalaxyl-Mancozeb as a soil drench during the onset of the heavy monsoon.',
    chemicalML: 'കാലവർഷം തുടങ്ങുന്നതിന് മുൻപായി മെറ്റലാക്സിൽ-മാങ്കോസെബ് പോലെയുള്ള കുമിൾനാശിനികൾ മണ്ണിൽ ഒഴിച്ചുകൊടുക്കുക.',
    preventiveEN: 'Provide rigorous and excellent soil drainage, as vines are exceptionally susceptible to root rot caused by prolonged water stagnation around the root zone.',
    preventiveML: 'മണ്ണിൽ ഈർപ്പം കെട്ടിനിന്നാൽ വളരെ പെട്ടെന്ന് രോഗം വരും. അതിനാൽ തോട്ടത്തിൽ വെള്ളം ഒട്ടും കെട്ടിനിൽക്കുന്നില്ല എന്ന് ഉറപ്പാക്കുക.'
  },
  { 
    id: 'fruit_fly', nameEN: 'Fruit Fly', nameML: 'കായീച്ച',
    keywords: ['rot', 'maggot', 'fall', 'fruit', 'yellow', 'spots', 'holes', 'rotting', 'കായീച്ച', 'പുഴു', 'അഴുകുക'],
    symptomsEN: 'Maggots hatch from eggs laid under the skin and feed inside ripening fruits and vegetables. Fruits rot internally, turn yellow prematurely, and fall to the ground.',
    symptomsML: 'പഴങ്ങളിലും പച്ചക്കറികളിലും മുട്ടയിടുന്നു. പുഴുക്കൾ കായ്കളുടെ കാമ്പ് തിന്നുനശിപ്പിക്കുന്നു. കായ്കൾ പഴുക്കാൻ തുടങ്ങുന്നതിന് മുൻപ് തന്നെ അഴുകി താഴെ കൊഴിഞ്ഞുവീഴുന്നു.',
    organicEN: 'Proactively wrap developing tender fruits tightly with breathable paper bags. Use Cue-lure or Methyl eugenol pheromone traps across the orchard.',
    organicML: 'ഇളം കായ്കൾ കടലാസ് കവറുകൾ ഉപയോഗിച്ച് പൂർണ്ണമായും പൊതിഞ്ഞു സംരക്ഷിക്കുക. കായീച്ചകളെ ആകർഷിക്കുന്ന ഫിറമോൺ കെണികൾ തൂക്കിയിടുക.',
    chemicalEN: 'Spot spraying of Malathion mixed with jaggery (as bait) on lower branches can be used, though not recommended for organic produce.',
    chemicalML: 'ശർക്കര ലായനിയിൽ മാലത്തിയോൺ കലർത്തി ഇലകളിൽ തളിക്കുന്നത് ഈച്ചകളെ ആകർഷിച്ച് കൊല്ലാൻ സഹായിക്കും.',
    preventiveEN: 'Orchard sanitation is critical. Gather all prematurely fallen, infested fruits and bury them deeply or destroy them by burning to break the breeding cycle.',
    preventiveML: 'തോട്ടത്തിന്റെ ശുചിത്വമാണ് പ്രധാനം. കായീച്ച കുത്തി കേടായി താഴെ വീഴുന്ന കായ്കൾ പെറുക്കിക്കൂട്ടി മണ്ണിൽ ആഴത്തിൽ കുഴിച്ചിടുകയോ തീയിട്ട് നശിപ്പിക്കുകയോ ചെയ്യണം.'
  }
];

const i18n = {
  en: {
    appName: "AGRI EDGE",
    dashboard: "Dashboard",
    crops: "Crops",
    doctor: "Plant Doctor",
    history: "History",
    connectWiFi: "Connect ESP32",
    connected: "Connected",
    disconnected: "Disconnected",
    analyzeSoil: "Analyze Soil & Predict Crop",
    predicting: "Calculating AI Gap Score...",
    fertilizerNeeded: "Actionable Fertilizer Plan",
    optimal: "Optimal",
    alert: "Alert",
    askDoctor: "Describe pest symptoms (e.g. 'Yellow spots')...",
    send: "Ask Expert System",
    aiGuide: "Farming Guide",
    organicAlt: "Organic Alternatives",
    close: "Close",
    area: "Farm Area",
    unit: "Unit",
    soilOptimal: "✅ Soil is completely optimal. No heavy inputs needed.",
    soilReport: "Full Soil Health Report",
    cropRotation: "Companion/Rotation",
    connectFirst: "Please connect your sensor first.",
    connectDesc: "Connect your ESP32 hardware to capture live soil data.",
    connecting: "Connecting...",
    welcomeBack: "Welcome Back",
    enterName: "Enter full name",
    enterPhone: "Enter mobile number",
    districtLabel: "Select District",
    elevationLabel: "Select Agro-Ecological Zone",
    startFarming: "Enter Dashboard",
    loginDesc: "Set up your farm profile to get geographically localized recommendations.",
    profile: "Profile",
    logout: "Log Out",
    tutorialTitle: "How to Use Agri Edge",
    tutF1Title: "🔗 Hardware Connection",
    tutF1Desc: "Connect the ESP32 to stream NPK, pH, Moisture, and Temp live.",
    tutF2Title: "🌱 Smart Precision Farming",
    tutF2Desc: "Our algorithm matches your soil, district, and elevation to the best crops. Enter your farm size for exact fertilizer kg outputs.",
    tutF3Title: "🩺 Plant Doctor (Offline)",
    tutF3Desc: "Type symptoms. Get organic treatments, chemical fallback, and preventive steps instantly, completely offline.",
    gotIt: "Start Farming",
    topMatches: "Top Suitable Crops for your Zone",
    match: "Match",
    selectBtn: "Select",
    chooseLangTitle: "Choose Language / ഭാഷ",
    englishBtn: "English",
    malayalamBtn: "മലയാളം",
    fullNameLabel: "Full Name",
    phoneLabel: "Phone Number",
    historyTitle: "Soil Analysis Log",
    historyEmpty: "No past data found. Run an analysis first.",
    viewResult: "View Details",
    searchCrops: "Search crops...",
    categoryAll: "All",
    downloadPDF: "Print Report",
    offlineError: "Couldn't match this symptom precisely. Please try descriptive keywords like 'yellow', 'hole', or 'wilting'.",
    rotationDesc: "Best rotation strategies to restore soil health:",
    rotationLegumes: "Legumes (Cowpea, Green gram) - Fixes atmospheric nitrogen.",
    rotationDeepRoot: "Deep-rooted tubers (Yam, Tapioca) - Excellent follow-up to shallow-rooted crops.",
    rotationVeg: "Vegetables (Okra, Bitter gourd) - Good for breaking pest cycles.",
    offlineAlternativeMsg: "General Organic Fertilizer Protocol:\n\n1. Urea (N) Replacement: Cow dung, Poultry manure, Groundnut cake.\n2. SSP (P) Replacement: Bone meal, Rock phosphate.\n3. MOP (K) Replacement: Wood ash, Banana peel compost.",
    selectOneCrop: "Select a crop below for precise fertilizer kg values based on your land area.",
    connectModalTitle: "Connect ESP32 Hardware",
    espIpLabel: "ESP32 IP Address",
    connectRealBtn: "Connect Real Device",
    connectMockBtn: "Run Simulation (Mock Data)",
    cancelBtn: "Cancel",
    fetchError: "Connection failed. Ensure ESP32 is on the same network with CORS enabled.",
    sensorFault: "Sensor Fault Detected! Unrealistic readings found (e.g. Moisture > 100% or Negative NPK). Check probe.",
    seasonPre: "Current Season:",
    pestRiskPre: "Weather Pest Risk:",
    symptomsLbl: "Symptoms:",
    organicLbl: "Organic Treatment:",
    chemicalLbl: "Chemical Fallback:",
    preventiveLbl: "Preventive Actions:"
  },
  ml: {
    appName: "അഗ്രി എഡ്ജ്",
    dashboard: "ഡാഷ്‌ബോർഡ്",
    crops: "വിളകൾ",
    doctor: "പ്ലാന്റ് ഡോക്ടർ",
    history: "ചരിത്രം",
    connectWiFi: "സെൻസർ ബന്ധിപ്പിക്കുക",
    connected: "ബന്ധിപ്പിച്ചു",
    disconnected: "വിച്ഛേദിക്കപ്പെട്ടു",
    analyzeSoil: "മണ്ണ് പരിശോധിച്ച് വിള നിർദ്ദേശിക്കുക",
    predicting: "അൽഗോരിതം പരിശോധിക്കുന്നു...",
    fertilizerNeeded: "കൃത്യമായ വളപ്രയോഗം (kg)",
    optimal: "അനുയോജ്യം",
    alert: "മുന്നറിയിപ്പ്",
    askDoctor: "രോഗലക്ഷണങ്ങൾ വിവരിക്കുക...",
    send: "ചോദിക്കുക",
    aiGuide: "കൃഷി മാർഗ്ഗനിർദ്ദേശം",
    organicAlt: "ജൈവ ബദലുകൾ",
    close: "അടയ്ക്കുക",
    area: "കൃഷിസ്ഥലത്തിന്റെ വിസ്തീർണ്ണം",
    unit: "യൂണിറ്റ്",
    soilOptimal: "✅ മണ്ണ് പൂർണ്ണമായും അനുയോജ്യമാണ്! അമിതവളങ്ങൾ ആവശ്യമില്ല.",
    soilReport: "മണ്ണ് പരിശോധനാ റിപ്പോർട്ട്",
    cropRotation: "വിള പരിക്രമണം",
    connectFirst: "ആദ്യം സെൻസറുകൾ ബന്ധിപ്പിക്കുക.",
    connectDesc: "തത്സമയ വിവരങ്ങൾക്കായി ESP32 സെൻസർ ബന്ധിപ്പിക്കുക.",
    connecting: "ബന്ധിപ്പിക്കുന്നു...",
    welcomeBack: "സ്വാഗതം",
    enterName: "മുഴുവൻ പേര്",
    enterPhone: "മൊബൈൽ നമ്പർ",
    districtLabel: "ജില്ല തിരഞ്ഞെടുക്കുക",
    elevationLabel: "ഭൂപ്രകൃതി (Elevation)",
    startFarming: "തുടങ്ങാം",
    loginDesc: "നിങ്ങളുടെ ജില്ലയ്ക്കും ഭൂപ്രകൃതിക്കും അനുയോജ്യമായ വിളകൾ കണ്ടെത്താൻ പ്രൊഫൈൽ സെറ്റ് ചെയ്യുക.",
    profile: "പ്രൊഫൈൽ",
    logout: "ലോഗൗട്ട്",
    tutorialTitle: "അഗ്രി എഡ്ജ് എങ്ങനെ ഉപയോഗിക്കാം",
    tutF1Title: "🔗 സെൻസർ ബന്ധിപ്പിക്കുക",
    tutF1Desc: "ESP32 ഉപയോഗിച്ച് തത്സമയ NPK, pH, ഈർപ്പം എന്നിവ കാണാം.",
    tutF2Title: "🌱 കൃത്യമായ കൃഷി",
    tutF2Desc: "നിങ്ങളുടെ മണ്ണ്, ജില്ല, ഭൂപ്രകൃതി എന്നിവ വിശകലനം ചെയ്ത് മികച്ച വിളകൾ നിർദ്ദേശിക്കുന്നു.",
    tutF3Title: "🩺 പ്ലാന്റ് ഡോക്ടർ",
    tutF3Desc: "ഇന്റർനെറ്റ് ഇല്ലെങ്കിലും കീടങ്ങളുടെ ലക്ഷണങ്ങൾ നൽകി ജൈവ-രാസ പ്രതിവിധികൾ കണ്ടെത്താം.",
    gotIt: "തുടങ്ങാം",
    topMatches: "നിങ്ങളുടെ ഭൂപ്രകൃതിക്ക് അനുയോജ്യമായ വിളകൾ",
    match: "യോജിച്ചത്",
    selectBtn: "തിരഞ്ഞെടുക്കുക",
    chooseLangTitle: "ഭാഷ തിരഞ്ഞെടുക്കുക",
    englishBtn: "English",
    malayalamBtn: "മലയാളം",
    fullNameLabel: "പേര്",
    phoneLabel: "ഫോൺ നമ്പർ",
    historyTitle: "മണ്ണ് പരിശോധനാ ചരിത്രം",
    historyEmpty: "മുൻകാല ഫലങ്ങൾ ലഭ്യമല്ല.",
    viewResult: "വിശദാംശങ്ങൾ",
    searchCrops: "വിളകൾ തിരയുക...",
    categoryAll: "എല്ലാം",
    downloadPDF: "റിപ്പോർട്ട് പ്രിന്റ് ചെയ്യുക",
    offlineError: "ഈ ലക്ഷണം കൃത്യമായി കണ്ടെത്താനായില്ല. ദയവായി ലക്ഷണങ്ങൾ കുറച്ചുകൂടി വ്യക്തമായി നൽകുക (ഉദാഹരണത്തിന്: മഞ്ഞ, തുള, വാട്ടം).",
    rotationDesc: "മണ്ണിന്റെ വളക്കൂറ് വീണ്ടെടുക്കാൻ മികച്ച വിള പരിക്രമണം:",
    rotationLegumes: "പയർവർഗ്ഗങ്ങൾ (വൻപയർ, ചെറുപയർ) - നൈട്രജൻ വർദ്ധിപ്പിക്കാൻ.",
    rotationDeepRoot: "കിഴങ്ങുവർഗ്ഗങ്ങൾ (കപ്പ, ചേന) - ആഴത്തിൽ വേരോടാത്ത വിളകൾക്ക് ശേഷം നടാൻ ഉത്തമം.",
    rotationVeg: "പച്ചക്കറികൾ (വെണ്ട, പാവൽ) - കീടങ്ങളുടെ തുടർച്ച ഒഴിവാക്കാൻ.",
    offlineAlternativeMsg: "പൊതുവായ ജൈവവളങ്ങൾ:\n\n1. യൂറിയക്ക് പകരം: ചാണകം, കോഴിവളം, കടലപ്പിണ്ണാക്ക്.\n2. ഫോസ്ഫറസിന് പകരം: എല്ലുപൊടി, റോക്ക് ഫോസ്ഫേറ്റ്.\n3. പൊട്ടാസ്യത്തിന് പകരം: മരച്ചാരം, വാഴപ്പിണ്ടി കമ്പോസ്റ്റ്.",
    selectOneCrop: "വളപ്രയോഗവും കൃഷിരീതിയും അറിയാൻ താഴെ നിന്ന് ഒരു വിള തിരഞ്ഞെടുക്കുക.",
    connectModalTitle: "സെൻസർ ബന്ധിപ്പിക്കുക",
    espIpLabel: "ESP32 ഐപി വിലാസം",
    connectRealBtn: "ഹാർഡ്‌വെയർ ബന്ധിപ്പിക്കുക",
    connectMockBtn: "മാതൃകാ ഡാറ്റ (Test)",
    cancelBtn: "റദ്ദാക്കുക",
    fetchError: "കണക്ട് ചെയ്യാൻ കഴിഞ്ഞില്ല. ഐപി വിലാസവും വൈഫൈയും പരിശോധിക്കുക.",
    sensorFault: "സെൻസർ തകരാർ! അസാധാരണമായ റീഡിംഗ് (ഉദാ: ഈർപ്പം 100%-ന് മുകളിൽ അല്ലെങ്കിൽ നെഗറ്റീവ് മൂല്യങ്ങൾ). പ്രോബ് പരിശോധിക്കുക.",
    seasonPre: "നിലവിലെ കാലാവസ്ഥ:",
    pestRiskPre: "കാലാവസ്ഥാ കീട മുന്നറിയിപ്പ്:",
    symptomsLbl: "ലക്ഷണങ്ങൾ:",
    organicLbl: "ജൈവ പ്രതിവിധി:",
    chemicalLbl: "രാസകീടനാശിനി (അത്യാവശ്യമെങ്കിൽ):",
    preventiveLbl: "മുൻകരുതലുകൾ:"
  }
};

export default function App() {
  const [lang, setLang] = useState('en');
  const [languageSelected, setLanguageSelected] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [localUser, setLocalUser] = useState(null); 
  const [user, setUser] = useState(null); 
  const [loginForm, setLoginForm] = useState({ name: '', phone: '', district: 'Ernakulam', elevation: 'Midland' });
  
  const [showTutorial, setShowTutorial] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState([]);

  // IoT State
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [espIp, setEspIp] = useState('192.168.4.1');
  const [connected, setConnected] = useState(false);
  const [connectionType, setConnectionType] = useState('none'); // 'none', 'real', 'mock'
  const [isConnecting, setIsConnecting] = useState(false);
  const [sensors, setSensors] = useState({ pH: 0, N: 0, P: 0, K: 0, temp: 0, moisture: 0 });
  const [pollIntervalId, setPollIntervalId] = useState(null);
  
  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [predictionList, setPredictionList] = useState(null); 
  const [resultModal, setResultModal] = useState(null);
  const [farmArea, setFarmArea] = useState(1);
  const [farmUnit, setFarmUnit] = useState('Acre'); 
  
  const [searchInput, setSearchInput] = useState('');
  const [cropSearch, setCropSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [chatQuery, setChatQuery] = useState('');
  const chatEndRef = useRef(null);

  const t = i18n[lang];
  const currentSeason = getSeason();
  const useSensorProxy = import.meta.env.VITE_SENSOR_PROXY !== 'false';

  useEffect(() => {
    const loadDB = async () => {
      // Request persistent storage for mobile PWA
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(console.error);
      }

      try {
        const savedUser = await dbGetUser();
        if (savedUser) {
          setLocalUser(savedUser);
          setUser(savedUser); 
          setLanguageSelected(true); 
          
          const savedHistory = await dbGetHistory();
          setAnalysisHistory(savedHistory || []);
        }
      } catch (error) {
        console.error("IndexedDB Load Error:", error);
        alert("Warning: Local storage unavailable. Operating in volatile mode.");
      }
    };
    loadDB();
  }, []);

  useEffect(() => {
    let metaThemeColor = document.querySelector("meta[name=theme-color]");
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.name = "theme-color";
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.content = darkMode ? "#064e3b" : "#059669";
  }, [darkMode]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Normalizing search query for better Malayalam matches
    const handler = setTimeout(() => setCropSearch(searchInput.normalize("NFD").replace(/[\u0300-\u036f]/g, "")), 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  useEffect(() => {
    // Unconditional scrolling for Chat / Report outputs
    if (aiResponse && chatEndRef.current) {
      setTimeout(() => chatEndRef.current.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [aiResponse]);

  // Cleanup polling interval on unmount or ID change
  useEffect(() => {
    return () => {
      if (pollIntervalId) clearInterval(pollIntervalId);
    };
  }, [pollIntervalId]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loginForm.name && loginForm.phone.length >= 10) {
      const newUser = { ...loginForm, id: Date.now() };
      try {
        await dbSaveUser(newUser); 
        setLocalUser(newUser);
        setUser(newUser);
        setShowTutorial(true);
      } catch(e) {
        alert("Failed to save profile data.");
      }
    } else {
      alert(lang === 'en' ? "Please enter valid details." : "ശരിയായ വിവരങ്ങൾ നൽകുക.");
    }
  };

  const handleLogout = async () => {
    if (window.confirm(lang === 'en' ? "Log out completely? Data will be cleared from this device." : "ലോഗൗട്ട് ചെയ്യണമെന്നുറപ്പാണോ? ഈ ഫോണിലെ വിവരങ്ങൾ മായ്‌ക്കപ്പെടും.")) {
      await dbClearUser(); 
      await dbClearHistory();
      setUser(null);
      setLocalUser(null);
      setLoginForm({ name: '', phone: '', district: 'Ernakulam', elevation: 'Midland' });
      setConnected(false);
      setConnectionType('none');
      if(pollIntervalId) clearInterval(pollIntervalId);
      setSensors({ pH: 0, N: 0, P: 0, K: 0, temp: 0, moisture: 0 });
      setAnalysisHistory([]);
      setPredictionList(null);
      setResultModal(null);
    }
  };

  // Robust ESP32 Connection Fallback
  const handleRealConnect = async (e) => {
    e.preventDefault();
    setIsConnecting(true);
    let success = false;
    const endpoints = ['/data', '/sensor', '/api', '/readings'];
    
    const fetchSensor = async (endpoint) => {
      const url = useSensorProxy
        ? `/_/backend/api/sensor?host=${encodeURIComponent(espIp)}&path=${encodeURIComponent(endpoint)}`
        : `http://${espIp}${endpoint}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        // Securely coalesce missing data
        setSensors(prev => ({ 
          pH: data.pH ?? prev.pH, 
          N: data.N ?? prev.N, 
          P: data.P ?? prev.P, 
          K: data.K ?? prev.K, 
          temp: data.temp ?? prev.temp, 
          moisture: data.moisture ?? prev.moisture 
        }));
        return true;
      }
      return false;
    };

    let activeEndpoint = null;
    for (let endpoint of endpoints) {
      if (success) break;
      try {
        success = await fetchSensor(endpoint);
        if (success) activeEndpoint = endpoint;
      } catch (error) {
        console.log(`Failed endpoint: ${endpoint}`);
      }
    }
    
    if (success) {
      setConnected(true);
      setConnectionType('real');
      setShowConnectModal(false);
      
      // Dynamic Polling for Live updates
      const id = setInterval(async () => {
        try {
          const isStillSuccess = await fetchSensor(activeEndpoint);
          if(!isStillSuccess) throw new Error("Dropped");
        } catch(err) {
          console.warn("Connection lost.");
          setConnected(false);
          setConnectionType('none');
          clearInterval(id);
        }
      }, 30000);
      setPollIntervalId(id);

    } else {
      alert(t.fetchError);
    }
    setIsConnecting(false);
  };

  const handleMockConnect = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setConnected(true);
      setConnectionType('mock');
      setIsConnecting(false);
      setSensors({ pH: 5.8, N: 80, P: 40, K: 120, temp: 28, moisture: 65 });
      setShowConnectModal(false);
    }, 1000);
  };

  const handleAnalyze = () => {
    if (!connected) return alert(t.connectFirst);

    // Sensor Fault Detection
    if (sensors.moisture > 100 || sensors.moisture < 0 || sensors.pH > 14 || sensors.pH < 0 || sensors.N < 0 || sensors.P < 0 || sensors.K < 0 || sensors.temp > 60 || sensors.temp < -10) {
      return alert(t.sensorFault);
    }

    setIsAnalyzing(true);
    setTimeout(() => {
      let scoredCrops = cropsDB.map(crop => {
        const moistGap = sensors.moisture < crop.moistMin ? crop.moistMin - sensors.moisture : (sensors.moisture > crop.moistMax ? sensors.moisture - crop.moistMax : 0);
        const tempGap = sensors.temp < crop.tempMin ? crop.tempMin - sensors.temp : (sensors.temp > crop.tempMax ? sensors.temp - crop.tempMax : 0);
        const pHGap = Math.abs(sensors.pH - crop.pH);
        
        // Balanced Scoring Formula
        let gap = (pHGap * 10) + (Math.max(0, crop.N - sensors.N) * 1) + (Math.max(0, crop.P - sensors.P) * 1) + (Math.max(0, crop.K - sensors.K) * 0.7) + (moistGap * 2) + (tempGap * 4);
        
        // Zone & Season Dynamic Penalities
        if (!crop.elevations?.includes(user.elevation)) gap += 200; 
        if (!crop.seasons?.includes(currentSeason)) gap += 50; 

        let reason = "";
        if (gap < 200) {
           if (pHGap <= 0.5 && moistGap === 0 && tempGap === 0) reason = lang === 'en' ? `Perfect match for ${user.elevation} in ${currentSeason} ✅` : `${user.elevation} പ്രദേശത്തിന് തികച്ചും അനുയോജ്യം ✅`;
           else if (moistGap === 0 && tempGap === 0) reason = lang === 'en' ? "Good climate match ⛅" : "നല്ല കാലാവസ്ഥ ⛅";
           else reason = lang === 'en' ? "Nutrient profile matches 🌱" : "വളക്കൂറ് അനുയോജ്യമാണ് 🌱";
        } else {
           reason = lang === 'en' ? "Not optimal for this zone/season ⚠️" : "ഈ പ്രദേശത്തിന്/കാലാവസ്ഥയ്ക്ക് അനുയോജ്യമല്ല ⚠️";
        }
        
        return { ...crop, gap, reason };
      });
      scoredCrops.sort((a, b) => a.gap - b.gap);
      
      const top5 = scoredCrops.slice(0, 5).map(crop => ({
        ...crop,
        matchPercent: Math.max(5, 100 - (crop.gap / 4)).toFixed(0) // Reverted to /4 to fix optimistic bias while keeping normalization
      }));
      setPredictionList(top5);
      setIsAnalyzing(false);
    }, 1500);
  };

  const calculateFertilizer = async (crop) => {
    let urea = 0, ssp = 0, mop = 0, lime = 0;
    
    if (connected) {
      urea = Math.min(350, Math.max(0, (crop.N - sensors.N) / 0.46));
      ssp = Math.min(450, Math.max(0, (crop.P - sensors.P) * 6.25)); 
      mop = Math.min(300, Math.max(0, (crop.K - sensors.K) * 2));
      
      if (sensors.pH < 4.5) lime = 800;
      else if (sensors.pH < 5.5) lime = 500;
      else if (sensors.pH < 6.0) lime = 250;
    } else {
      // Baseline requirements if disconnected (browsing mode)
      urea = Math.min(350, crop.N / 0.46);
      ssp = Math.min(450, crop.P * 6.25);
      mop = Math.min(300, crop.K * 2);
    }
    
    const resultObj = { crop, baseReq: { urea, ssp, mop, lime }, isLive: connected };
    setResultModal(resultObj);
    setAiResponse(''); 
    
    if (connected) {
      const timestamp = Date.now();
      const newRecord = {
        id: timestamp,
        timestamp: timestamp,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        crop: crop,
        baseReq: { urea, ssp, mop, lime },
        sensors: sensors
      };
      const updatedHistory = [newRecord, ...analysisHistory].slice(0, 100); 
      setAnalysisHistory(updatedHistory);
      await dbSaveHistory(newRecord);
    }
  };

  const selectPredictedCrop = (crop) => {
    setPredictionList(null);
    void calculateFertilizer(crop);
  };

  const activeFerts = useMemo(() => {
    if (!resultModal) return [];
    let multiplier = 1;
    if (farmUnit === 'Acre') multiplier = 0.404686;
    if (farmUnit === 'Cent') multiplier = 0.00404686;
    if (farmUnit === 'Hectare') multiplier = 1;
    
    const totalAreaMultiplier = multiplier * (farmArea || 0);
    const { urea, ssp, mop, lime } = resultModal.baseReq;

    return [
      { key: 'lime', label: 'Lime / കുമ്മായം (pH)', val: parseFloat((lime * totalAreaMultiplier).toFixed(1)), color: 'border-yellow-400' },
      { key: 'urea', label: 'Urea / യൂറിയ (N)', val: parseFloat((urea * totalAreaMultiplier).toFixed(1)), color: 'border-blue-500' },
      { key: 'ssp', label: 'SSP (Super Phosphate) / Bone Meal alternative (P)', val: parseFloat((ssp * totalAreaMultiplier).toFixed(1)), color: 'border-purple-500' },
      { key: 'mop', label: 'MOP / പൊട്ടാഷ് (K)', val: parseFloat((mop * totalAreaMultiplier).toFixed(1)), color: 'border-red-500' }
    ].filter(f => f.val > 0);
  }, [resultModal, farmUnit, farmArea]);

  // Actionable Offline Output Engine
  const generateOfflineSoilReport = () => {
    let report = [`**${t.seasonPre}** ${currentSeason} | **Zone:** ${user.elevation}\n`];
    
    // Pest Risk Prediction (Weather-based) with elevation scaling
    let pestRisk = "";
    const fungalMoistTrigger = user.elevation === 'Highland' ? 70 : 75; // Highland more susceptible at slightly lower moisture due to dew/fog
    const fungalTempMax = user.elevation === 'Highland' ? 28 : 32;

    if (sensors.moisture >= fungalMoistTrigger && sensors.temp <= fungalTempMax) {
      pestRisk = lang === 'en' 
        ? `⚠️ **PEST RISK ALERTS:** High humidity (>=${fungalMoistTrigger}%) & optimal temps detected. High fungal risk! Watch for **Quick Wilt (Phytophthora)** in Pepper and **Mahali** in Arecanut.` 
        : `⚠️ **കാലാവസ്ഥാ കീട മുന്നറിയിപ്പ്:** കടുത്ത ഫംഗസ് രോഗങ്ങൾക്ക് സാധ്യതയുണ്ട്. കുരുമുളകിലെ ദ്രുതവാട്ടം, കവുങ്ങിലെ മഹാളി എന്നിവ പ്രത്യേകം ശ്രദ്ധിക്കുക.`;
      report.push(pestRisk);
    } else if (sensors.moisture < 50 && sensors.temp > 32) {
       pestRisk = lang === 'en' ? "⚠️ **HEAT STRESS RISK:** High heat & low moisture. Watch for mite attacks (Eriophyid mite) and ensure deep watering." : "⚠️ **വരൾച്ചാ മുന്നറിയിപ്പ്:** കടുത്ത ചൂട്. മണ്ടരി പോലെയുള്ള കീടങ്ങളെ ശ്രദ്ധിക്കുകയും തടത്തിൽ ധാരാളം വെള്ളം നൽകുകയും ചെയ്യുക.";
       report.push(pestRisk);
    }

    report.push(`\n**${t.fertilizerNeeded}:**`);

    if(sensors.pH < 4.5) report.push(lang==='en' ? "🔴 pH is severely acidic. **Action:** Broadcast 800 kg/ha agricultural lime." : "🔴 മണ്ണിൽ പുളിപ്പ് വളരെ കൂടുതലാണ്. **പരിഹാരം:** ഹെക്ടറിന് 800 കിലോ കുമ്മായം നൽകുക.");
    else if(sensors.pH < 5.5) report.push(lang==='en' ? "🔴 pH is moderately acidic. **Action:** Broadcast 500 kg/ha agricultural lime." : "🔴 മണ്ണിൽ പുളിപ്പ് കൂടുതലാണ്. **പരിഹാരം:** ഹെക്ടറിന് 500 കിലോ കുമ്മായം നൽകുക.");
    else if(sensors.pH < 6.0) report.push(lang==='en' ? "🟡 pH is slightly acidic. **Action:** Broadcast 250 kg/ha agricultural lime." : "🟡 മണ്ണിൽ നേരിയ പുളിപ്പ്. **പരിഹാരം:** ഹെക്ടറിന് 250 കിലോ കുമ്മായം നൽകുക.");
    else if(sensors.pH > 7.5) report.push(lang==='en' ? "🔴 pH is alkaline. **Action:** Apply heavy organic compost to balance." : "🔴 മണ്ണിൽ ക്ഷാരഗുണം കൂടുതൽ. **പരിഹാരം:** കമ്പോസ്റ്റ് ചേർക്കുക.");
    else report.push(lang==='en' ? "✅ pH is Optimal (Neutral)." : "✅ മണ്ണിന്റെ പുളിപ്പ് വളരെ അനുയോജ്യമായ നിലയിലാണ്.");

    if(sensors.N < 50) report.push(lang==='en' ? "🔴 Nitrogen is critically low. **Action:** Apply well-rotted cow dung and Neem cake immediately." : "🔴 നൈട്രജൻ വളരെ കുറവ്. **പരിഹാരം:** ചാണകപ്പൊടിയും വേപ്പിൻ പിണ്ണാക്കും ഉടൻ നൽകുക.");
    if(sensors.P < 20) report.push(lang==='en' ? "🔴 Phosphorus is low. **Action:** Apply Steamed Bone Meal." : "🔴 ഫോസ്ഫറസ് കുറവ്. **പരിഹാരം:** അസ്ഥിപ്പൊടി വിതറുക.");
    if(sensors.K < 100) report.push(lang==='en' ? "🔴 Potassium is low. **Action:** Apply pure wood ash or banana peel compost." : "🔴 പൊട്ടാസ്യം കുറവ്. **പരിഹാരം:** മരച്ചാരം നൽകുക.");

    if (sensors.N >= 50 && sensors.P >= 20 && sensors.K >= 100) report.push(lang==='en' ? "✅ NPK levels are sufficient for basic growth." : "✅ മണ്ണിൽ ആവശ്യത്തിന് NPK പോഷകങ്ങളുണ്ട്.");

    report.push(lang==='en' ? "\n*(Refer to specific Crop predictions for exact kg/acre limits)*" : "\n*(കൃത്യമായ അളവുകൾ അറിയാൻ താഴെയുള്ള വിളകൾ തിരഞ്ഞെടുക്കുക)*");
    return report.join('\n\n');
  };

  const getOfflinePestRemedy = (query) => {
    const lowerQuery = query.toLowerCase();
    const matchedPest = pestsDB.find(p => 
      lowerQuery.includes(p.nameEN.toLowerCase()) || 
      query.includes(p.nameML) ||
      (p.keywords && p.keywords.some(kw => lowerQuery.includes(kw)))
    );
    
    if(matchedPest) {
      return lang === 'en' 
        ? `**Disease/Pest:** ${matchedPest.nameEN}\n\n**${t.symptomsLbl}**\n${matchedPest.symptomsEN}\n\n**${t.organicLbl}**\n${matchedPest.organicEN}\n\n**${t.chemicalLbl}**\n${matchedPest.chemicalEN}\n\n**${t.preventiveLbl}**\n${matchedPest.preventiveEN}` 
        : `**രോഗം/കീടം:** ${matchedPest.nameML}\n\n**${t.symptomsLbl}**\n${matchedPest.symptomsML}\n\n**${t.organicLbl}**\n${matchedPest.organicML}\n\n**${t.chemicalLbl}**\n${matchedPest.chemicalML}\n\n**${t.preventiveLbl}**\n${matchedPest.preventiveML}`;
    }
    return t.offlineError;
  };

  // Local Offline Expert System Routing (100% Offline)
  const handleAIRequest = (promptText, type = 'general') => {
    setAiLoading(true);
    setTimeout(() => {
      let response = "";
      if (type === 'pest') response = getOfflinePestRemedy(promptText);
      else if (type === 'soil') response = generateOfflineSoilReport();
      else if (type === 'guide') response = lang === 'en' ? `**Agri Edge Guide for ${resultModal.crop.nameEN}:**\n\n${resultModal.crop.guideEN}` : `**${resultModal.crop.nameML} കൃഷിരീതി:**\n\n${resultModal.crop.guideML}`;
      else if (type === 'organic') {
        if (resultModal && resultModal.crop.organicEN) {
           response = lang === 'en' ? `**Organic Fertilizer Protocol for ${resultModal.crop.nameEN}:**\n\n${resultModal.crop.organicEN}` : `**${resultModal.crop.nameML} - ജൈവവള പ്രയോഗം:**\n\n${resultModal.crop.organicML}`;
        } else {
           response = t.offlineAlternativeMsg;
        }
      }
      else if (type === 'rotation') {
        let dynamicRotation = "";
        if (resultModal) {
            if (resultModal.crop.cat === 'Tuber') dynamicRotation = lang === 'en' ? `1. ${t.rotationLegumes}` : `1. ${t.rotationLegumes}`;
            else if (resultModal.crop.cat === 'Cereal' || resultModal.crop.cat === 'Vegetable') dynamicRotation = lang === 'en' ? `1. ${t.rotationLegumes}\n2. ${t.rotationDeepRoot}` : `1. ${t.rotationLegumes}\n2. ${t.rotationDeepRoot}`;
            else dynamicRotation = lang === 'en' ? `1. ${t.rotationLegumes}\n2. Vegetables (Okra, Bitter gourd) - Good for breaking pest cycles.` : `1. ${t.rotationLegumes}\n2. പച്ചക്കറികൾ (വെണ്ട, പാവൽ) - കീടങ്ങളുടെ തുടർച്ച ഒഴിവാക്കാൻ.`;
        } else {
            dynamicRotation = `${t.rotationLegumes}\n${t.rotationDeepRoot}`;
        }
        response = `${t.rotationDesc}\n\n${dynamicRotation}`;
      }
      else response = t.offlineAlternativeMsg;
      
      setAiResponse(response);
      setAiLoading(false);
    }, 500); 
  };

  const askOrganicAlternatives = () => {
    handleAIRequest(`organic`, 'organic');
  };
  const askFarmGuide = () => handleAIRequest(`guide`, 'guide');
  const askCropRotation = () => handleAIRequest(`rotation`, 'rotation');
  const askSoilReport = () => {
    if (!connected) return alert(t.connectFirst);
    handleAIRequest(`soil`, 'soil');
  };
  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatQuery.trim()) return;
    handleAIRequest(chatQuery, 'pest');
    setChatQuery('');
  };

  const generatePDF = () => window.print();

  const filteredCrops = useMemo(() => {
    return cropsDB.filter(c => {
      const normalizedSearch = cropSearch.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const matchesSearch = c.nameEN.toLowerCase().includes(normalizedSearch) || c.nameML.includes(cropSearch);
      
      // Robust Category mapping
      const categoryIndex = categories.findIndex(cat => cat.ml === activeCategory || cat.en === activeCategory);
      const mappedCategory = categoryIndex !== -1 ? categories[categoryIndex].en : activeCategory;
      const matchesCategory = activeCategory === 'All' || activeCategory === 'എല്ലാം' || c.cat === mappedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [cropSearch, activeCategory, lang]);

  const Gauge = ({ icon: Icon, label, value, max, unit, optimal, color }) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    const isOptimal = value >= optimal[0] && value <= optimal[1];
    return (
      <div className={`p-4 rounded-2xl flex flex-col items-center justify-center border-2 shadow-sm transition-all duration-300 ${isOptimal ? 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-red-400/30 bg-red-50/50 dark:bg-red-900/10'}`}>
        <Icon className={`w-8 h-8 mb-2 ${color}`} />
        <span className="text-sm text-slate-500 dark:text-slate-400 font-medium text-center">{label}</span>
        <div className="flex items-baseline space-x-1 mt-1">
          <span className="text-3xl font-bold dark:text-white">{value}</span>
          <span className="text-sm font-semibold text-slate-400">{unit}</span>
        </div>
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full mt-3 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-1000 ${isOptimal ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${percentage}%` }} />
        </div>
        <span className={`text-xs mt-2 font-semibold px-2 py-1 rounded-full ${isOptimal ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'}`}>
          {isOptimal ? t.optimal : t.alert}
        </span>
      </div>
    );
  };

  const AIResponseCard = ({ text }) => (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-emerald-900/20 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800 relative mt-4 animate-in fade-in self-start w-full shadow-sm print:shadow-none print:border-slate-300">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h4 className="font-bold text-emerald-800 dark:text-emerald-300">
            {lang === 'en' ? "Expert System Insight" : "എക്സ്പർട്ട് സിസ്റ്റം വിവരങ്ങൾ"}
          </h4>
        </div>
        <div className="flex items-center space-x-1 print:hidden">
          <button onClick={() => setAiResponse('')} className="text-emerald-600 dark:text-emerald-400 p-1.5 hover:bg-emerald-200 dark:hover:bg-emerald-800 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed markdown-body">
         {text}
      </div>
    </div>
  );

  return (
    <div className={`${darkMode ? 'dark' : ''} h-screen w-full overflow-hidden flex flex-col print:h-auto print:overflow-visible`}>
      <div className="h-full w-full bg-slate-50 dark:bg-slate-900 flex flex-col font-sans transition-colors duration-300 text-slate-800 dark:text-slate-100 relative print:bg-white print:text-black">
        
        {(!languageSelected || !user) && (
          <div className="absolute top-4 right-4 flex space-x-2 z-50">
            {languageSelected && (
              <button onClick={() => setLang(lang === 'en' ? 'ml' : 'en')} className="p-2 bg-emerald-100 dark:bg-slate-800 rounded-full text-emerald-700 dark:text-emerald-400">
                <Languages className="w-5 h-5" />
              </button>
            )}
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 bg-emerald-100 dark:bg-slate-800 rounded-full text-emerald-700 dark:text-emerald-400">
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        )}

        {!languageSelected ? (
          <div className="flex-1 flex items-center justify-center p-4 animate-in fade-in duration-500">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl w-full max-w-sm border border-slate-100 dark:border-slate-700 text-center">
              <div className="flex justify-center mb-6">
                <div className="bg-emerald-100 dark:bg-emerald-900/50 p-5 rounded-full shadow-inner"><Sprout className="w-14 h-14 text-emerald-600 dark:text-emerald-400" /></div>
              </div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-2">AGRI EDGE</h1>
              <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-8 font-serif">അഗ്രി എഡ്ജ്</h2>
              <div className="space-y-4">
                <button onClick={() => { setLang('en'); setLanguageSelected(true); }} className="w-full bg-slate-100 hover:bg-emerald-50 dark:bg-slate-700 font-bold py-4 rounded-2xl transition-all text-lg text-slate-800 dark:text-white">{t.englishBtn}</button>
                <button onClick={() => { setLang('ml'); setLanguageSelected(true); }} className="w-full bg-slate-100 hover:bg-emerald-50 dark:bg-slate-700 font-bold py-4 rounded-2xl transition-all text-xl font-serif text-slate-800 dark:text-white">{t.malayalamBtn}</button>
              </div>
            </div>
          </div>
        ) : 
        
        !user ? (
          <div className="flex-1 flex items-center justify-center p-4 animate-in zoom-in-95 duration-500 overflow-y-auto">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100 dark:border-slate-700 mt-10 mb-10">
              <div className="flex justify-center mb-6">
                <div className="bg-emerald-100 dark:bg-emerald-900/50 p-4 rounded-full shadow-inner"><Sprout className="w-12 h-12 text-emerald-600 dark:text-emerald-400" /></div>
              </div>
              <h1 className={`text-2xl font-black text-center mb-2 tracking-wide text-slate-800 dark:text-white ${lang === 'ml' ? 'font-serif' : 'font-sans'}`}>{t.appName}</h1>
              <p className="text-center text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">{t.loginDesc}</p>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 ml-1">{t.fullNameLabel}</label>
                  <input type="text" value={loginForm.name} onChange={(e) => setLoginForm({...loginForm, name: e.target.value})} className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white transition" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 ml-1">{t.phoneLabel}</label>
                  <input type="tel" value={loginForm.phone} onChange={(e) => setLoginForm({...loginForm, phone: e.target.value})} className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white transition" required />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                   <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 ml-1">{t.districtLabel}</label>
                    <select value={loginForm.district} onChange={(e) => setLoginForm({...loginForm, district: e.target.value})} className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white transition text-sm">
                      {districts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                   </div>
                   <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 ml-1">{t.elevationLabel}</label>
                    <select value={loginForm.elevation} onChange={(e) => setLoginForm({...loginForm, elevation: e.target.value})} className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white transition text-sm">
                      {elevations.map(e => <option key={e.id} value={e.id}>{lang === 'en' ? e.nameEN : e.nameML}</option>)}
                    </select>
                   </div>
                </div>

                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/30 active:scale-95 transition-all mt-4">
                  <span>{t.startFarming}</span><ArrowRight className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          <>
            {showConnectModal && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl w-full max-w-sm shadow-2xl flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black dark:text-white">{t.connectModalTitle}</h2>
                    <button onClick={() => setShowConnectModal(false)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-slate-200"><X className="w-5 h-5" /></button>
                  </div>
                  <form onSubmit={handleRealConnect} className="space-y-4 mb-6 border-b border-slate-200 dark:border-slate-700 pb-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">{t.espIpLabel}</label>
                      <input type="text" value={espIp} onChange={(e) => setEspIp(e.target.value)} placeholder="192.168.4.1" className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white transition font-mono text-center" required />
                    </div>
                    <button type="submit" disabled={isConnecting} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl active:scale-95 flex items-center justify-center space-x-2">
                      {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wifi className="w-5 h-5" />}<span>{t.connectRealBtn}</span>
                    </button>
                  </form>
                  <button onClick={handleMockConnect} disabled={isConnecting} className="w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:text-white font-bold py-3.5 rounded-2xl active:scale-95 flex items-center justify-center space-x-2">
                    <FlaskConical className="w-5 h-5" /><span>{t.connectMockBtn}</span>
                  </button>
                </div>
              </div>
            )}

            {showTutorial && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]">
                  <div className="flex items-center justify-center mb-4 space-x-3">
                    <div className="bg-emerald-100 dark:bg-emerald-900/50 w-12 h-12 flex items-center justify-center rounded-full"><Info className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /></div>
                    <h2 className="text-xl font-black dark:text-white flex-1">{t.tutorialTitle}</h2>
                  </div>
                  <div className="overflow-y-auto space-y-4 pr-2 mb-6 scrollbar-hide flex-1 text-left">
                    {[{ title: t.tutF1Title, desc: t.tutF1Desc }, { title: t.tutF2Title, desc: t.tutF2Desc }, { title: t.tutF3Title, desc: t.tutF3Desc }].map((f, idx) => (
                      <div key={idx} className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <h4 className="font-bold text-emerald-600 dark:text-emerald-400 mb-1">{f.title}</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{f.desc}</p>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setShowTutorial(false)} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl active:scale-95 flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 shrink-0">
                    <CheckCircle2 className="w-6 h-6" /><span>{t.gotIt}</span>
                  </button>
                </div>
              </div>
            )}

            {predictionList && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                  <div className="bg-emerald-600 p-4 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center space-x-2"><Sparkles className="w-5 h-5" /><h3 className="font-bold text-lg">{t.topMatches}</h3></div>
                    <button onClick={() => setPredictionList(null)} className="p-1 bg-white/20 hover:bg-white/30 rounded-full transition"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-3 bg-emerald-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 shrink-0">
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium text-center">Zone: {user.elevation} | Season: {currentSeason}</p>
                  </div>
                  <div className="p-4 space-y-3 overflow-y-auto flex-1">
                    {predictionList.map((crop, index) => (
                      <div key={crop.id} className={`flex items-center justify-between p-3 rounded-2xl border-2 ${index === 0 ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
                        <div className="flex items-center space-x-4">
                          <div className="text-4xl bg-white dark:bg-slate-700 w-14 h-14 flex items-center justify-center rounded-xl shadow-sm shrink-0">{crop.img}</div>
                          <div>
                            <h4 className="font-bold text-slate-800 dark:text-white">{lang === 'en' ? crop.nameEN : crop.nameML}</h4>
                            <div className="flex flex-col mt-0.5">
                               <span className={`text-xs font-bold w-fit px-2 py-0.5 mb-1 rounded-full ${index === 0 ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>{t.match}: {crop.matchPercent}%</span>
                               <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight pr-2">{crop.reason}</span>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => selectPredictedCrop(crop)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2 rounded-xl active:scale-95 transition shrink-0 ml-2">{t.selectBtn}</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {resultModal && (
              <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-300 print:relative print:inset-auto print:bg-transparent print:backdrop-blur-none print:items-start">
                <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-t-3xl shadow-2xl p-6 pb-12 max-h-[90vh] overflow-y-auto border-t border-slate-200 dark:border-slate-800 mx-auto print:rounded-none print:shadow-none print:border-none print:max-h-none print:p-0 print:overflow-visible">
                  <div className="flex justify-between items-start mb-6 print:mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="text-5xl bg-slate-100 dark:bg-slate-800 w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner border border-slate-200 dark:border-slate-700 print:bg-transparent print:border-none">{resultModal.crop.img}</div>
                      <div>
                        <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider">Analysis Result</h3>
                        <h2 className="text-2xl font-black dark:text-white print:text-black">{lang === 'en' ? resultModal.crop.nameEN : resultModal.crop.nameML}</h2>
                        {!resultModal.isLive && (
                           <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                             <AlertTriangle className="w-3 h-3 mr-1" /> Base Requirement (No Sensor Data)
                           </span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2 print:hidden">
                      <button onClick={generatePDF} className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-full text-emerald-600 hover:bg-emerald-200"><Download className="w-6 h-6" /></button>
                      <button onClick={() => setResultModal(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-800"><X className="w-6 h-6" /></button>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 mb-6 border border-slate-100 dark:border-slate-700 flex space-x-4 items-end print:border-slate-300">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 mb-1">{t.area}</label>
                      <input type="text" inputMode="numeric" pattern="[0-9]*" value={farmArea} onChange={e => setFarmArea(Math.max(0, e.target.value))} className="w-full text-lg font-bold p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white focus:outline-emerald-500 print:border-slate-300 print:text-black" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 mb-1">{t.unit}</label>
                      <select value={farmUnit} onChange={e => setFarmUnit(e.target.value)} className="w-full text-lg font-bold p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white focus:outline-emerald-500 print:border-slate-300 print:text-black">
                        <option value="Cent">Cent</option><option value="Acre">Acre</option><option value="Hectare">Hectare</option>
                      </select>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 print:text-black">{t.fertilizerNeeded}</h4>
                  <div className="space-y-3 mb-6">
                    {activeFerts.length === 0 ? (
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 p-4 rounded-xl font-medium border border-emerald-200"><span>{t.soilOptimal}</span></div>
                    ) : (
                      activeFerts.map(fert => (
                        <div key={fert.key} className={`flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border-l-4 ${fert.color} shadow-sm border-t border-r border-b border-slate-100 dark:border-slate-700 print:shadow-none print:border-slate-300`}>
                          <span className="font-bold text-slate-700 dark:text-slate-200 print:text-black">{fert.label}</span>
                          <span className="font-black text-lg dark:text-white print:text-black">{fert.val} kg</span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-6 print:hidden">
                    <button onClick={askOrganicAlternatives} disabled={aiLoading} className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 p-2 rounded-xl font-bold flex flex-col items-center justify-center space-y-1 active:scale-95 transition">
                      <Sparkles className="w-5 h-5 mb-1" /><span className="text-[10px] text-center">✨ {t.organicAlt}</span>
                    </button>
                    <button onClick={askFarmGuide} disabled={aiLoading} className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 p-2 rounded-xl font-bold flex flex-col items-center justify-center space-y-1 active:scale-95 transition">
                      <Sparkles className="w-5 h-5 mb-1" /><span className="text-[10px] text-center">✨ {t.aiGuide}</span>
                    </button>
                    <button onClick={askCropRotation} disabled={aiLoading} className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 p-2 rounded-xl font-bold flex flex-col items-center justify-center space-y-1 active:scale-95 transition">
                      <Sparkles className="w-5 h-5 mb-1" /><span className="text-[10px] text-center">✨ {t.cropRotation}</span>
                    </button>
                  </div>

                  {aiLoading && <div className="flex justify-center p-6 print:hidden"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>}
                  {aiResponse && !aiLoading && <AIResponseCard text={aiResponse} />}
                </div>
              </div>
            )}

            {/* Header */}
            <header className="shrink-0 z-40 bg-emerald-600 dark:bg-emerald-800 text-white shadow-md rounded-b-2xl px-4 py-3 pb-4 print:hidden">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center space-x-2">
                  <div className="bg-white/20 p-2 rounded-xl"><Sprout className="w-6 h-6 text-white" /></div>
                  <h1 className={`text-xl font-bold tracking-wider ${lang === 'ml' ? 'font-serif' : 'font-sans'}`}>{t.appName}</h1>
                </div>
                <div className="flex space-x-2">
                  <button onClick={handleLogout} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition text-white"><LogOut className="w-5 h-5" /></button>
                  <button onClick={() => setLang(lang === 'en' ? 'ml' : 'en')} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition"><Languages className="w-5 h-5" /></button>
                  <button onClick={() => setDarkMode(!darkMode)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">{darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2 text-emerald-100">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">{t.welcomeBack}, <span className="font-bold text-white">{user.name}</span></span>
                </div>
                <div className="flex items-center space-x-1 text-xs text-emerald-200">
                  <MapPin className="w-3 h-3" />
                  <span>{user.district} ({user.elevation})</span>
                </div>
                <div className="bg-black/10 rounded-xl p-3 flex justify-between items-center border border-white/10 mt-1">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]' : 'bg-slate-400'}`} />
                    <span className="text-sm font-medium">
                      {connected ? (connectionType === 'mock' ? 'Simulation Mode Active' : t.connected) : isConnecting ? t.connecting : t.disconnected}
                    </span>
                  </div>
                  {!connected && (
                    <button onClick={() => setShowConnectModal(true)} disabled={isConnecting} className="flex items-center space-x-1 bg-white text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm active:scale-95 disabled:opacity-70">
                      {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}<span>Connect</span>
                    </button>
                  )}
                </div>
              </div>
            </header>

            {!isOnline && (
              <div className="bg-amber-100 text-amber-800 border-b border-amber-200 text-xs font-bold text-center py-1.5 flex items-center justify-center space-x-1 shrink-0 print:hidden">
                <Activity className="w-4 h-4" /><span>Offline Mode Active (Local Expert System)</span>
              </div>
            )}

            {/* Main Tabs */}
            <main className="flex-1 overflow-y-auto p-4 pb-24 max-w-2xl mx-auto w-full relative print:hidden">
              {activeTab === 'dashboard' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  {!connected ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 mt-4">
                      <div className="bg-slate-100 dark:bg-slate-700 w-20 h-20 rounded-full flex items-center justify-center mb-4"><Wifi className="w-10 h-10 text-slate-400" /></div>
                      <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">{t.connectFirst}</h3>
                      <p className="text-sm text-slate-500 mb-6">{t.connectDesc}</p>
                      <button onClick={() => setShowConnectModal(true)} disabled={isConnecting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition active:scale-95 flex items-center justify-center space-x-2">
                        {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}<span>{isConnecting ? t.connecting : 'Connect Now'}</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <Gauge icon={Droplets} label="Moisture" value={sensors.moisture} max={100} unit="%" optimal={[40, 80]} color="text-blue-500" />
                        <Gauge icon={FlaskConical} label="pH Level" value={sensors.pH} max={14} unit="" optimal={[5.5, 7.5]} color="text-fuchsia-500" />
                        <Gauge icon={TestTube} label="Nitrogen (N)" value={sensors.N} max={250} unit="kg/ha" optimal={[50, 200]} color="text-green-500" />
                        <Gauge icon={TestTube} label="Phosphorus (P)" value={sensors.P} max={150} unit="kg/ha" optimal={[30, 100]} color="text-orange-500" />
                        <Gauge icon={TestTube} label="Potassium (K)" value={sensors.K} max={400} unit="kg/ha" optimal={[50, 300]} color="text-purple-500" />
                        <Gauge icon={ThermometerSun} label="Temperature" value={sensors.temp} max={50} unit="°C" optimal={[20, 35]} color="text-red-500" />
                      </div>
                      
                      <button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full py-4 rounded-2xl text-lg font-bold flex items-center justify-center space-x-2 shadow-lg transition-all active:scale-95 bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-emerald-500/25">
                        {isAnalyzing ? <><Loader2 className="w-6 h-6 animate-spin" /><span>{t.predicting}</span></> : <><Sparkles className="w-6 h-6" /><span>{t.analyzeSoil}</span></>}
                      </button>

                      <div className="mt-4">
                        <button onClick={askSoilReport} disabled={aiLoading} className="w-full bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 p-4 rounded-xl font-bold flex items-center justify-center space-x-2 active:scale-95 transition border border-teal-200 dark:border-teal-800">
                          <Sparkles className="w-6 h-6" /><span className="text-sm">✨ {t.soilReport}</span>
                        </button>
                      </div>
                    </>
                  )}
                  {aiResponse && activeTab === 'dashboard' && !aiLoading && <AIResponseCard text={aiResponse} />}
                </div>
              )}

              {activeTab === 'crops' && (
                <div className="space-y-4 animate-in fade-in duration-500 relative">
                  <div className="sticky top-[-16px] z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col space-y-3">
                    <div className="flex items-center w-full">
                      <Search className="w-5 h-5 text-slate-400 mr-2 shrink-0" />
                      <input type="text" placeholder={t.searchCrops} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="bg-transparent w-full focus:outline-none dark:text-white" />
                      {searchInput && <button onClick={() => setSearchInput('')}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>}
                    </div>
                    <div className="flex overflow-x-auto space-x-2 scrollbar-hide pb-1">
                      {categories.map((catObj) => {
                        const isSelected = activeCategory === catObj.en || activeCategory === catObj.ml || activeCategory === 'All' && catObj.id === 'All';
                        return (
                          <button key={catObj.id} onClick={() => setActiveCategory(catObj.en)} className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isSelected ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                            {lang === 'en' ? catObj.en : catObj.ml}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {filteredCrops.length > 0 ? filteredCrops.map(crop => (
                      <button key={crop.id} onClick={() => calculateFertilizer(crop)} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center space-y-2 hover:border-emerald-500 active:scale-95 transition">
                        <span className="text-4xl">{crop.img}</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 text-sm text-center">{lang === 'en' ? crop.nameEN : crop.nameML}</span>
                      </button>
                    )) : (
                      <div className="col-span-2 text-center p-8 text-slate-500">{lang === 'en' ? 'No crops found' : 'വിളകൾ കണ്ടെത്തിയില്ല'}</div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'doctor' && (
                <div className="flex flex-col h-[calc(100vh-14rem)] animate-in fade-in duration-500">
                  <div className="flex-1 bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 mb-4 overflow-y-auto flex flex-col space-y-4">
                    <div className="bg-emerald-100 dark:bg-emerald-900/40 p-4 rounded-2xl rounded-tl-sm self-start max-w-[85%]">
                      <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                        {lang === 'en' ? "Hello! I am your local Expert System. Describe the symptoms on your crops (e.g., 'Yellow spots on paddy leaves'), and I will suggest organic remedies." : "നമസ്കാരം! ഞാൻ നിങ്ങളുടെ ലോക്കൽ എക്സ്പർട്ട് സിസ്റ്റം ആണ്. വിളകളുടെ ലക്ഷണങ്ങൾ വിവരിക്കുക, ഞാൻ ജൈവ പ്രതിവിധികൾ നിർദ്ദേശിക്കാം."}
                      </p>
                    </div>
                    {aiLoading && (
                      <div className="self-start bg-slate-100 dark:bg-slate-700 p-4 rounded-2xl rounded-tl-sm flex items-center space-x-2">
                        <Loader2 className="w-5 h-5 animate-spin text-emerald-600" /><span className="text-sm text-slate-500">Analyzing symptoms...</span>
                      </div>
                    )}
                    {aiResponse && !aiLoading && <AIResponseCard text={aiResponse} />}
                    <div ref={chatEndRef} />
                  </div>
                  
                  <div className="relative shrink-0">
                    <div className="flex overflow-x-auto pb-2 mb-2 space-x-2 scrollbar-hide pr-8">
                      {pestsDB.map(pest => (
                        <button key={pest.id} onClick={() => setChatQuery(lang === 'en' ? pest.nameEN : pest.nameML)} className="whitespace-nowrap px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-slate-700 rounded-full text-xs font-medium hover:bg-emerald-100 dark:hover:bg-emerald-800 transition">
                          {lang === 'en' ? pest.nameEN : pest.nameML}
                        </button>
                      ))}
                    </div>
                    <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-slate-50 dark:from-slate-900 to-transparent pointer-events-none" />
                  </div>

                  <form onSubmit={handleChatSubmit} className="flex space-x-2 shrink-0">
                    <input type="text" value={chatQuery} onChange={(e) => setChatQuery(e.target.value)} placeholder={t.askDoctor} className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white shadow-sm" />
                    <button type="submit" disabled={aiLoading || !chatQuery.trim()} className="bg-emerald-600 text-white p-3 rounded-2xl shadow-md disabled:opacity-50"><Send className="w-6 h-6" /></button>
                  </form>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-4 animate-in fade-in duration-500">
                  <div className="flex items-center space-x-2 mb-4">
                    <History className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    <h2 className="text-xl font-bold dark:text-white">{t.historyTitle}</h2>
                  </div>

                  {analysisHistory.length === 0 ? (
                    <div className="bg-slate-100 dark:bg-slate-800 p-8 rounded-3xl text-center border border-dashed border-slate-300 dark:border-slate-700">
                      <History className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-500 dark:text-slate-400 font-medium">{t.historyEmpty}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {analysisHistory.map((record) => (
                        <div key={record.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="text-3xl bg-slate-100 dark:bg-slate-700 w-12 h-12 flex items-center justify-center rounded-xl shrink-0">
                              {record.crop.img}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 dark:text-white">
                                {lang === 'en' ? record.crop.nameEN : record.crop.nameML}
                              </h4>
                              <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 space-x-2 mt-0.5 mb-1.5">
                                <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {record.date} {record.time}</span>
                              </div>
                            </div>
                          </div>
                          <button onClick={() => setResultModal({ crop: record.crop, baseReq: record.baseReq, isLive: true })} className="bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 text-emerald-700 text-sm font-bold px-3 py-2 rounded-xl transition shrink-0 ml-2">
                            {t.viewResult}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </main>

            {/* Bottom Nav */}
            <nav className="shrink-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe px-6 py-3 flex justify-between items-center z-40 print:hidden">
              {[
                { id: 'dashboard', icon: LayoutDashboard, label: t.dashboard },
                { id: 'crops', icon: Leaf, label: t.crops },
                { id: 'doctor', icon: Stethoscope, label: t.doctor },
                { id: 'history', icon: History, label: t.history },
              ].map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center p-2 transition-colors duration-200 ${activeTab === tab.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                  <tab.icon className={`w-6 h-6 mb-1 ${activeTab === tab.id ? 'fill-emerald-100 dark:fill-emerald-900/50' : ''}`} />
                  <span className="text-[10px] font-bold">{tab.label}</span>
                </button>
              ))}
            </nav>
          </>
        )}
      </div>
    </div>
  );
}